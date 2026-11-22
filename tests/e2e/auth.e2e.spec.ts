import express, { type Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app";
import { USER_ROLES, type User, type UserRole } from "../../src/domain/entities/user.entity";
import { JwtTokenService } from "../../src/infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "../../src/infrastructure/auth/password.service";
import { authenticate } from "../../src/presentation/http/middlewares/auth.middleware";
import { errorHandler } from "../../src/presentation/http/middlewares/error-handler.middleware";
import { requireRole } from "../../src/presentation/http/middlewares/role.middleware";
import { InMemoryUserRepository } from "../support/in-memory-user.repository";
import { InMemoryPatientRepository } from "../support/in-memory-patient.repository";

const SECRET = "e2e-test-secret-that-is-at-least-32-characters";
const PASSWORD = "S3cure-passw0rd!";

const users = new InMemoryUserRepository();
const passwordHasher = new ScryptPasswordHasher();
const tokens = new JwtTokenService({ secret: SECRET });

let app: Express;
let probeApp: Express;
const accounts = {} as Record<UserRole, User>;
let inactiveUser: User;

/**
 * Routes standing in for the future feature routes, to prove the role guard
 * end to end: patients/reservations will mount the same middlewares.
 */
function createProbeApp(): Express {
  const probe = express();
  probe.get("/admin-only", authenticate(tokens), requireRole("ADMIN"), (_req, res) => {
    res.json({ ok: true });
  });
  probe.get("/clinical", authenticate(tokens), requireRole("ADMIN", "MEDICAL"), (_req, res) => {
    res.json({ ok: true });
  });
  probe.get("/front-desk", authenticate(tokens), requireRole("ADMIN", "ADMIN_STAFF"), (_req, res) => {
    res.json({ ok: true });
  });
  probe.get("/any-authenticated", authenticate(tokens), (_req, res) => {
    res.json({ ok: true });
  });
  probe.use(errorHandler);
  return probe;
}

async function login(email: string, password: string) {
  return request(app).post("/api/auth/login").send({ email, password });
}

async function tokenFor(role: UserRole): Promise<string> {
  const response = await login(accounts[role].email, PASSWORD);
  expect(response.status).toBe(200);
  return response.body.token as string;
}

beforeAll(async () => {
  const passwordHash = await passwordHasher.hash(PASSWORD);
  for (const role of USER_ROLES) {
    accounts[role] = await users.create({
      email: `${role.toLowerCase()}@medora.test`,
      passwordHash,
      firstName: "Test",
      lastName: role,
      role,
      isActive: true,
    });
  }
  inactiveUser = await users.create({
    email: "inactive@medora.test",
    passwordHash,
    firstName: "Old",
    lastName: "Account",
    role: "ADMIN",
    isActive: false,
  });

app = createApp({ users, patients: new InMemoryPatientRepository(), passwordHasher, tokens });
  probeApp = createProbeApp();
});

describe("POST /api/auth/login", () => {
  it("returns a valid JWT and the user for correct credentials", async () => {
    const response = await login("medical@medora.test", PASSWORD);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      token: expect.any(String),
      user: {
        id: accounts.MEDICAL.id,
        email: "medical@medora.test",
        firstName: "Test",
        lastName: "MEDICAL",
        role: "MEDICAL",
      },
    });

    const claims = jwt.verify(response.body.token, SECRET, { algorithms: ["HS256"], issuer: "medora-api" });
    expect(claims).toMatchObject({ sub: accounts.MEDICAL.id, role: "MEDICAL" });
    expect(tokens.verify(response.body.token)).toEqual({ userId: accounts.MEDICAL.id, role: "MEDICAL" });
  });

  it("never exposes the password or its hash", async () => {
    const response = await login("admin@medora.test", PASSWORD);

    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|password_hash|scrypt\$/i);
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
  });

  it("accepts the email regardless of case and surrounding spaces", async () => {
    const response = await login("  ADMIN@Medora.TEST ", PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(accounts.ADMIN.id);
  });

  it("answers 401 Unauthorized for an incorrect password", async () => {
    const response = await login("admin@medora.test", "not-the-password");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toBe("Bearer");
    expect(response.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants incorrects." } });
    expect(response.body.token).toBeUndefined();
  });

  it("answers exactly the same 401 for an unknown email, so accounts cannot be enumerated", async () => {
    const wrongPassword = await login("admin@medora.test", "not-the-password");
    const unknownEmail = await login("nobody@medora.test", PASSWORD);

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it("answers the same 401 for a deactivated account, even with the right password", async () => {
    const wrongPassword = await login("admin@medora.test", "not-the-password");
    const inactive = await login(inactiveUser.email, PASSWORD);

    expect(inactive.status).toBe(401);
    expect(inactive.body).toEqual(wrongPassword.body);
  });

  it("stores passwords hashed, never in clear text", async () => {
    const stored = await users.findByEmail("admin@medora.test");

    expect(stored?.passwordHash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);
  });

  it("answers 400 with field details when the body is incomplete or invalid", async () => {
    const missing = await request(app).post("/api/auth/login").send({});
    const badEmail = await request(app).post("/api/auth/login").send({ email: "not-an-email", password: PASSWORD });
    const noBody = await request(app).post("/api/auth/login");

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    expect(missing.body.error.details.map((detail: { field: string }) => detail.field).sort()).toEqual([
      "email",
      "password",
    ]);
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error.details).toEqual([{ field: "email", message: "Adresse e-mail invalide." }]);
    expect(noBody.status).toBe(400);
  });

  it("answers 400 for malformed JSON and 413 for an oversized body", async () => {
    const malformed = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ not json");
    const oversized = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@medora.test", password: "x".repeat(20_000) });

    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("BAD_REQUEST");
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("protected routes require a valid JWT", () => {
  it("GET /api/auth/me returns the current user for a valid token", async () => {
    const token = await tokenFor("SUPERVISOR");

    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: accounts.SUPERVISOR.id,
        email: "supervisor@medora.test",
        firstName: "Test",
        lastName: "SUPERVISOR",
        role: "SUPERVISOR",
      },
    });
  });

  it("answers 401 without a token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toBe("Bearer");
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it.each([
    ["a malformed header", "Token abc"],
    ["garbage instead of a JWT", "Bearer not.a.jwt"],
  ])("answers 401 for %s", async (_label, header) => {
    const response = await request(app).get("/api/auth/me").set("Authorization", header);

    expect(response.status).toBe(401);
  });

  it("answers 401 for a tampered token", async () => {
    const token = await tokenFor("MEDICAL");
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: accounts.MEDICAL.id, role: "ADMIN", iss: "medora-api", exp: 4_102_444_800 }),
    ).toString("base64url");

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${header}.${forgedPayload}.${signature}`);

    expect(response.status).toBe(401);
  });

  it("answers 401 for an expired token", async () => {
    const expired = new JwtTokenService({ secret: SECRET, expiresIn: -60 }).issue({
      userId: accounts.ADMIN.id,
      role: "ADMIN",
    });

    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);

    expect(response.status).toBe(401);
  });

  it("answers 401 for a token signed with another secret", async () => {
    const foreign = jwt.sign({ role: "ADMIN" }, "someone-elses-secret-of-at-least-32-chars", {
      subject: accounts.ADMIN.id,
      issuer: "medora-api",
    });

    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${foreign}`);

    expect(response.status).toBe(401);
  });

  it("stops honouring a token once its account has been deactivated", async () => {
    const leaver = await users.create({
      email: "leaver@medora.test",
      passwordHash: await passwordHasher.hash(PASSWORD),
      firstName: "Soon",
      lastName: "Gone",
      role: "MEDICAL",
      isActive: true,
    });
    const token = (await login(leaver.email, PASSWORD)).body.token as string;
    await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);

    users.deactivate(leaver.id);

    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it("answers a JSON 404 for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

describe("role-based access", () => {
  const matrix: { route: string; allowed: UserRole[] }[] = [
    { route: "/admin-only", allowed: ["ADMIN"] },
    { route: "/clinical", allowed: ["ADMIN", "MEDICAL"] },
    { route: "/front-desk", allowed: ["ADMIN", "ADMIN_STAFF"] },
    { route: "/any-authenticated", allowed: ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] },
  ];

  const cases = matrix.flatMap(({ route, allowed }) =>
    USER_ROLES.map((role) => ({ route, role, expected: allowed.includes(role) ? 200 : 403 })),
  );

  it.each(cases)("$role on $route -> $expected", async ({ route, role, expected }) => {
    const token = await tokenFor(role);

    const response = await request(probeApp).get(route).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(expected);
    if (expected === 403) {
      expect(response.body.error.code).toBe("FORBIDDEN");
    }
  });

  it.each(matrix.map(({ route }) => route))("answers 401 (not 403) on %s without a token", async (route) => {
    const response = await request(probeApp).get(route);

    expect(response.status).toBe(401);
  });

  it("does not trust a role claim that is not a known role", async () => {
    const legacy = jwt.sign({ role: "MEDICAL_STAFF" }, SECRET, { subject: accounts.MEDICAL.id, issuer: "medora-api" });

    const response = await request(probeApp).get("/clinical").set("Authorization", `Bearer ${legacy}`);

    expect(response.status).toBe(401);
  });
});
