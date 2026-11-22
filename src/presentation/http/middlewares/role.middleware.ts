import type { RequestHandler } from "express";
import type { UserRole } from "../../../domain/entities/user.entity";
import { ForbiddenError, UnauthenticatedError } from "../../../domain/errors/auth-errors";

/**
 * Allows only the listed roles (403 otherwise). Must run after `authenticate`;
 * without an authenticated user it answers 401 rather than leaking a role check.
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  if (allowedRoles.length === 0) {
    throw new Error("requireRole needs at least one allowed role");
  }

  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthenticatedError());
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
