export type DomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "ENTITLEMENT"
  | "SIMULATION";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static unauthorized(message = "Authentication required"): DomainError {
    return new DomainError("UNAUTHORIZED", message);
  }

  static forbidden(message = "Access denied"): DomainError {
    return new DomainError("FORBIDDEN", message);
  }

  static notFound(resource: string, id?: string): DomainError {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    return new DomainError("NOT_FOUND", message, { resource, id });
  }

  static validation(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): DomainError {
    return new DomainError("VALIDATION", message, details);
  }

  static entitlement(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): DomainError {
    return new DomainError("ENTITLEMENT", message, details);
  }

  static simulation(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): DomainError {
    return new DomainError("SIMULATION", message, details);
  }
}
