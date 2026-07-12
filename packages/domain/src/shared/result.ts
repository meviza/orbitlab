/**
 * Explicit success/failure without throwing.
 * Prefer Result at domain and application boundaries.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(
  result: Result<T, E>
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

export function isErr<T, E>(
  result: Result<T, E>
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/** Map success value; leave error untouched. */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/** Chain another Result-producing operation on success. */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}
