/**
 * Branded identifier for a calculation / simulation module
 * (e.g. "mass-properties", "barrowman-stability").
 */
export type CalcModuleId = string & { readonly __brand: "CalcModuleId" };

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function isCalcModuleId(value: unknown): value is CalcModuleId {
  return typeof value === "string" && MODULE_ID_PATTERN.test(value);
}

export function calcModuleId(value: string): CalcModuleId {
  if (!MODULE_ID_PATTERN.test(value)) {
    throw new Error(
      `Invalid CalcModuleId "${value}": must match ${MODULE_ID_PATTERN}`
    );
  }
  return value as CalcModuleId;
}

export function calcModuleIdOrNull(value: string): CalcModuleId | null {
  return isCalcModuleId(value) ? value : null;
}
