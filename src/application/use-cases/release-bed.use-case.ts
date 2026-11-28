import { ConflictError } from "../../domain/errors/conflict-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { BedRepository } from "../../domain/repositories/bed.repository";

export class ReleaseBedUseCase {
  constructor(private readonly beds: BedRepository) {}

  async execute(bedId: string, actorUserId: string) {
    const bed = await this.beds.findById(bedId);
    if (!bed) throw new NotFoundError("Lit");
    if (bed.status !== "OCCUPIED" || !bed.currentPatientId) {
      throw new ConflictError("Ce lit n’est pas occupé.", "BED_NOT_OCCUPIED");
    }
    return this.beds.releasePatient(bedId, actorUserId);
  }
}
