import { z } from "zod";

const optionalNullableText = z.string().trim().max(200).nullable().optional();
const reservationStatus = z.enum(["CONFIRMED", "PENDING", "CANCELLED"]);

export const createReservationSchema = z.object({
  patientId: z.string().trim().min(1, "L’identifiant du patient est requis.").max(128),
  service: z.string().trim().min(1, "Le service est requis.").max(200),
  practitioner: optionalNullableText,
  examination: optionalNullableText,
  scheduledAt: z.iso.datetime({ offset: true, message: "La date/heure doit être au format ISO-8601." }),
  durationMinutes: z.number().int().min(5, "La durée minimale est de 5 minutes.").max(24 * 60),
  status: reservationStatus.optional(),
}).strict();

export const updateReservationSchema = z.object({
  service: z.string().trim().min(1, "Le service est requis.").max(200).optional(),
  practitioner: optionalNullableText,
  examination: optionalNullableText,
  scheduledAt: z.iso.datetime({ offset: true, message: "La date/heure doit être au format ISO-8601." }).optional(),
  durationMinutes: z.number().int().min(5, "La durée minimale est de 5 minutes.").max(24 * 60).optional(),
  status: reservationStatus.optional(),
}).strict().refine(
  (body) => Object.keys(body).length > 0,
  { message: "Au moins un champ à mettre à jour est requis." },
);

export const listReservationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().trim().min(1).max(128).optional(),
  status: reservationStatus.optional(),
  from: z.iso.datetime({ offset: true, message: "from doit être une date ISO-8601." }).optional(),
  to: z.iso.datetime({ offset: true, message: "to doit être une date ISO-8601." }).optional(),
}).strict().refine(
  (query) => !(query.from && query.to) || query.from <= query.to,
  { message: "from doit être antérieur ou égal à to.", path: ["from"] },
);

export const reservationIdParamsSchema = z.object({
  id: z.string().trim().min(1, "L’identifiant de la réservation est requis.").max(128),
});

export type CreateReservationBody = z.infer<typeof createReservationSchema>;
export type UpdateReservationBody = z.infer<typeof updateReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
