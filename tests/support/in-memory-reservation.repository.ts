import { randomUUID } from "node:crypto";
import type { Reservation, ReservationStatus } from "../../src/domain/entities/reservation.entity";
import { NotFoundError } from "../../src/domain/errors/not-found-error";
import type {
  CreateReservationRecord,
  ReservationListQuery,
  ReservationRepository,
  UpdateReservationRecord,
} from "../../src/domain/repositories/reservation.repository";

export class InMemoryReservationRepository implements ReservationRepository {
  private readonly records = new Map<string, Reservation>();

  async create(input: CreateReservationRecord): Promise<Reservation> {
    const now = new Date();
    const reservation: Reservation = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.records.set(reservation.id, reservation);
    return reservation;
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.records.get(id) ?? null;
  }

  async listByPatient(patientId: string): Promise<Reservation[]> {
    return [...this.records.values()]
      .filter((reservation) => reservation.patientId === patientId)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async list(query: ReservationListQuery): Promise<Reservation[]> {
    const start = query.date ? new Date(`${query.date}T00:00:00.000Z`).getTime() : undefined;
    const end = start === undefined ? undefined : start + 24 * 60 * 60 * 1000;
    return [...this.records.values()]
      .filter((reservation) => !query.patientId || reservation.patientId === query.patientId)
      .filter((reservation) => !query.status || reservation.status === query.status)
      .filter((reservation) => start === undefined || (reservation.scheduledAt.getTime() >= start && reservation.scheduledAt.getTime() < end!))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime() || a.id.localeCompare(b.id));
  }

  async update(id: string, data: UpdateReservationRecord): Promise<Reservation> {
    const current = this.records.get(id);
    if (!current) throw new NotFoundError("Réservation");
    const updated = { ...current, ...data, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return this.update(id, { status });
  }
}
