import { Prisma, type PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type { Reservation, ReservationStatus } from "../../../domain/entities/reservation.entity";
import type {
  CreateReservationRecord,
  ReservationListQuery,
  ReservationRepository,
  UpdateReservationRecord,
} from "../../../domain/repositories/reservation.repository";

export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(reservation: CreateReservationRecord): Promise<Reservation> {
    try {
      return await this.prisma.reservation.create({ data: reservation });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundError("Patient");
      }
      throw error;
    }
  }
  findById(id: string): Promise<Reservation | null> { return this.prisma.reservation.findUnique({ where: { id } }); }
  listByPatient(patientId: string): Promise<Reservation[]> {
    return this.prisma.reservation.findMany({ where: { patientId }, orderBy: { scheduledAt: "asc" } });
  }
  list(query: ReservationListQuery): Promise<Reservation[]> {
    const dateStart = query.date ? new Date(`${query.date}T00:00:00.000Z`) : undefined;
    const dateEnd = dateStart ? new Date(dateStart.getTime() + 24 * 60 * 60 * 1000) : undefined;
    return this.prisma.reservation.findMany({
      where: {
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(dateStart && dateEnd ? { scheduledAt: { gte: dateStart, lt: dateEnd } } : {}),
      },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    });
  }
  async update(id: string, data: UpdateReservationRecord): Promise<Reservation> {
    try {
      return await this.prisma.reservation.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Réservation");
      }
      throw error;
    }
  }
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return this.update(id, { status });
  }
}
