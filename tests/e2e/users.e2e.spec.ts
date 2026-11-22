import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { USER_ROLES, type User, type UserRole } from "../../src/domain/entities/user.entity";
import { JwtTokenService } from "../../src/infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/password.service";
import { InMemoryPatientRepository } from "../support/in-memory-patient.repository";
import { InMemoryUserRepository } from "../support/in-memory-user.repository";

const users = new InMemoryUserRepository();
const patients = new InMemoryPatientRepository();
const passwordHasher = new ScryptPasswordHasher();
const tokens = new JwtTokenService({ secret: "users-e2e-secret-that-is-at-least-32-characters" });
const accounts = {} as Record<UserRole, User>;
let app: Express;

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

function userInput(overrides: Record<string, unknown> = {}) {
  const id = randomUUID();
  return {
    email: `user-${id}@medora.test`,
    password: "SecretPass1",
    firstName: "New",
    lastName: "User",
    role: "ADMIN_STAFF",
    ...overrides,
  };
}

beforeEach(async () => {
  users.clear();
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}@users.test`,
      passwordHash: await passwordHasher.hash("SecretPass1"),
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  app = createApp({ users, patients, passwordHasher, tokens });
});

describe("POST /api/users", () => {
  it("allows ADMIN to create a user without exposing the password hash", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send(userInput({ role: "MEDICAL" }));

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ role: "MEDICAL", isActive: true });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|scrypt\$/i);
  });

  it.each(["MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const)("denies %s from creating users", async (role) => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", authorization(role))
      .send(userInput());
    expect(response.status).toBe(403);
  });

  it("rejects duplicate emails with 409", async () => {
    const payload = userInput({ email: "dup@medora.test" });
    await request(app).post("/api/users").set("Authorization", authorization("ADMIN")).send(payload);
    const response = await request(app).post("/api/users").set("Authorization", authorization("ADMIN")).send(payload);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("validates password length", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send(userInput({ password: "short" }));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/users", () => {
  it("lists active users for ADMIN and hides inactive by default", async () => {
    const created = await request(app)
      .post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send(userInput());
    await request(app)
      .patch(`/api/users/${created.body.user.id}`)
      .set("Authorization", authorization("ADMIN"))
      .send({ isActive: false });

    const active = await request(app).get("/api/users").set("Authorization", authorization("ADMIN"));
    expect(active.status).toBe(200);
    expect(active.body.items.every((user: { isActive: boolean }) => user.isActive)).toBe(true);

    const all = await request(app)
      .get("/api/users")
      .query({ includeInactive: true })
      .set("Authorization", authorization("ADMIN"));
    expect(all.body.items.some((user: { id: string }) => user.id === created.body.user.id)).toBe(true);
  });

  it("denies non-admin roles", async () => {
    const response = await request(app).get("/api/users").set("Authorization", authorization("MEDICAL"));
    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/users/:id and reset-password", () => {
  it("updates role and deactivates a user", async () => {
    const created = await request(app)
      .post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send(userInput({ role: "MEDICAL" }));

    const updated = await request(app)
      .patch(`/api/users/${created.body.user.id}`)
      .set("Authorization", authorization("ADMIN"))
      .send({ role: "SUPERVISOR", isActive: false });

    expect(updated.status).toBe(200);
    expect(updated.body.user).toMatchObject({ role: "SUPERVISOR", isActive: false });
  });

  it("resets a password so the new credentials can log in", async () => {
    const email = `reset-${randomUUID()}@medora.test`;
    const created = await request(app)
      .post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send(userInput({ email, password: "OldPassword1" }));

    const reset = await request(app)
      .post(`/api/users/${created.body.user.id}/reset-password`)
      .set("Authorization", authorization("ADMIN"))
      .send({ password: "NewPassword1" });
    expect(reset.status).toBe(200);
    expect(reset.headers["cache-control"]).toBe("no-store");

    const oldLogin = await request(app).post("/api/auth/login").send({ email, password: "OldPassword1" });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/auth/login").send({ email, password: "NewPassword1" });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.id).toBe(created.body.user.id);
  });

  it("returns 404 for unknown users", async () => {
    const response = await request(app)
      .get("/api/users/missing")
      .set("Authorization", authorization("ADMIN"));
    expect(response.status).toBe(404);
  });
});
