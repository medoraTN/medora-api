import { Prisma, type PrismaClient } from "@prisma/client";
import type { Reservation, ReservationStatus } from "../../../domain/entities/reservation.entity";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type {
  CreateReservationRecord,
  ReservationListQuery,
  ReservationPage,
  ReservationRepository,
  UpdateReservationRecord,
} from "../../../domain/repositories/reservation.repository";

export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(reservation: CreateReservationRecord): Promise<Reservation> {
    return this.prisma.reservation.create({ data: reservation });
  }

  findById(id: string): Promise<Reservation | null> {
    return this.prisma.reservation.findUnique({ where: { id } });
  }

  async list(query: ReservationListQuery): Promise<ReservationPage> {
    const where: Prisma.ReservationWhereInput = {
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            scheduledAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
    };
  }

  listByPatient(patientId: string): Promise<Reservation[]> {
    return this.prisma.reservation.findMany({
      where: { patientId },
      orderBy: { scheduledAt: "asc" },
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

  async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return this.update(id, { status });
  }
}
