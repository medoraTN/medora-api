import { z } from 'zod';
import { patientStatuses } from '../../../domain/entities/patient.entity';

const required = z.string().trim().min(1).max(200);

export const loginInput = z.strictObject({
  email: z.email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(256),
});

export const patientInput = z.strictObject({
  recordNumber: required.max(50),
  firstName: required,
  lastName: required,
  dateOfBirth: z.iso.date().transform((date) => new Date(date)).refine(
    (date) => date.getTime() <= Date.now(), 'La date de naissance doit être passée ou présente.',
  ),
  sex: required,
  phone: z.string().trim().min(1).max(40),
  residence: required,
  arrivalReason: required,
  priority: required,
  comments: z.string().trim().max(2000).nullable().optional(),
}).transform(({ comments, ...fields }) => ({ ...fields, comments: comments || null }));

export const patientEditInput = patientInput.in.partial().refine(
  (fields) => Object.keys(fields).length > 0, 'Aucune modification fournie.',
);

const positiveInteger = z.string().regex(/^[1-9]\d*$/).transform(Number);

export const listInput = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(patientStatuses).optional(),
  page: positiveInteger.pipe(z.number().max(100000)).default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(20),
});

export const statusInput = z.strictObject({ status: z.enum(patientStatuses) });
export const idInput = z.uuid();
