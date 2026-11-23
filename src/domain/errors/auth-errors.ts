import { DomainError } from "./domain-error";
import { ConflictError } from "./conflict-error";

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

export class SelfModificationError extends ConflictError {
  constructor() {
    super("Un administrateur ne peut pas désactiver ou rétrograder son propre compte.", "SELF_MODIFICATION_FORBIDDEN");
  }
}

export class LastAdminError extends ConflictError {
  constructor() {
    super("Il doit rester au moins un administrateur actif.", "LAST_ADMIN_REQUIRED");
  }
}
