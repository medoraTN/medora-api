import type { Unit, UnitKind } from "../entities/unit.entity";

export type CreateUnitRecord = Omit<Unit, "id" | "createdAt" | "updatedAt">;

export interface UnitRepository {
  create(unit: CreateUnitRecord): Promise<Unit>;
  findById(id: string): Promise<Unit | null>;
  list(kind?: UnitKind): Promise<Unit[]>;
}
