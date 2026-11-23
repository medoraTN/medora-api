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
const tokens = new JwtTokenService({ secret: "reservation-e2e-secret-that-is-at-least-32-characters" });
const accounts = {} as Record<UserRole, User>;
let app: Express;

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

async function createPatient() {
  const id = randomUUID();
  const response = await request(app).post("/api/patients")
    .set("Authorization", authorization("ADMIN"))
    .send({
      recordNumber: `RES-${id}`,
      firstName: "Taylor",
      lastName: "Reservation",
      dateOfBirth: "1990-05-17",
      phone: `+1555${id.replace(/\D/g, "").slice(0, 10)}`,
      arrivalReason: "Test",
      urgencyLevel: 2,
    });
  expect(response.status).toBe(201);
  return response.body.patient as { id: string };
}

async function createReservation(role: UserRole = "ADMIN_STAFF") {
  const patient = await createPatient();
  const response = await request(app).post("/api/reservations")
    .set("Authorization", authorization(role))
    .send({
      patientId: patient.id,
      service: "Imaging",
      examination: "X-ray",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
    });
  return { response, patient };
}

beforeEach(async () => {
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}-${randomUUID()}@reservations.test`,
      passwordHash: "test-hash",
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  app = createApp({ users, patients, reservations, passwordHasher: new ScryptPasswordHasher(), tokens });
});

describe("reservation endpoints", () => {
  it.each(["ADMIN", "ADMIN_STAFF", "MEDICAL"] as const)("allows %s to create a reservation", async (role) => {
    const { response } = await createReservation(role);
    expect(response.status).toBe(201);
    expect(response.body.reservation).toMatchObject({ service: "Imaging", status: "PENDING", durationMinutes: 30 });
  });

  it("rejects an unknown patient and a past schedule", async () => {
    const unknownPatient = await request(app).post("/api/reservations")
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ patientId: "missing", service: "Imaging", scheduledAt: new Date(Date.now() + 60_000).toISOString(), durationMinutes: 30 });
    expect(unknownPatient.status).toBe(404);
    expect(unknownPatient.body.error.code).toBe("NOT_FOUND");

    const patient = await createPatient();
    const past = await request(app).post("/api/reservations")
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ patientId: patient.id, service: "Imaging", scheduledAt: "2020-01-01T00:00:00.000Z", durationMinutes: 30 });
    expect(past.status).toBe(400);
    expect(past.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists reservations filtered by date, status, and patient", async () => {
    const { response: created, patient } = await createReservation();
    const date = (created.body.reservation.scheduledAt as string).slice(0, 10);
    const response = await request(app).get("/api/reservations")
      .query({ date, status: "PENDING", patientId: patient.id })
      .set("Authorization", authorization("SUPERVISOR"));
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([expect.objectContaining({ id: created.body.reservation.id })]);
  });

  it("updates reservation fields and validates status transitions", async () => {
    const { response: created } = await createReservation();
    const id = created.body.reservation.id as string;
    const confirmed = await request(app).patch(`/api/reservations/${id}`)
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ status: "CONFIRMED", practitioner: "Dr Test" });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.reservation).toMatchObject({ status: "CONFIRMED", practitioner: "Dr Test" });

    const invalid = await request(app).patch(`/api/reservations/${id}`)
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ status: "PENDING" });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("INVALID_RESERVATION_TRANSITION");
  });

  it("soft-cancels a reservation and returns 404 for unknown IDs", async () => {
    const { response: created } = await createReservation();
    const id = created.body.reservation.id as string;
    const cancelled = await request(app).delete(`/api/reservations/${id}`)
      .set("Authorization", authorization("ADMIN_STAFF"));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.reservation.status).toBe("CANCELLED");

    const missing = await request(app).delete("/api/reservations/unknown")
      .set("Authorization", authorization("ADMIN_STAFF"));
    expect(missing.status).toBe(404);
  });

  it("allows all roles to read but keeps the supervisor read-only", async () => {
    for (const role of USER_ROLES) {
      const response = await request(app).get("/api/reservations").set("Authorization", authorization(role));
      expect(response.status).toBe(200);
    }
    const { patient } = await createReservation();
    const denied = await request(app).post("/api/reservations")
      .set("Authorization", authorization("SUPERVISOR"))
      .send({ patientId: patient.id, service: "Imaging", scheduledAt: new Date(Date.now() + 60_000).toISOString(), durationMinutes: 20 });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
  });

  it.each(["ADMIN", "ADMIN_STAFF", "MEDICAL"] as const)("allows %s to update and cancel reservations", async (role) => {
    const { response: created } = await createReservation();
    const id = created.body.reservation.id as string;
    const updated = await request(app).patch(`/api/reservations/${id}`)
      .set("Authorization", authorization(role))
      .send({ service: "Updated service" });
    expect(updated.status).toBe(200);
    expect(updated.body.reservation.service).toBe("Updated service");

    const cancelled = await request(app).delete(`/api/reservations/${id}`)
      .set("Authorization", authorization(role));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.reservation.status).toBe("CANCELLED");
  });

  it("denies the supervisor from modifying or cancelling reservations", async () => {
    const { response: created } = await createReservation();
    const id = created.body.reservation.id as string;
    const updated = await request(app).patch(`/api/reservations/${id}`)
      .set("Authorization", authorization("SUPERVISOR"))
      .send({ service: "Not allowed" });
    const cancelled = await request(app).delete(`/api/reservations/${id}`)
      .set("Authorization", authorization("SUPERVISOR"));
    expect(updated.status).toBe(403);
    expect(updated.body.error.code).toBe("FORBIDDEN");
    expect(cancelled.status).toBe(403);
    expect(cancelled.body.error.code).toBe("FORBIDDEN");
  });

  it("requires authentication and validates list filters", async () => {
    const unauthenticated = await request(app).get("/api/reservations");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe("UNAUTHENTICATED");

    const invalid = await request(app).get("/api/reservations?date=not-a-date&status=UNKNOWN")
      .set("Authorization", authorization("ADMIN"));
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });
});
