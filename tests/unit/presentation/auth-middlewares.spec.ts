import type { NextFunction, Request, Response } from "express";
import type { AccessTokenClaims, TokenService } from "../../../src/application/ports/token-service";
import type { UserRole } from "../../../src/domain/entities/user.entity";
import { ForbiddenError, UnauthenticatedError } from "../../../src/domain/errors/auth-errors";
import { authenticate } from "../../../src/presentation/http/middlewares/auth.middleware";
import { requireRole } from "../../../src/presentation/http/middlewares/role.middleware";

function run(handler: (req: Request, res: Response, next: NextFunction) => void, req: Partial<Request>) {
  const next = jest.fn();
  handler(req as Request, {} as Response, next);
  return { req: req as Request, next };
}

describe("authenticate", () => {
  const claims: AccessTokenClaims = { userId: "user-1", role: "MEDICAL" };
  const tokens: TokenService = {
    issue: () => "unused",
    verify: jest.fn((token: string) => (token === "valid-token" ? claims : null)),
  };
  const middleware = authenticate(tokens);

  it("attaches the user id and role of a valid bearer token", () => {
    const { req, next } = run(middleware, { headers: { authorization: "Bearer valid-token" } });

    expect(req.auth).toEqual({ userId: "user-1", role: "MEDICAL" });
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts the scheme case-insensitively", () => {
    const { req } = run(middleware, { headers: { authorization: "bearer valid-token" } });

    expect(req.auth).toEqual({ userId: "user-1", role: "MEDICAL" });
  });

  it.each([
    ["no Authorization header", undefined],
    ["an empty header", ""],
    ["a non-bearer scheme", "Basic dXNlcjpwYXNz"],
    ["a bearer scheme without token", "Bearer"],
    ["a bearer scheme with a blank token", "Bearer "],
    ["extra segments", "Bearer valid-token extra"],
    ["a token the service rejects", "Bearer forged-token"],
  ])("answers 401 for %s", (_label, authorization) => {
    const headers = authorization === undefined ? {} : { authorization };
    const { req, next } = run(middleware, { headers });

    expect(req.auth).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedError));
  });
});

describe("requireRole", () => {
  const roles: UserRole[] = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"];

  it.each(roles)("lets %s through when that role is allowed", (role) => {
    const { next } = run(requireRole(role), { auth: { userId: "u", role } });

    expect(next).toHaveBeenCalledWith();
  });

  it("answers 403 for an authenticated user whose role is not allowed", () => {
    const { next } = run(requireRole("ADMIN", "MEDICAL"), { auth: { userId: "u", role: "SUPERVISOR" } });

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it("answers 401 (not 403) when nobody is authenticated", () => {
    const { next } = run(requireRole("ADMIN"), {});

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedError));
  });

  it("refuses to be configured without any allowed role", () => {
    expect(() => requireRole()).toThrow(/at least one/);
  });
});
