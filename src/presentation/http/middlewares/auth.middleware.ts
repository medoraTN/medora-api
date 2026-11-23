import type { RequestHandler } from "express";
import type { TokenService } from "../../../application/ports/token-service";
import type { UserRole } from "../../../domain/entities/user.entity";
import { UnauthenticatedError } from "../../../domain/errors/auth-errors";
import type { UserRepository } from "../../../domain/repositories/user.repository";

export interface AuthContext {
  userId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

/** Rejects the request with 401 unless it carries a valid `Authorization: Bearer <jwt>`. */
export function authenticate(tokens: TokenService, users: UserRepository): RequestHandler {
  return async (req, _res, next) => {
    const token = BEARER_PATTERN.exec(req.headers.authorization ?? "")?.[1];
    const claims = token ? tokens.verify(token) : null;
    if (!claims) {
      next(new UnauthenticatedError());
      return;
    }

    const currentUser = await users.findAuthStateById(claims.userId);
    if (!currentUser?.isActive) {
      next(new UnauthenticatedError());
      return;
    }
    req.auth = { userId: currentUser.id, role: currentUser.role };
    next();
  };
}
