import type { PrismaClient } from "@prisma/client";
import type { Reservation, ReservationStatus } from "../../../domain/entities/reservation.entity";
import type { CreateReservationRecord, ReservationRepository } from "../../../domain/repositories/reservation.repository";

export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}
  create(reservation: CreateReservationRecord): Promise<Reservation> {
    return this.prisma.reservation.create({ data: reservation });
  }
  findById(id: string): Promise<Reservation | null> { return this.prisma.reservation.findUnique({ where: { id } }); }
  listByPatient(patientId: string): Promise<Reservation[]> {
    return this.prisma.reservation.findMany({ where: { patientId }, orderBy: { scheduledAt: "asc" } });
  }
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return this.prisma.reservation.update({ where: { id }, data: { status } });
  }
}
