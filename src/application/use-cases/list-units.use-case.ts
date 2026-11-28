import type { UnitKind } from "../../domain/entities/unit.entity";
import type { UnitRepository } from "../../domain/repositories/unit.repository";

export class ListUnitsUseCase {
  constructor(private readonly units: UnitRepository) {}

  execute(kind?: UnitKind) {
    return this.units.list(kind);
  }
}
