export interface CreateReservationDto {
  patientId: string;
  service: string;
  practitioner?: string | null | undefined;
  examination?: string | null | undefined;
  scheduledAt: Date;
  durationMinutes: number;
}
