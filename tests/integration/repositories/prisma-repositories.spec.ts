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
    firstName: "Integration",
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
    await expect(patients.list()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));
  });

  it("enforces unique dossier number and phone constraints in PostgreSQL", async () => {
    const original = await createPatient();
    await expect(patients.create({ ...newPatient(), recordNumber: original.recordNumber }))
      .rejects.toMatchObject({ code: "P2002" });
    await expect(patients.create({ ...newPatient(), phone: original.phone }))
      .rejects.toMatchObject({ code: "P2002" });
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

    const updated = await patients.updateStatus(patient.id, "IN_CARE", user.id);
    expect(updated.status).toBe("IN_CARE");
    await expect(prisma.patientStatusHistory.findFirst({ where: { patientId: patient.id } }))
      .resolves.toMatchObject({ status: "IN_CARE", changedById: user.id });
  });
});
