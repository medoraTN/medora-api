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
const tokens = new JwtTokenService({ secret: "reservations-e2e-secret-that-is-at-least-32-chars" });
const accounts = {} as Record<UserRole, User>;
let app: Express;
let patientId: string;

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

function reservationInput(overrides: Record<string, unknown> = {}) {
  return {
    patientId,
    service: "Imagerie",
    practitioner: "Dr. Martin",
    examination: "Echo",
    scheduledAt: "2026-11-23T09:00:00.000Z",
    durationMinutes: 30,
    ...overrides,
  };
}

async function createReservation(role: UserRole = "ADMIN", overrides: Record<string, unknown> = {}) {
  return request(app)
    .post("/api/reservations")
    .set("Authorization", authorization(role))
    .send(reservationInput(overrides));
}

beforeEach(async () => {
  reservations.clear();
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}-${randomUUID()}@reservations.test`,
      passwordHash: "e2e-hash",
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  const patient = await patients.create({
    recordNumber: `RES-${randomUUID()}`,
    firstName: "Sam",
    lastName: "Patient",
    dateOfBirth: new Date("1988-04-12"),
    sex: "UNKNOWN",
    phone: `+336${randomUUID().replace(/\D/g, "").slice(0, 8)}`,
    address: null,
    arrivalReason: "Follow-up",
    urgencyLevel: 2,
    status: "WAITING",
    internalNotes: null,
  });
  patientId = patient.id;
  app = createApp({
    users,
    patients,
    reservations,
    passwordHasher: new ScryptPasswordHasher(),
    tokens,
  });
});

describe("POST /api/reservations", () => {
  it.each(["ADMIN", "ADMIN_STAFF", "MEDICAL"] as const)("allows %s to create a reservation", async (role) => {
    const response = await createReservation(role);

    expect(response.status).toBe(201);
    expect(response.body.reservation).toMatchObject({
      patientId,
      service: "Imagerie",
      status: "PENDING",
      durationMinutes: 30,
    });
  });

  it("denies SUPERVISOR from creating a reservation", async () => {
    const response = await createReservation("SUPERVISOR");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("requires authentication", async () => {
    const response = await request(app).post("/api/reservations").send(reservationInput());
    expect(response.status).toBe(401);
  });

  it("validates the payload", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .set("Authorization", authorization("ADMIN"))
      .send({ patientId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the patient does not exist", async () => {
    const response = await createReservation("ADMIN", { patientId: "missing-patient" });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/reservations", () => {
  it.each(USER_ROLES)("allows %s to list reservations", async (role) => {
    await createReservation();
    const response = await request(app).get("/api/reservations").set("Authorization", authorization(role));
    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("filters by day window and status", async () => {
    await createReservation("ADMIN", { scheduledAt: "2026-11-23T09:00:00.000Z", status: "PENDING" });
    await createReservation("ADMIN", { scheduledAt: "2026-11-24T09:00:00.000Z", status: "CONFIRMED" });

    const day = await request(app)
      .get("/api/reservations")
      .query({ from: "2026-11-23T00:00:00.000Z", to: "2026-11-23T23:59:59.000Z" })
      .set("Authorization", authorization("SUPERVISOR"));

    expect(day.status).toBe(200);
    expect(day.body.items).toHaveLength(1);
    expect(day.body.items[0].scheduledAt).toBe("2026-11-23T09:00:00.000Z");

    const confirmed = await request(app)
      .get("/api/reservations")
      .query({ status: "CONFIRMED" })
      .set("Authorization", authorization("ADMIN"));
    expect(confirmed.body.items).toHaveLength(1);
    expect(confirmed.body.items[0].status).toBe("CONFIRMED");
  });
});

describe("GET /api/reservations/:id", () => {
  it("returns a reservation and 404 for unknown ids", async () => {
    const created = await createReservation();
    const found = await request(app)
      .get(`/api/reservations/${created.body.reservation.id}`)
      .set("Authorization", authorization("MEDICAL"));
    expect(found.status).toBe(200);
    expect(found.body.reservation.id).toBe(created.body.reservation.id);

    const missing = await request(app)
      .get("/api/reservations/unknown")
      .set("Authorization", authorization("MEDICAL"));
    expect(missing.status).toBe(404);
  });
});

describe("PATCH /api/reservations/:id", () => {
  it("updates schedule and confirms a reservation", async () => {
    const created = await createReservation();
    const response = await request(app)
      .patch(`/api/reservations/${created.body.reservation.id}`)
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ scheduledAt: "2026-11-23T11:30:00.000Z", status: "CONFIRMED", durationMinutes: 45 });

    expect(response.status).toBe(200);
    expect(response.body.reservation).toMatchObject({
      status: "CONFIRMED",
      durationMinutes: 45,
      scheduledAt: "2026-11-23T11:30:00.000Z",
    });
  });

  it("rejects updates on cancelled reservations", async () => {
    const created = await createReservation();
    await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/cancel`)
      .set("Authorization", authorization("ADMIN"));

    const response = await request(app)
      .patch(`/api/reservations/${created.body.reservation.id}`)
      .set("Authorization", authorization("ADMIN"))
      .send({ service: "Autre" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_RESERVATION_STATUS_TRANSITION");
  });
});

describe("POST /api/reservations/:id/cancel", () => {
  it("cancels an active reservation and forbids SUPERVISOR", async () => {
    const created = await createReservation();

    const denied = await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/cancel`)
      .set("Authorization", authorization("SUPERVISOR"));
    expect(denied.status).toBe(403);

    const cancelled = await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/cancel`)
      .set("Authorization", authorization("MEDICAL"));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.reservation.status).toBe("CANCELLED");
  });
});
