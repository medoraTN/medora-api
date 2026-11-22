import type { UserRole } from "../../domain/entities/user.entity";

export interface AccessTokenClaims {
  userId: string;
  role: UserRole;
}

export interface TokenService {
  issue(claims: AccessTokenClaims): string;
  /** Resolves the claims of a valid token, or `null` when it is invalid or expired. */
  verify(token: string): AccessTokenClaims | null;
}
