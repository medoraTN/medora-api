import { z } from "zod";

const userRole = z.enum(["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"]);

export const createUserSchema = z.object({
  email: z.string("L’e-mail est requis.").trim().pipe(z.email("Adresse e-mail invalide.")),
  password: z.string("Le mot de passe est requis.").min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(100),
  role: userRole,
}).strict();

export const updateUserSchema = z.object({
  role: userRole.optional(),
  isActive: z.boolean().optional(),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100).optional(),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(100).optional(),
}).strict().refine(
  (body) => Object.keys(body).length > 0,
  { message: "Au moins un champ à mettre à jour est requis." },
);

export const resetPasswordSchema = z.object({
  password: z.string("Le mot de passe est requis.").min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
}).strict();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeInactive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
}).strict();

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, "L’identifiant de l’utilisateur est requis.").max(128),
});
