import { DomainError } from "./domain-error";

export class NotFoundError extends DomainError {
  constructor(resource = "Ressource") {
    super(`${resource} introuvable.`, "NOT_FOUND");
  }
}
