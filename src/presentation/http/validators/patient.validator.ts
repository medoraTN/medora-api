import { z } from "zod";

const optionalText = z.string().trim().max(2000).nullable().optional();

export const createPatientSchema = z.object({
  recordNumber: z.string().trim().min(1, "Le numéro de dossier est requis.").max(64),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(100),
  dateOfBirth: z.iso.date("La date de naissance doit respecter le format AAAA-MM-JJ.")
    .refine((date) => date <= new Date().toISOString().slice(0, 10), "La date de naissance ne peut pas être future."),
  sex: z.enum(["FEMALE", "MALE", "OTHER", "UNKNOWN"]).optional(),
  phone: z.string().trim().min(6, "Le téléphone est requis.").max(30)
    .regex(/^\+?[\d\s().-]+$/, "Le format du téléphone est invalide.")
    .refine((phone) => (phone.match(/\d/g) ?? []).length >= 6, "Le téléphone doit contenir au moins 6 chiffres."),
  address: optionalText,
  arrivalReason: z.string().trim().min(1, "Le motif d’arrivée est requis.").max(1000),
  urgencyLevel: z.number().int().min(1, "La priorité doit être un entier positif."),
  internalNotes: optionalText,
}).strict();

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["WAITING", "IN_CARE", "IN_EXAM", "AWAITING_RESULTS", "READY_FOR_DISCHARGE", "DISCHARGED", "TRANSFERRED", "CANCELLED"]).optional(),
}).strict();

export const patientIdParamsSchema = z.object({ id: z.string().trim().min(1, "L’identifiant du patient est requis.").max(128) });

export type CreatePatientBody = z.infer<typeof createPatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
