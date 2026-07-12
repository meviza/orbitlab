import { DomainError, type DomainErrorCode } from "@orbitlab/domain";

export type ApplicationErrorCode = DomainErrorCode | "CONFLICT" | "INTERNAL";

/**
 * Application-boundary error. Maps domain failures and adds
 * orchestration-level codes (CONFLICT, INTERNAL).
 */
export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;
  override readonly cause?: unknown;

  constructor(
    code: ApplicationErrorCode,
    message: string,
    options?: {
      details?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromDomain(error: DomainError): ApplicationError {
    return new ApplicationError(error.code, error.message, {
      details: error.details,
      cause: error,
    });
  }

  static fromUnknown(error: unknown, fallback = "Unexpected error"): ApplicationError {
    if (error instanceof ApplicationError) return error;
    if (error instanceof DomainError) return ApplicationError.fromDomain(error);
    if (error instanceof Error) {
      return new ApplicationError("INTERNAL", error.message, { cause: error });
    }
    return new ApplicationError("INTERNAL", fallback, { cause: error });
  }

  static unauthorized(message = "Authentication required"): ApplicationError {
    return new ApplicationError("UNAUTHORIZED", message);
  }

  static forbidden(message = "Access denied"): ApplicationError {
    return new ApplicationError("FORBIDDEN", message);
  }

  static notFound(resource: string, id?: string): ApplicationError {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    return new ApplicationError("NOT_FOUND", message, {
      details: { resource, id },
    });
  }

  static validation(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): ApplicationError {
    return new ApplicationError("VALIDATION", message, { details });
  }

  static entitlement(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): ApplicationError {
    return new ApplicationError("ENTITLEMENT", message, { details });
  }

  static simulation(
    message: string,
    details?: Readonly<Record<string, unknown>>
  ): ApplicationError {
    return new ApplicationError("SIMULATION", message, { details });
  }

  static conflict(message: string): ApplicationError {
    return new ApplicationError("CONFLICT", message);
  }

  static internal(message: string, cause?: unknown): ApplicationError {
    return new ApplicationError("INTERNAL", message, { cause });
  }
}
