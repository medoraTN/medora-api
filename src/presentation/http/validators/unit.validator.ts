import { z } from "zod";
import { UNIT_KINDS } from "../../../domain/entities/unit.entity";

export const createUnitSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est requis.").max(100),
    kind: z.enum(UNIT_KINDS),
  })
  .strict();

export const listUnitsQuerySchema = z
  .object({
    kind: z.enum(UNIT_KINDS).optional(),
  })
  .strict();
