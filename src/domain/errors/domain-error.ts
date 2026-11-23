export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly details: { field: string; message: string }[],
  ) {
    super(message, "VALIDATION_ERROR");
  }
}
