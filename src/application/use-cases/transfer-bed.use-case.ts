import { ConflictError } from "../../domain/errors/conflict-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import { canAssignToBedStatus } from "../../domain/value-objects/bed-status.vo";
import type { BedRepository } from "../../domain/repositories/bed.repository";

export class TransferBedUseCase {
  constructor(private readonly beds: BedRepository) {}

  async execute(fromBedId: string, toBedId: string, actorUserId: string) {
    if (fromBedId === toBedId) {
      throw new ConflictError("Le lit de destination doit être différent.", "INVALID_BED_TRANSFER");
    }

    const from = await this.beds.findById(fromBedId);
    if (!from) throw new NotFoundError("Lit");
    if (from.status !== "OCCUPIED" || !from.currentPatientId) {
      throw new ConflictError("Aucun patient à transférer depuis ce lit.", "BED_NOT_OCCUPIED");
    }

    const to = await this.beds.findById(toBedId);
    if (!to) throw new NotFoundError("Lit");
    if (!canAssignToBedStatus(to.status) || to.currentPatientId) {
      throw new ConflictError("Le lit de destination n’est pas disponible.", "BED_NOT_AVAILABLE");
    }

    return this.beds.transferPatient(fromBedId, toBedId, actorUserId);
  }
}
