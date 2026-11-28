import { NotFoundError } from "../../domain/errors/not-found-error";
import type { BedRepository } from "../../domain/repositories/bed.repository";
import type { UnitRepository } from "../../domain/repositories/unit.repository";
import type { CreateBedDto } from "../dto/create-bed.dto";

export class CreateBedUseCase {
  constructor(
    private readonly beds: BedRepository,
    private readonly units: UnitRepository,
  ) {}

  async execute(input: CreateBedDto) {
    if (!(await this.units.findById(input.unitId))) throw new NotFoundError("Unité");
    return this.beds.create({
      unitId: input.unitId,
      code: input.code.trim().toUpperCase(),
      type: input.type,
      status: "FREE",
      currentPatientId: null,
    });
  }
}
