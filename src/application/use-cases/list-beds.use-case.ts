import type { BedListQuery, BedRepository } from "../../domain/repositories/bed.repository";

export class ListBedsUseCase {
  constructor(private readonly beds: BedRepository) {}

  execute(query: BedListQuery = {}) {
    return this.beds.list(query);
  }
}
