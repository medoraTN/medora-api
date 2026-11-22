import { ConflictError } from "./conflict-error";

export class InvalidPatientStatusTransitionError extends ConflictError {
  constructor(from: string, to: string) {
    super(`Transition de statut impossible : ${from} → ${to}.`, "INVALID_STATUS_TRANSITION");
  }
}
