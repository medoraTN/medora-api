import { randomUUID } from "node:crypto";
import { prisma } from "../../../src/infrastructure/database/prisma/client";
import { PrismaBedRepository } from "../../../src/infrastructure/database/repositories/prisma-bed.repository";
import { PrismaPatientRepository } from "../../../src/infrastructure/database/repositories/prisma-patient.repository";
import { PrismaReservationRepository } from "../../../src/infrastructure/database/repositories/prisma-reservation.repository";
import { PrismaUnitRepository } from "../../../src/infrastructure/database/repositories/prisma-unit.repository";
import { PrismaUserRepository } from "../../../src/infrastructure/database/repositories/prisma-user.repository";

const patients = new PrismaPatientRepository(prisma);
const reservations = new PrismaReservationRepository(prisma);
const users = new PrismaUserRepository(prisma);
const units = new PrismaUnitRepository(prisma);
const beds = new PrismaBedRepository(prisma);
const patientIds: string[] = [];
const userIds: string[] = [];
const reservationIds: string[] = [];
const unitIds: string[] = [];
const bedIds: string[] = [];

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
    await prisma.bedAssignmentHistory.deleteMany({
      where: { OR: [{ bedId: { in: bedIds } }, { fromBedId: { in: bedIds } }, { toBedId: { in: bedIds } }] },
    });
    await prisma.bed.deleteMany({ where: { id: { in: bedIds } } });
    await prisma.unit.deleteMany({ where: { id: { in: unitIds } } });
    await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    await prisma.userAuditLog.deleteMany({
      where: { OR: [{ actorUserId: { in: userIds } }, { targetUserId: { in: userIds } }] },
    });
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
    await expect(reservations.create({
      patientId: "missing-patient",
      service: "Emergency imaging",
      practitioner: null,
      examination: null,
      scheduledAt: new Date(Date.now() + 60_000),
      durationMinutes: 30,
      status: "PENDING",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
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
    await expect(reservations.list({
      date: reservation.scheduledAt.toISOString().slice(0, 10),
      status: "PENDING",
      patientId: patient.id,
    })).resolves.toEqual([expect.objectContaining({ id: reservation.id })]);

    await expect(reservations.update(reservation.id, { service: "Updated imaging", status: "CONFIRMED" }))
      .resolves.toMatchObject({ service: "Updated imaging", status: "CONFIRMED" });
    await expect(reservations.updateStatus(reservation.id, "COMPLETED"))
      .resolves.toMatchObject({ status: "COMPLETED" });
    await expect(reservations.update("missing-reservation", { service: "No record" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

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

  it("persists safe user management changes with audit rows transactionally", async () => {
    const actor = await createUser();
    const target = await users.createManagedUser({
      email: `managed-${randomUUID()}@example.test`,
      passwordHash: "hashed-test-password",
      firstName: "Managed",
      lastName: "User",
      role: "MEDICAL",
      isActive: true,
    }, actor.id);
    userIds.push(target.id);
    expect("passwordHash" in target).toBe(false);

    await expect(users.listUsers({ page: 1, pageSize: 10, search: target.email }))
      .resolves.toMatchObject({ items: [expect.objectContaining({ id: target.id })], total: 1 });
    await users.updateRole(target.id, "ADMIN", actor.id);
    await users.setActive(target.id, false, actor.id);
    await users.setActive(target.id, true, actor.id);
    await users.resetPassword(target.id, "new-hash", actor.id);

    const events = await prisma.userAuditLog.findMany({ where: { targetUserId: target.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((event) => event.action)).toEqual([
      "USER_CREATED",
      "USER_ROLE_CHANGED",
      "USER_DEACTIVATED",
      "USER_REACTIVATED",
      "USER_PASSWORD_RESET",
    ]);
    expect(events.every((event) => event.actorUserId === actor.id)).toBe(true);
    expect(JSON.stringify(events)).not.toContain("new-hash");
  });

  it("persists units, beds, assignments, transfers and history", async () => {
    const actor = await createUser();
    const patient = await createPatient();
    const unit = await units.create({ name: `Urgence-${randomUUID().slice(0, 8)}`, kind: "EMERGENCY" });
    unitIds.push(unit.id);

    const bedA = await beds.create({
      unitId: unit.id,
      code: "A-01",
      type: "STANDARD",
      status: "FREE",
      currentPatientId: null,
    });
    const bedB = await beds.create({
      unitId: unit.id,
      code: "A-02",
      type: "MONITORING",
      status: "FREE",
      currentPatientId: null,
    });
    bedIds.push(bedA.id, bedB.id);

    await expect(beds.create({
      unitId: unit.id,
      code: "A-01",
      type: "STANDARD",
      status: "FREE",
      currentPatientId: null,
    })).rejects.toMatchObject({ code: "CONFLICT" });

    const occupied = await beds.assignPatient(bedA.id, patient.id, actor.id);
    expect(occupied).toMatchObject({ status: "OCCUPIED", currentPatientId: patient.id });
    await expect(beds.assignPatient(bedA.id, patient.id, actor.id)).rejects.toMatchObject({
      code: "BED_NOT_AVAILABLE",
    });

    const transferred = await beds.transferPatient(bedA.id, bedB.id, actor.id);
    expect(transferred.from).toMatchObject({ id: bedA.id, status: "FREE", currentPatientId: null });
    expect(transferred.to).toMatchObject({ id: bedB.id, status: "OCCUPIED", currentPatientId: patient.id });

    const released = await beds.releasePatient(bedB.id, actor.id);
    expect(released).toMatchObject({ status: "FREE", currentPatientId: null });

    await expect(beds.list({ unitId: unit.id, status: "FREE" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: bedA.id }),
        expect.objectContaining({ id: bedB.id }),
      ]),
    );
    await expect(beds.list({ unitKind: "EMERGENCY" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bedA.id })]),
    );

    const history = await beds.listHistory(bedB.id);
    expect(history.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["TRANSFERRED", "RELEASED"]),
    );
  });
});
