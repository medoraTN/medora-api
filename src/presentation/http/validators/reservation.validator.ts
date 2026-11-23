import { z } from "zod";

const futureDateTime = z.iso.datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((value) => value > new Date(), "La date de réservation doit être dans le futur.");

export const createReservationSchema = z.object({
  patientId: z.string().trim().min(1).max(128),
  service: z.string().trim().min(1).max(200),
  practitioner: z.string().trim().max(200).nullable().optional(),
  examination: z.string().trim().max(200).nullable().optional(),
  scheduledAt: futureDateTime,
  durationMinutes: z.number().int().min(1),
}).strict();

export const listReservationsQuerySchema = z.object({
  date: z.iso.date().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  patientId: z.string().trim().min(1).max(128).optional(),
}).strict();

export const reservationIdParamsSchema = z.object({
  id: z.string().trim().min(1, "L’identifiant de la réservation est requis.").max(128),
});

export const updateReservationSchema = z.object({
  service: z.string().trim().min(1).max(200).optional(),
  practitioner: z.string().trim().max(200).nullable().optional(),
  examination: z.string().trim().max(200).nullable().optional(),
  scheduledAt: futureDateTime.optional(),
  durationMinutes: z.number().int().min(1).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Au moins un champ doit être fourni.");

export type CreateReservationBody = z.infer<typeof createReservationSchema>;
export type UpdateReservationBody = z.infer<typeof updateReservationSchema>;
