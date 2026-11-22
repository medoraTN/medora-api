import { randomUUID } from "node:crypto";
import type { Reservation, ReservationStatus } from "../../src/domain/entities/reservation.entity";
import { NotFoundError } from "../../src/domain/errors/not-found-error";
import type {
  CreateReservationRecord,
  ReservationListQuery,
  ReservationPage,
  ReservationRepository,
  UpdateReservationRecord,
} from "../../src/domain/repositories/reservation.repository";

export class InMemoryReservationRepository implements ReservationRepository {
  private readonly records = new Map<string, Reservation>();

  async create(record: CreateReservationRecord): Promise<Reservation> {
    const now = new Date();
    const reservation: Reservation = { ...record, id: randomUUID(), createdAt: now, updatedAt: now };
    this.records.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.records.get(id) ?? null;
  }

  async list(query: ReservationListQuery): Promise<ReservationPage> {
    const filtered = [...this.records.values()]
      .filter((reservation) => !query.patientId || reservation.patientId === query.patientId)
      .filter((reservation) => !query.status || reservation.status === query.status)
      .filter((reservation) => !query.from || reservation.scheduledAt >= query.from)
      .filter((reservation) => !query.to || reservation.scheduledAt <= query.to)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.id.localeCompare(b.id));

    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize) || 0,
    };
  }

  async listByPatient(patientId: string): Promise<Reservation[]> {
    return [...this.records.values()]
      .filter((reservation) => reservation.patientId === patientId)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async update(id: string, data: UpdateReservationRecord): Promise<Reservation> {
    const current = this.records.get(id);
    if (!current) throw new NotFoundError("Réservation");
    const updated: Reservation = { ...current, ...data, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return this.update(id, { status });
  }

  clear(): void {
    this.records.clear();
  }
}
