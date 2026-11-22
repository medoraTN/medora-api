import { z } from "zod";

export const loginSchema = z.object({
  email: z.string("L’e-mail est requis.").trim().pipe(z.email("Adresse e-mail invalide.")),
  password: z.string("Le mot de passe est requis.").min(1, "Le mot de passe est requis.").max(128, "Mot de passe trop long."),
});

export type LoginBody = z.infer<typeof loginSchema>;
