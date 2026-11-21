import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors';

const statuses: Record<string, number> = {
  INVALID_LOGIN: 401,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  PATIENT_NOT_FOUND: 404,
  DUPLICATE_RECORD: 409,
  STATUS_CONFLICT: 409,
  UNCHANGED_STATUS: 400,
};

export const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Vérifiez les champs de la requête.',
      fields: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
    return;
  }
  if (error instanceof DomainError) {
    res.status(statuses[error.code] ?? 500).json({ code: error.code, message: error.message });
    return;
  }
  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    res.status(error.status).json({ code: 'INVALID_BODY', message: 'Corps de requête invalide.' });
    return;
  }
  console.error('Medora API request failed', { errorName: error?.name });
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erreur interne.' });
};
