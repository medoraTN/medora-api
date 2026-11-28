import type { UnitKind } from "../../domain/entities/unit.entity";

export interface CreateUnitDto {
  name: string;
  kind: UnitKind;
}
