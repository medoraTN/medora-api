import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { USER_ROLES, type User, type UserRole } from "../../src/domain/entities/user.entity";
import { JwtTokenService } from "../../src/infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/password.service";
import { InMemoryPatientRepository } from "../support/in-memory-patient.repository";
import { InMemoryReservationRepository } from "../support/in-memory-reservation.repository";
import { InMemoryUserRepository } from "../support/in-memory-user.repository";

const users = new InMemoryUserRepository();
const patients = new InMemoryPatientRepository();
const reservations = new InMemoryReservationRepository();
const tokens = new JwtTokenService({ secret: "patients-e2e-secret-that-is-at-least-32-characters" });
const accounts = {} as Record<UserRole, User>;
let app: Express;

function patientInput(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  return {
    recordNumber: `E2E-${id}`,
    firstName: "Alex",
    lastName: "Patient",
    dateOfBirth: "1990-05-17",
    sex: "UNKNOWN",
    phone: `+1555${id.replace(/\D/g, "").slice(0, 10)}`,
    arrivalReason: "Fever",
    urgencyLevel: 2,
    ...overrides,
  };
}

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

async function createPatient(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/patients")
    .set("Authorization", authorization("ADMIN"))
    .send(patientInput(overrides));
}

async function changePatientStatus(id: string, status: unknown, role: UserRole = "MEDICAL") {
  return request(app)
    .patch(`/api/patients/${id}/status`)
    .set("Authorization", authorization(role))
    .send({ status });
}

beforeEach(async () => {
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}-${randomUUID()}@patients.test`,
      passwordHash: "e2e-test-hash",
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  app = createApp({
    users,
    patients,
    reservations,
    passwordHasher: new ScryptPasswordHasher(),
    tokens,
  });
});

describe("patient endpoints", () => {
  it.each(["ADMIN", "ADMIN_STAFF"] as const)("allows %s to create a patient with defaults", async (role) => {
    const response = await request(app)
      .post("/api/patients")
      .set("Authorization", authorization(role))
      .send(patientInput());

    expect(response.status).toBe(201);
    expect(response.body.patient).toMatchObject({ status: "WAITING", sex: "UNKNOWN", address: null });
    expect(response.body.patient.id).toEqual(expect.any(String));
  });

  it.each(["MEDICAL", "SUPERVISOR"] as const)("denies %s from creating a patient", async (role) => {
    const response = await request(app)
      .post("/api/patients")
      .set("Authorization", authorization(role))
      .send(patientInput());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("requires a valid bearer token", async () => {
    const response = await request(app).get("/api/patients");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it.each(USER_ROLES)("allows %s to read the patient list", async (role) => {
    const response = await request(app)
      .get("/api/patients")
      .set("Authorization", authorization(role));
    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 20, total: expect.any(Number) });
  });

  it("validates mandatory fields and returns field details", async () => {
    const response = await request(app)
      .post("/api/patients")
      .set("Authorization", authorization("ADMIN"))
      .send({ firstName: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "recordNumber" }),
      expect.objectContaining({ field: "lastName" }),
      expect.objectContaining({ field: "phone" }),
      expect.objectContaining({ field: "arrivalReason" }),
      expect.objectContaining({ field: "urgencyLevel" }),
    ]));
  });

  it("rejects duplicate dossier numbers and phone numbers with 409", async () => {
    const first = patientInput();
    await createPatient({ ...first, phone: first.phone });

    const duplicateRecord = await createPatient({ recordNumber: first.recordNumber });
    const duplicatePhone = await createPatient({ phone: first.phone });

    expect(duplicateRecord.status).toBe(409);
    expect(duplicatePhone.status).toBe(409);
    expect(duplicateRecord.body.error.code).toBe("CONFLICT");
  });

  it("returns a filtered and paginated list searchable by name, dossier, and phone", async () => {
    const sharedLastName = `Batch-${randomUUID()}`;
    const inputs = [patientInput({ lastName: sharedLastName }), patientInput({ lastName: sharedLastName }), patientInput({ lastName: sharedLastName })];
    for (const input of inputs) await createPatient(input);

    const page = await request(app)
      .get("/api/patients")
      .query({ page: 2, pageSize: 2, search: sharedLastName })
      .set("Authorization", authorization("SUPERVISOR"));
    expect(page.status).toBe(200);
    expect(page.body.items).toHaveLength(1);
    expect(page.body).toMatchObject({ pagination: { page: 2, pageSize: 2, total: 3, totalPages: 2 } });

    const sample = inputs[0]!;
    for (const term of [sample.firstName, sample.recordNumber, sample.phone]) {
      const response = await request(app)
        .get("/api/patients")
        .query({ search: term })
        .set("Authorization", authorization("MEDICAL"));
      expect(response.status).toBe(200);
      expect(response.body.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ recordNumber: sample.recordNumber })]),
      );
    }
  });

  it.each(USER_ROLES)("allows %s to read patient details", async (role) => {
    const created = await createPatient();
    const response = await request(app)
      .get(`/api/patients/${created.body.patient.id}`)
      .set("Authorization", authorization(role));
    expect(response.status).toBe(200);
    expect(response.body.patient.id).toBe(created.body.patient.id);
  });

  it("returns 404 for an unknown patient id", async () => {
    const response = await request(app)
      .get("/api/patients/missing-patient")
      .set("Authorization", authorization("MEDICAL"));
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({ code: "NOT_FOUND", message: "Patient introuvable." });
  });

  it("validates pagination parameters", async () => {
    const response = await request(app)
      .get("/api/patients?page=0&pageSize=101")
      .set("Authorization", authorization("ADMIN"));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each(["ADMIN", "MEDICAL"] as const)("allows %s to change a patient status", async (role) => {
    const created = await createPatient();
    const patientId = created.body.patient.id as string;

    const response = await changePatientStatus(patientId, "IN_PROGRESS", role);

    expect(response.status).toBe(200);
    expect(response.body.patient.status).toBe("IN_PROGRESS");
    expect(patients.statusHistory(patientId)).toEqual([
      expect.objectContaining({
        previousStatus: "WAITING",
        status: "IN_PROGRESS",
        changedById: accounts[role].id,
        changedAt: expect.any(Date),
      }),
    ]);
  });

  it.each(["ADMIN_STAFF", "SUPERVISOR"] as const)("denies %s from changing patient status", async (role) => {
    const created = await createPatient();
    const response = await changePatientStatus(created.body.patient.id, "IN_PROGRESS", role);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("requires authentication to change patient status", async () => {
    const created = await createPatient();
    const response = await request(app)
      .patch(`/api/patients/${created.body.patient.id}/status`)
      .send({ status: "IN_PROGRESS" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 for a status outside the patient enum", async () => {
    const created = await createPatient();
    const response = await changePatientStatus(created.body.patient.id, "NOT_A_STATUS");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 and leaves history unchanged for a forbidden transition", async () => {
    const created = await createPatient();
    const patientId = created.body.patient.id as string;
    await changePatientStatus(patientId, "CANCELLED");

    const response = await changePatientStatus(patientId, "WAITING");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(patients.statusHistory(patientId)).toHaveLength(1);
    await expect(patients.findById(patientId)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("returns 404 for a status update on an unknown patient", async () => {
    const response = await changePatientStatus("missing-patient", "IN_PROGRESS");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
