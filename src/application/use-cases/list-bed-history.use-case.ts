import { NotFoundError } from "../../domain/errors/not-found-error";
import type { BedRepository } from "../../domain/repositories/bed.repository";

export class ListBedHistoryUseCase {
  constructor(private readonly beds: BedRepository) {}

  async execute(bedId: string) {
    if (!(await this.beds.findById(bedId))) throw new NotFoundError("Lit");
    return this.beds.listHistory(bedId);
  }
}
