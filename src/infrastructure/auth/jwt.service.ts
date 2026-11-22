import jwt, { type SignOptions } from "jsonwebtoken";
import type { AccessTokenClaims, TokenService } from "../../application/ports/token-service";
import { isUserRole } from "../../domain/entities/user.entity";

const ALGORITHM = "HS256";
const ISSUER = "medora-api";
const MIN_SECRET_LENGTH = 32;

export interface JwtTokenServiceOptions {
  secret: string;
  /** Seconds, or a duration string such as "1h". */
  expiresIn?: string | number;
}

export class JwtTokenService implements TokenService {
  private readonly secret: string;
  private readonly expiresIn: NonNullable<SignOptions["expiresIn"]>;

  constructor({ secret, expiresIn = "1h" }: JwtTokenServiceOptions) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`);
    }
    this.secret = secret;
    this.expiresIn = expiresIn as NonNullable<SignOptions["expiresIn"]>;
    // Fail at startup, not on the first login, if the duration is invalid.
    this.sign({ userId: "startup-check", role: "ADMIN" });
  }

  issue(claims: AccessTokenClaims): string {
    return this.sign(claims);
  }

  verify(token: string): AccessTokenClaims | null {
    try {
      // The algorithm is pinned: tokens using "none" or another algorithm are rejected.
      const payload = jwt.verify(token, this.secret, { algorithms: [ALGORITHM], issuer: ISSUER });
      if (typeof payload === "string") {
        return null;
      }
      const { sub, role } = payload;
      if (typeof sub !== "string" || sub.length === 0 || !isUserRole(role)) {
        return null;
      }
      return { userId: sub, role };
    } catch {
      return null;
    }
  }

  private sign({ userId, role }: AccessTokenClaims): string {
    return jwt.sign({ role }, this.secret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      subject: userId,
      expiresIn: this.expiresIn,
    });
  }
}
