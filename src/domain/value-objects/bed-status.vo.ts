import type { BedStatus } from "../entities/bed.entity";

/** Manual status changes (not assign / transfer / release). */
const MANUAL_TRANSITIONS: Record<BedStatus, readonly BedStatus[]> = {
  FREE: ["CLEANING", "MAINTENANCE", "RESERVED"],
  OCCUPIED: [],
  CLEANING: ["FREE", "MAINTENANCE"],
  MAINTENANCE: ["FREE"],
  RESERVED: ["FREE", "CLEANING", "MAINTENANCE"],
};

export function canManuallyTransitionBedStatus(from: BedStatus, to: BedStatus): boolean {
  return MANUAL_TRANSITIONS[from].includes(to);
}

export function canAssignToBedStatus(status: BedStatus): boolean {
  return status === "FREE" || status === "RESERVED";
}
