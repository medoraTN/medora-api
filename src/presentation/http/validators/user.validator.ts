import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"]);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
}).strict();

export const createUserSchema = z.object({
  email: z.string().trim().pipe(z.email("Adresse e-mail invalide.")).transform((value) => value.toLowerCase()),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(100),
  role: roleSchema,
  password: z.string().min(1, "Le mot de passe est requis.").max(128, "Mot de passe trop long."),
}).strict();

export const updateUserRoleSchema = z.object({ role: roleSchema }).strict();
export const setUserActiveSchema = z.object({ isActive: z.boolean() }).strict();
export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(1, "Le mot de passe est requis.").max(128, "Mot de passe trop long."),
}).strict();
export const userIdParamsSchema = z.object({ id: z.string().trim().min(1).max(128) });
