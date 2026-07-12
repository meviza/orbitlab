import { DomainError } from "../shared/errors.js";

/**
 * Pure SI geometry helpers for rocket domain math (metres, m², m³).
 * Invalid numeric input throws {@link DomainError} with code `VALIDATION`.
 */

function assertFiniteNumber(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw DomainError.validation(`${label} must be a finite number`, {
      value,
      label,
    });
  }
  return value;
}

/**
 * Assert `m` is a finite length strictly greater than zero (metres).
 * @returns the same value for chaining
 */
export function assertPositiveLength(m: number, label = "length"): number {
  assertFiniteNumber(m, label);
  if (!(m > 0)) {
    throw DomainError.validation(`${label} must be positive`, {
      value: m,
      label,
    });
  }
  return m;
}

/**
 * Assert `value` is a finite number greater than or equal to zero.
 * @returns the same value for chaining
 */
export function assertNonNegative(value: number, label = "value"): number {
  assertFiniteNumber(value, label);
  if (value < 0) {
    throw DomainError.validation(`${label} must be non-negative`, {
      value,
      label,
    });
  }
  return value;
}

/** Convert diameter (m) to radius (m). Diameter must be non-negative. */
export function diameterToRadius(diameterM: number): number {
  assertNonNegative(diameterM, "diameter");
  return diameterM / 2;
}

/** Convert radius (m) to diameter (m). Radius must be non-negative. */
export function radiusToDiameter(radiusM: number): number {
  assertNonNegative(radiusM, "radius");
  return radiusM * 2;
}

/** Circle area A = π r² (m²). Radius in metres, non-negative. */
export function circleArea(radiusM: number): number {
  assertNonNegative(radiusM, "radius");
  return Math.PI * radiusM * radiusM;
}

/**
 * Right circular cylinder volume V = π r² L (m³).
 * Radius and length in metres; both non-negative.
 */
export function cylinderVolume(radiusM: number, lengthM: number): number {
  assertNonNegative(radiusM, "radius");
  assertNonNegative(lengthM, "length");
  return Math.PI * radiusM * radiusM * lengthM;
}

/**
 * Trapezoidal fin planform area (m²), one panel:
 * A ≈ ½ (root + tip) × span
 *
 * All inputs in metres and non-negative (tip may be zero for a triangular fin).
 */
export function finPlanformArea(
  rootChordM: number,
  tipChordM: number,
  spanM: number
): number {
  assertNonNegative(rootChordM, "rootChord");
  assertNonNegative(tipChordM, "tipChord");
  assertNonNegative(spanM, "span");
  return 0.5 * (rootChordM + tipChordM) * spanM;
}
