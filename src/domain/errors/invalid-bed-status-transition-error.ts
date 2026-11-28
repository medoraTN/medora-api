import { ConflictError } from "./conflict-error";

export class InvalidBedStatusTransitionError extends ConflictError {
  constructor(from: string, to: string) {
    super(`Transition de statut de lit impossible : ${from} → ${to}.`, "INVALID_BED_STATUS_TRANSITION");
  }
}
