import { randomUUID } from "node:crypto";
import { prisma } from "../../../src/infrastructure/database/prisma/client";
import { PrismaPatientRepository } from "../../../src/infrastructure/database/repositories/prisma-patient.repository";
import { PrismaReservationRepository } from "../../../src/infrastructure/database/repositories/prisma-reservation.repository";
import { PrismaUserRepository } from "../../../src/infrastructure/database/repositories/prisma-user.repository";

const patients = new PrismaPatientRepository(prisma);
const reservations = new PrismaReservationRepository(prisma);
const users = new PrismaUserRepository(prisma);
const patientIds: string[] = [];
const userIds: string[] = [];
const reservationIds: string[] = [];

function newPatient() {
  const id = randomUUID();
  return {
    recordNumber: `TEST-${id}`,
  firstName: `First-${id.slice(0, 8)}`,
    lastName: "Patient",
    dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
    sex: "UNKNOWN" as const,
    phone: `+1555${id.replaceAll("-", "").slice(0, 10)}`,
    address: null,
    arrivalReason: "Repository integration test",
    urgencyLevel: 3,
    status: "WAITING" as const,
    internalNotes: null,
  };
}

async function createPatient() {
  const patient = await patients.create(newPatient());
  patientIds.push(patient.id);
  return patient;
}

async function createUser() {
  const id = randomUUID();
  const user = await users.create({
    email: `integration-${id}@example.test`,
    passwordHash: "test-hash-only",
    firstName: "Integration",
    lastName: "User",
    role: "ADMIN",
    isActive: true,
  });
  userIds.push(user.id);
  return user;
}

describe("Prisma repositories against PostgreSQL test database", () => {
  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) throw new Error("Set TEST_DATABASE_URL before running integration tests");
    const url = new URL(testUrl);
    if (![
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(url.hostname) || url.port !== "5433" || !url.pathname.endsWith("/medora_test")) {
      throw new Error("Integration tests are restricted to localhost:5433/medora_test");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("persists and retrieves patients through repository queries", async () => {
    const input = newPatient();
    const created = await patients.create(input);
    patientIds.push(created.id);

    await expect(patients.findById(created.id)).resolves.toMatchObject({ id: created.id, phone: input.phone });
    await expect(patients.findByRecordNumber(input.recordNumber)).resolves.toMatchObject({ id: created.id });
    await expect(patients.findByPhone(input.phone)).resolves.toMatchObject({ id: created.id });
    await expect(patients.list({ page: 1, pageSize: 10, search: input.firstName })).resolves.toMatchObject({
      items: [expect.objectContaining({ id: created.id })],
      total: 1,
    });
    await expect(patients.list({ page: 1, pageSize: 10, search: input.recordNumber })).resolves.toMatchObject({ total: 1 });
    await expect(patients.list({ page: 1, pageSize: 10, search: input.phone })).resolves.toMatchObject({ total: 1 });
  });

  it("enforces unique dossier number and phone constraints in PostgreSQL", async () => {
    const original = await createPatient();
    await expect(patients.create({ ...newPatient(), recordNumber: original.recordNumber }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(patients.create({ ...newPatient(), phone: original.phone }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("filters and pages patient results with a stable total", async () => {
    const cohort = `Page-${randomUUID()}`;
    const created = await Promise.all(Array.from({ length: 3 }, () => patients.create({ ...newPatient(), lastName: cohort })));
    patientIds.push(...created.map((patient) => patient.id));

    const firstPage = await patients.list({ page: 1, pageSize: 2, search: cohort });
    const secondPage = await patients.list({ page: 2, pageSize: 2, search: cohort });

    expect(firstPage).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(secondPage).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect(secondPage.items).toHaveLength(1);
    expect([...firstPage.items, ...secondPage.items].map((patient) => patient.id).sort())
      .toEqual(created.map((patient) => patient.id).sort());
  });

  it("persists users and reservations and records status changes transactionally", async () => {
    const user = await createUser();
    const patient = await createPatient();
    const reservation = await reservations.create({
      patientId: patient.id,
      service: "Emergency imaging",
      practitioner: null,
      examination: "X-ray",
      scheduledAt: new Date(Date.now() + 60_000),
      durationMinutes: 30,
      status: "PENDING",
    });
    reservationIds.push(reservation.id);

    await expect(users.findByEmail(user.email)).resolves.toMatchObject({ id: user.id });
    await expect(reservations.findById(reservation.id)).resolves.toMatchObject({ patientId: patient.id });
    await expect(reservations.listByPatient(patient.id)).resolves.toEqual([
      expect.objectContaining({ id: reservation.id }),
    ]);

    const updated = await patients.updateStatus(patient.id, "WAITING", "IN_PROGRESS", user.id);
    expect(updated.status).toBe("IN_PROGRESS");
    await expect(prisma.patientStatusHistory.findFirst({ where: { patientId: patient.id } }))
      .resolves.toMatchObject({
        previousStatus: "WAITING",
        status: "IN_PROGRESS",
        changedById: user.id,
        changedAt: expect.any(Date),
      });

    await expect(patients.updateStatus(patient.id, "WAITING", "CANCELLED", user.id))
      .rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    await expect(prisma.patient.findUnique({ where: { id: patient.id } })).resolves.toMatchObject({ status: "IN_PROGRESS" });
    await expect(prisma.patientStatusHistory.count({ where: { patientId: patient.id } })).resolves.toBe(1);

    const rollbackPatient = await createPatient();
    await expect(patients.updateStatus(rollbackPatient.id, "WAITING", "IN_PROGRESS", "missing-user"))
      .rejects.toMatchObject({ code: "P2003" });
    await expect(prisma.patient.findUnique({ where: { id: rollbackPatient.id } })).resolves.toMatchObject({ status: "WAITING" });
    await expect(prisma.patientStatusHistory.count({ where: { patientId: rollbackPatient.id } })).resolves.toBe(0);
  });
});
