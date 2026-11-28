import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { USER_ROLES, type User, type UserRole } from "../../src/domain/entities/user.entity";
import { JwtTokenService } from "../../src/infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/password.service";
import { InMemoryBedRepository } from "../support/in-memory-bed.repository";
import { InMemoryPatientRepository } from "../support/in-memory-patient.repository";
import { InMemoryUnitRepository } from "../support/in-memory-unit.repository";
import { InMemoryUserRepository } from "../support/in-memory-user.repository";

const tokens = new JwtTokenService({ secret: "beds-e2e-secret-that-is-at-least-32-characters-long" });
const accounts = {} as Record<UserRole, User>;
let users: InMemoryUserRepository;
let patients: InMemoryPatientRepository;
let units: InMemoryUnitRepository;
let beds: InMemoryBedRepository;
let app: Express;

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

async function createPatient() {
  const id = randomUUID();
  const response = await request(app)
    .post("/api/patients")
    .set("Authorization", authorization("ADMIN"))
    .send({
      recordNumber: `BED-${id}`,
      firstName: "Casey",
      lastName: "Bed",
      dateOfBirth: "1990-05-17",
      phone: `+1555${id.replace(/\D/g, "").slice(0, 10)}`,
      arrivalReason: "Test",
      urgencyLevel: 2,
    });
  expect(response.status).toBe(201);
  return response.body.patient as { id: string };
}

beforeEach(async () => {
  users = new InMemoryUserRepository();
  patients = new InMemoryPatientRepository();
  units = new InMemoryUnitRepository();
  beds = new InMemoryBedRepository(units.records);
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}-${randomUUID()}@beds.test`,
      passwordHash: "test-hash",
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  app = createApp({
    users,
    patients,
    units,
    beds,
    passwordHasher: new ScryptPasswordHasher(),
    tokens,
  });
});

describe("beds and units endpoints", () => {
  it("creates Urgence/Bloc/ICU units and attached beds", async () => {
    const emergency = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("ADMIN"))
      .send({ name: "Urgence Centrale", kind: "EMERGENCY" });
    expect(emergency.status).toBe(201);
    expect(emergency.body.unit.kind).toBe("EMERGENCY");

    const orUnit = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ name: "Bloc A", kind: "OR" });
    expect(orUnit.status).toBe(201);

    const icu = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("ADMIN"))
      .send({ name: "ICU Nord", kind: "ICU" });
    expect(icu.status).toBe(201);

    const bed = await request(app)
      .post("/api/beds")
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ unitId: emergency.body.unit.id, code: "U-01", type: "STANDARD" });
    expect(bed.status).toBe(201);
    expect(bed.body.bed).toMatchObject({
      unitId: emergency.body.unit.id,
      code: "U-01",
      status: "FREE",
      type: "STANDARD",
    });
  });

  it("assigns, filters, transfers, releases and records history", async () => {
    const unit = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("ADMIN"))
      .send({ name: "Urgence Filtre", kind: "EMERGENCY" });
    const bedA = await request(app)
      .post("/api/beds")
      .set("Authorization", authorization("ADMIN"))
      .send({ unitId: unit.body.unit.id, code: "A-01", type: "STANDARD" });
    const bedB = await request(app)
      .post("/api/beds")
      .set("Authorization", authorization("ADMIN"))
      .send({ unitId: unit.body.unit.id, code: "A-02", type: "MONITORING" });
    const patient = await createPatient();

    const assigned = await request(app)
      .post(`/api/beds/${bedA.body.bed.id}/assign`)
      .set("Authorization", authorization("MEDICAL"))
      .send({ patientId: patient.id });
    expect(assigned.status).toBe(200);
    expect(assigned.body.bed.status).toBe("OCCUPIED");

    const occupiedAgain = await request(app)
      .post(`/api/beds/${bedA.body.bed.id}/assign`)
      .set("Authorization", authorization("MEDICAL"))
      .send({ patientId: patient.id });
    expect(occupiedAgain.status).toBe(409);
    expect(occupiedAgain.body.error.code).toBe("BED_NOT_AVAILABLE");

    const filtered = await request(app)
      .get("/api/beds?status=OCCUPIED")
      .set("Authorization", authorization("SUPERVISOR"));
    expect(filtered.status).toBe(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].id).toBe(bedA.body.bed.id);

    const transferred = await request(app)
      .post(`/api/beds/${bedA.body.bed.id}/transfer`)
      .set("Authorization", authorization("ADMIN_STAFF"))
      .send({ toBedId: bedB.body.bed.id });
    expect(transferred.status).toBe(200);
    expect(transferred.body.from.status).toBe("FREE");
    expect(transferred.body.to.status).toBe("OCCUPIED");

    const released = await request(app)
      .post(`/api/beds/${bedB.body.bed.id}/release`)
      .set("Authorization", authorization("MEDICAL"))
      .send();
    expect(released.status).toBe(200);
    expect(released.body.bed.status).toBe("FREE");

    const history = await request(app)
      .get(`/api/beds/${bedB.body.bed.id}/history`)
      .set("Authorization", authorization("ADMIN"));
    expect(history.status).toBe(200);
    expect(history.body.items.map((item: { event: string }) => item.event)).toEqual(
      expect.arrayContaining(["TRANSFERRED", "RELEASED"]),
    );
  });

  it("denies SUPERVISOR write access and MEDICAL unit creation", async () => {
    const deniedUnit = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("MEDICAL"))
      .send({ name: "Denied", kind: "EMERGENCY" });
    expect(deniedUnit.status).toBe(403);

    const unit = await request(app)
      .post("/api/units")
      .set("Authorization", authorization("ADMIN"))
      .send({ name: "Allowed", kind: "EMERGENCY" });
    const bed = await request(app)
      .post("/api/beds")
      .set("Authorization", authorization("ADMIN"))
      .send({ unitId: unit.body.unit.id, code: "X-01", type: "STANDARD" });

    const deniedAssign = await request(app)
      .post(`/api/beds/${bed.body.bed.id}/assign`)
      .set("Authorization", authorization("SUPERVISOR"))
      .send({ patientId: "irrelevant" });
    expect(deniedAssign.status).toBe(403);
  });
});
