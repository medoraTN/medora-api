import { z } from "zod";
import { BED_STATUSES, BED_TYPES } from "../../../domain/entities/bed.entity";
import { UNIT_KINDS } from "../../../domain/entities/unit.entity";

export const createBedSchema = z
  .object({
    unitId: z.string().trim().min(1).max(128),
    code: z.string().trim().min(1, "Le code lit est requis.").max(50),
    type: z.enum(BED_TYPES),
  })
  .strict();

export const listBedsQuerySchema = z
  .object({
    unitId: z.string().trim().min(1).max(128).optional(),
    status: z.enum(BED_STATUSES).optional(),
    unitKind: z.enum(UNIT_KINDS).optional(),
  })
  .strict();

export const bedIdParamsSchema = z.object({ id: z.string().trim().min(1).max(128) });

export const assignBedSchema = z
  .object({
    patientId: z.string().trim().min(1).max(128),
  })
  .strict();

export const transferBedSchema = z
  .object({
    toBedId: z.string().trim().min(1).max(128),
  })
  .strict();

export const updateBedStatusSchema = z
  .object({
    status: z.enum(BED_STATUSES),
  })
  .strict();
