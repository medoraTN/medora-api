import { randomUUID } from "node:crypto";
import type { Bed, BedAssignmentEvent, BedStatus } from "../../src/domain/entities/bed.entity";
import type { Unit } from "../../src/domain/entities/unit.entity";
import { ConflictError } from "../../src/domain/errors/conflict-error";
import { NotFoundError } from "../../src/domain/errors/not-found-error";
import type { BedListQuery, BedRepository, CreateBedRecord } from "../../src/domain/repositories/bed.repository";

export class InMemoryBedRepository implements BedRepository {
  private readonly records = new Map<string, Bed>();
  private readonly history: BedAssignmentEvent[] = [];

  constructor(private readonly units: Map<string, Unit> = new Map()) {}

  seedUnit(unit: Unit): void {
    this.units.set(unit.id, unit);
  }

  async create(record: CreateBedRecord): Promise<Bed> {
    if (
      [...this.records.values()].some(
        (bed) => bed.unitId === record.unitId && bed.code.toUpperCase() === record.code.toUpperCase(),
      )
    ) {
      throw new ConflictError("Un lit existe déjà avec ce code dans cette unité.");
    }
    const now = new Date();
    const bed: Bed = {
      id: randomUUID(),
      unitId: record.unitId,
      code: record.code,
      type: record.type,
      status: record.status ?? "FREE",
      currentPatientId: record.currentPatientId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(bed.id, bed);
    return bed;
  }

  async findById(id: string): Promise<Bed | null> {
    return this.records.get(id) ?? null;
  }

  async findByPatientId(patientId: string): Promise<Bed | null> {
    return [...this.records.values()].find((bed) => bed.currentPatientId === patientId) ?? null;
  }

  async list(query: BedListQuery = {}): Promise<Bed[]> {
    return [...this.records.values()]
      .filter((bed) => {
        if (query.unitId && bed.unitId !== query.unitId) return false;
        if (query.status && bed.status !== query.status) return false;
        if (query.unitKind) {
          const unit = this.units.get(bed.unitId);
          if (!unit || unit.kind !== query.unitKind) return false;
        }
        return true;
      })
      .sort((a, b) => a.unitId.localeCompare(b.unitId) || a.code.localeCompare(b.code));
  }

  async updateStatus(id: string, status: BedStatus): Promise<Bed> {
    const bed = this.records.get(id);
    if (!bed) throw new NotFoundError("Lit");
    const updated = { ...bed, status, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async assignPatient(bedId: string, patientId: string, actorUserId: string): Promise<Bed> {
    const bed = this.records.get(bedId);
    if (!bed) throw new NotFoundError("Lit");
    if (bed.currentPatientId || (bed.status !== "FREE" && bed.status !== "RESERVED")) {
      throw new ConflictError("Ce lit n’est pas disponible pour une attribution.", "BED_NOT_AVAILABLE");
    }
    const updated: Bed = {
      ...bed,
      status: "OCCUPIED",
      currentPatientId: patientId,
      updatedAt: new Date(),
    };
    this.records.set(bedId, updated);
    this.history.push({
      id: randomUUID(),
      bedId,
      patientId,
      event: "ASSIGNED",
      fromBedId: null,
      toBedId: bedId,
      actorUserId,
      createdAt: new Date(),
    });
    return updated;
  }

  async transferPatient(
    fromBedId: string,
    toBedId: string,
    actorUserId: string,
  ): Promise<{ from: Bed; to: Bed }> {
    const from = this.records.get(fromBedId);
    if (!from) throw new NotFoundError("Lit");
    if (from.status !== "OCCUPIED" || !from.currentPatientId) {
      throw new ConflictError("Aucun patient à transférer depuis ce lit.", "BED_NOT_OCCUPIED");
    }
    const to = this.records.get(toBedId);
    if (!to) throw new NotFoundError("Lit");
    if (to.currentPatientId || (to.status !== "FREE" && to.status !== "RESERVED")) {
      throw new ConflictError("Le lit de destination n’est pas disponible.", "BED_NOT_AVAILABLE");
    }
    const patientId = from.currentPatientId;
    const released: Bed = { ...from, status: "FREE", currentPatientId: null, updatedAt: new Date() };
    const occupied: Bed = { ...to, status: "OCCUPIED", currentPatientId: patientId, updatedAt: new Date() };
    this.records.set(fromBedId, released);
    this.records.set(toBedId, occupied);
    this.history.push({
      id: randomUUID(),
      bedId: toBedId,
      patientId,
      event: "TRANSFERRED",
      fromBedId,
      toBedId,
      actorUserId,
      createdAt: new Date(),
    });
    return { from: released, to: occupied };
  }

  async releasePatient(bedId: string, actorUserId: string): Promise<Bed> {
    const bed = this.records.get(bedId);
    if (!bed) throw new NotFoundError("Lit");
    if (bed.status !== "OCCUPIED" || !bed.currentPatientId) {
      throw new ConflictError("Ce lit n’est pas occupé.", "BED_NOT_OCCUPIED");
    }
    const patientId = bed.currentPatientId;
    const updated: Bed = { ...bed, status: "FREE", currentPatientId: null, updatedAt: new Date() };
    this.records.set(bedId, updated);
    this.history.push({
      id: randomUUID(),
      bedId,
      patientId,
      event: "RELEASED",
      fromBedId: bedId,
      toBedId: null,
      actorUserId,
      createdAt: new Date(),
    });
    return updated;
  }

  async listHistory(bedId: string): Promise<BedAssignmentEvent[]> {
    return this.history
      .filter((entry) => entry.bedId === bedId || entry.fromBedId === bedId || entry.toBedId === bedId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
