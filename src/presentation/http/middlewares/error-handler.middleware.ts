import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import {
  ForbiddenError,
  InvalidCredentialsError,
  UnauthenticatedError,
} from "../../../domain/errors/auth-errors";
import { DomainError, ValidationError } from "../../../domain/errors/domain-error";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return status;
    }
  }
  return undefined;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = { error: { code: "NOT_FOUND", message: "Ressource introuvable." } };
  res.status(404).json(body);
};

// Express identifies error handlers by their four parameters, so `next` must stay in the signature.
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof InvalidCredentialsError || error instanceof UnauthenticatedError) {
    res.set("WWW-Authenticate", "Bearer");
    send(res, 401, error.code, error.message);
    return;
  }
  if (error instanceof ForbiddenError) {
    send(res, 403, error.code, error.message);
    return;
  }
  if (error instanceof ZodError) {
    send(res, 400, "VALIDATION_ERROR", "Données invalides.", error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })));
    return;
  }
  if (error instanceof ValidationError) {
    send(res, 400, error.code, error.message, error.details);
    return;
  }
  if (error instanceof NotFoundError) {
    send(res, 404, error.code, error.message);
    return;
  }
  if (error instanceof ConflictError) {
    send(res, 409, error.code, error.message);
    return;
  }
  if (error instanceof DomainError) {
    send(res, 422, error.code, error.message);
    return;
  }

  // Malformed JSON, oversized body, etc. raised by Express/body-parser.
  const status = clientErrorStatus(error);
  if (status) {
    send(res, status, status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST", "Requête invalide.");
    return;
  }

  console.error("[medora-api] unexpected error", error);
  send(res, 500, "INTERNAL_ERROR", "Une erreur interne est survenue.");
};

function send(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: { field: string; message: string }[],
): void {
  const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
  res.status(status).json(body);
}
