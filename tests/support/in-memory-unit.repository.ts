import { randomUUID } from "node:crypto";
import type { Unit, UnitKind } from "../../src/domain/entities/unit.entity";
import { ConflictError } from "../../src/domain/errors/conflict-error";
import type { CreateUnitRecord, UnitRepository } from "../../src/domain/repositories/unit.repository";

export class InMemoryUnitRepository implements UnitRepository {
  readonly records = new Map<string, Unit>();

  async create(record: CreateUnitRecord): Promise<Unit> {
    if ([...this.records.values()].some((unit) => unit.name.toLowerCase() === record.name.toLowerCase())) {
      throw new ConflictError("Une unité existe déjà avec ce nom.");
    }
    const now = new Date();
    const unit: Unit = { ...record, id: randomUUID(), createdAt: now, updatedAt: now };
    this.records.set(unit.id, unit);
    return unit;
  }

  async findById(id: string): Promise<Unit | null> {
    return this.records.get(id) ?? null;
  }

  async list(kind?: UnitKind): Promise<Unit[]> {
    return [...this.records.values()]
      .filter((unit) => !kind || unit.kind === kind)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  }
}
