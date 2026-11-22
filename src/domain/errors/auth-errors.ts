import { DomainError } from "./domain-error";

/** Wrong email/password or inactive account. Deliberately never says which one. */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("Identifiants incorrects.", "INVALID_CREDENTIALS");
  }
}

/** Missing, malformed, expired or otherwise invalid access token. */
export class UnauthenticatedError extends DomainError {
  constructor() {
    super("Authentification requise.", "UNAUTHENTICATED");
  }
}

/** Authenticated user whose role is not allowed to perform the action. */
export class ForbiddenError extends DomainError {
  constructor() {
    super("Accès refusé : votre rôle n’autorise pas cette action.", "FORBIDDEN");
  }
}
