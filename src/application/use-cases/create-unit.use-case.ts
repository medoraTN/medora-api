import type { UnitRepository } from "../../domain/repositories/unit.repository";
import type { CreateUnitDto } from "../dto/create-unit.dto";

export class CreateUnitUseCase {
  constructor(private readonly units: UnitRepository) {}

  execute(input: CreateUnitDto) {
    return this.units.create({
      name: input.name.trim(),
      kind: input.kind,
    });
  }
}
