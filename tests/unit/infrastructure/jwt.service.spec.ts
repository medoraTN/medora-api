import jwt from "jsonwebtoken";
import { JwtTokenService } from "../../../src/infrastructure/auth/jwt.service";

const SECRET = "unit-test-secret-that-is-at-least-32-characters";
const OTHER_SECRET = "another-unit-test-secret-of-32-plus-characters";

describe("JwtTokenService", () => {
  const service = new JwtTokenService({ secret: SECRET });

  it("round-trips the user id and role", () => {
    const token = service.issue({ userId: "user-1", role: "SUPERVISOR" });

    expect(service.verify(token)).toEqual({ userId: "user-1", role: "SUPERVISOR" });
  });

  it("issues an HS256 token with subject, role, issuer and a one-hour default expiry", () => {
    const token = service.issue({ userId: "user-1", role: "MEDICAL" });
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded?.header.alg).toBe("HS256");
    expect(decoded?.payload).toMatchObject({ sub: "user-1", role: "MEDICAL", iss: "medora-api" });
    const { iat, exp } = decoded?.payload as { iat: number; exp: number };
    expect(exp - iat).toBe(3600);
  });

  it("honours a configured lifetime", () => {
    const short = new JwtTokenService({ secret: SECRET, expiresIn: "15m" });
    const { iat, exp } = jwt.decode(short.issue({ userId: "u", role: "ADMIN" })) as { iat: number; exp: number };

    expect(exp - iat).toBe(900);
  });

  it("rejects an expired token", () => {
    const expired = new JwtTokenService({ secret: SECRET, expiresIn: -10 });

    expect(service.verify(expired.issue({ userId: "user-1", role: "ADMIN" }))).toBeNull();
  });

  it("rejects a token whose payload was tampered with", () => {
    const [header, , signature] = service.issue({ userId: "user-1", role: "MEDICAL" }).split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "user-1", role: "ADMIN", iss: "medora-api", exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");

    expect(service.verify(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const foreign = jwt.sign({ role: "ADMIN" }, OTHER_SECRET, { subject: "user-1", issuer: "medora-api" });

    expect(service.verify(foreign)).toBeNull();
  });

  it("rejects an unsigned token (alg: none)", () => {
    const unsigned = jwt.sign({ role: "ADMIN" }, null, { algorithm: "none", subject: "user-1", issuer: "medora-api" });

    expect(service.verify(unsigned)).toBeNull();
  });

  it("rejects a token signed with another HMAC algorithm", () => {
    const hs512 = jwt.sign({ role: "ADMIN" }, SECRET, { algorithm: "HS512", subject: "user-1", issuer: "medora-api" });

    expect(service.verify(hs512)).toBeNull();
  });

  it("rejects a token from another issuer", () => {
    const foreign = jwt.sign({ role: "ADMIN" }, SECRET, { subject: "user-1", issuer: "someone-else" });

    expect(service.verify(foreign)).toBeNull();
  });

  it.each([
    ["an unknown role", { role: "ROOT" }, "user-1"],
    ["a legacy role name", { role: "MEDICAL_STAFF" }, "user-1"],
    ["no role", {}, "user-1"],
  ])("rejects a validly signed token with %s", (_label, claims, subject) => {
    const token = jwt.sign(claims, SECRET, { subject, issuer: "medora-api" });

    expect(service.verify(token)).toBeNull();
  });

  it("rejects a validly signed token without a subject", () => {
    const token = jwt.sign({ role: "ADMIN" }, SECRET, { issuer: "medora-api" });

    expect(service.verify(token)).toBeNull();
  });

  it.each(["", "garbage", "a.b.c", "Bearer abc"])("rejects the malformed token %p without throwing", (token) => {
    expect(service.verify(token)).toBeNull();
  });

  it("refuses to start with a missing or short secret", () => {
    expect(() => new JwtTokenService({ secret: "" })).toThrow(/JWT_SECRET/);
    expect(() => new JwtTokenService({ secret: "too-short" })).toThrow(/JWT_SECRET/);
  });

  it("refuses to start with an invalid lifetime", () => {
    expect(() => new JwtTokenService({ secret: SECRET, expiresIn: "soon" })).toThrow();
  });
});
