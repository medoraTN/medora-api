import type { ReservationStatus } from "../../domain/entities/reservation.entity";

export interface CreateReservationDto {
  patientId: string;
  service: string;
  practitioner?: string | null | undefined;
  examination?: string | null | undefined;
  scheduledAt: string;
  durationMinutes: number;
  status?: ReservationStatus | undefined;
}

export interface UpdateReservationDto {
  service?: string | undefined;
  practitioner?: string | null | undefined;
  examination?: string | null | undefined;
  scheduledAt?: string | undefined;
  durationMinutes?: number | undefined;
  status?: ReservationStatus | undefined;
}

export interface ListReservationsDto {
  page: number;
  pageSize: number;
  patientId?: string | undefined;
  status?: ReservationStatus | undefined;
  from?: string | undefined;
  to?: string | undefined;
}
