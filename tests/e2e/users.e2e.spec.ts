import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { USER_ROLES, type User, type UserRole } from "../../src/domain/entities/user.entity";
import { JwtTokenService } from "../../src/infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/password.service";
import { InMemoryPatientRepository } from "../support/in-memory-patient.repository";
import { InMemoryUserRepository } from "../support/in-memory-user.repository";

const PASSWORD = "medora-test-password";
let users: InMemoryUserRepository;
let passwordHasher: ScryptPasswordHasher;
let tokens: JwtTokenService;
let accounts: Record<UserRole, User>;
let app: Express;

function authorization(role: UserRole) {
  return `Bearer ${tokens.issue({ userId: accounts[role].id, role })}`;
}

function tokenFor(user: User) {
  return `Bearer ${tokens.issue({ userId: user.id, role: user.role })}`;
}

beforeEach(async () => {
  users = new InMemoryUserRepository();
  passwordHasher = new ScryptPasswordHasher();
  tokens = new JwtTokenService({ secret: "user-management-e2e-secret-32-characters-minimum" });
  accounts = {} as Record<UserRole, User>;
  const passwordHash = await passwordHasher.hash(PASSWORD);
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}-${randomUUID()}@users.test`,
      passwordHash,
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  app = createApp({
    users,
    userManagement: users,
    patients: new InMemoryPatientRepository(),
    passwordHasher,
    tokens,
  });
});

describe("admin user management endpoints", () => {
  it("lists safe user projections with filters and pagination", async () => {
    const response = await request(app).get("/api/users?page=1&pageSize=2&role=ADMIN&isActive=true")
      .set("Authorization", authorization("ADMIN"));
    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(response.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "ADMIN", isActive: true }),
    ]));
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|password_hash|scrypt\$/i);
  });

  it("creates a user, hashes its password, and journals the actor and target", async () => {
    const response = await request(app).post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send({ email: "  New.User@Example.test ", firstName: "New", lastName: "User", role: "MEDICAL", password: PASSWORD });
    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: "new.user@example.test", role: "MEDICAL", isActive: true });
    expect(response.body.user.passwordHash).toBeUndefined();
    const stored = await users.findByEmail("new.user@example.test");
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(await passwordHasher.verify(PASSWORD, stored?.passwordHash)).toBe(true);
    expect(users.auditEntries()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        actorUserId: accounts.ADMIN.id,
        targetUserId: response.body.user.id,
        action: "USER_CREATED",
      }),
    ]));
  });

  it("rejects duplicate email and invalid user input", async () => {
    const user = accounts.MEDICAL;
    const duplicate = await request(app).post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send({ email: user.email.toUpperCase(), firstName: "Duplicate", lastName: "User", role: "MEDICAL", password: PASSWORD });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");

    const invalidRole = await request(app).post("/api/users")
      .set("Authorization", authorization("ADMIN"))
      .send({ email: "new@example.test", firstName: "New", lastName: "User", role: "ROOT", password: PASSWORD });
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates a role, immediately applies it to an old token, and records the change", async () => {
    const target = accounts.MEDICAL;
    const oldToken = tokenFor(target);
    const response = await request(app).patch(`/api/users/${target.id}/role`)
      .set("Authorization", authorization("ADMIN"))
      .send({ role: "ADMIN" });
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("ADMIN");

    const promotedToken = await request(app).get("/api/users").set("Authorization", oldToken);
    expect(promotedToken.status).toBe(200);
    expect(users.auditEntries()).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "USER_ROLE_CHANGED", targetUserId: target.id }),
    ]));
  });

  it("deactivates, rejects existing tokens and login, then reactivates the account", async () => {
    const target = accounts.MEDICAL;
    const oldToken = tokenFor(target);
    const disabled = await request(app).patch(`/api/users/${target.id}/status`)
      .set("Authorization", authorization("ADMIN"))
      .send({ isActive: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.user.isActive).toBe(false);

    await request(app).get("/api/users").set("Authorization", oldToken).expect(401);
    const login = await request(app).post("/api/auth/login").send({ email: target.email, password: PASSWORD });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe("INVALID_CREDENTIALS");

    const enabled = await request(app).patch(`/api/users/${target.id}/status`)
      .set("Authorization", authorization("ADMIN"))
      .send({ isActive: true });
    expect(enabled.status).toBe(200);
    expect(enabled.body.user.isActive).toBe(true);
    expect(users.auditEntries().map((entry) => entry.action)).toEqual(expect.arrayContaining([
      "USER_DEACTIVATED",
      "USER_REACTIVATED",
    ]));
  });

  it("resets passwords through the hasher and journals no password material", async () => {
    const target = accounts.MEDICAL;
    const response = await request(app).post(`/api/users/${target.id}/password-reset`)
      .set("Authorization", authorization("ADMIN"))
      .send({ newPassword: "brand-new-password" });
    expect(response.status).toBe(200);
    expect(response.body.user.passwordHash).toBeUndefined();
    const stored = await users.findById(target.id);
    expect(await passwordHasher.verify("brand-new-password", stored?.passwordHash)).toBe(true);
    expect(JSON.stringify(users.auditEntries())).not.toContain("brand-new-password");
    expect(users.auditEntries()).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "USER_PASSWORD_RESET", targetUserId: target.id }),
    ]));
  });

  it("prevents self-demotion and self-deactivation", async () => {
    const demotion = await request(app).patch(`/api/users/${accounts.ADMIN.id}/role`)
      .set("Authorization", authorization("ADMIN"))
      .send({ role: "MEDICAL" });
    const deactivation = await request(app).patch(`/api/users/${accounts.ADMIN.id}/status`)
      .set("Authorization", authorization("ADMIN"))
      .send({ isActive: false });
    expect(demotion.status).toBe(409);
    expect(demotion.body.error.code).toBe("SELF_MODIFICATION_FORBIDDEN");
    expect(deactivation.status).toBe(409);
    expect(deactivation.body.error.code).toBe("SELF_MODIFICATION_FORBIDDEN");
  });

  it("allows only ADMIN on every user-management endpoint", async () => {
    const target = accounts.MEDICAL;
    for (const role of USER_ROLES) {
      const expected = role === "ADMIN" ? 200 : 403;
      const list = await request(app).get("/api/users").set("Authorization", authorization(role));
      expect(list.status).toBe(expected);

      if (role === "ADMIN") continue;
      const headers = { Authorization: authorization(role) };
      const create = await request(app).post("/api/users").set(headers)
        .send({ email: `deny-${randomUUID()}@users.test`, firstName: "No", lastName: "Access", role: "MEDICAL", password: PASSWORD });
      const roleUpdate = await request(app).patch(`/api/users/${target.id}/role`).set(headers).send({ role: "SUPERVISOR" });
      const statusUpdate = await request(app).patch(`/api/users/${target.id}/status`).set(headers).send({ isActive: false });
      const passwordReset = await request(app).post(`/api/users/${target.id}/password-reset`).set(headers).send({ newPassword: PASSWORD });
      for (const denied of [create, roleUpdate, statusUpdate, passwordReset]) {
        expect(denied.status).toBe(403);
        expect(denied.body.error.code).toBe("FORBIDDEN");
      }
    }
  });
});
