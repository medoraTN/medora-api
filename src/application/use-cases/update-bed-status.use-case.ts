import { NotFoundError } from "../../domain/errors/not-found-error";
import { InvalidBedStatusTransitionError } from "../../domain/errors/invalid-bed-status-transition-error";
import type { BedStatus } from "../../domain/entities/bed.entity";
import { canManuallyTransitionBedStatus } from "../../domain/value-objects/bed-status.vo";
import type { BedRepository } from "../../domain/repositories/bed.repository";

export class UpdateBedStatusUseCase {
  constructor(private readonly beds: BedRepository) {}

  async execute(bedId: string, status: BedStatus) {
    const bed = await this.beds.findById(bedId);
    if (!bed) throw new NotFoundError("Lit");
    if (bed.status === status) return bed;
    if (!canManuallyTransitionBedStatus(bed.status, status)) {
      throw new InvalidBedStatusTransitionError(bed.status, status);
    }
    return this.beds.updateStatus(bedId, status);
  }
}
