// Shared
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  mapResult,
  flatMapResult,
} from "./shared/result.js";

export { DomainError, type DomainErrorCode } from "./shared/errors.js";

// Value objects
export {
  type PlanTier,
  isPlanTier,
  parsePlanTier,
  tierMeetsRequirement,
  planTierLabel,
  type CalcModuleId,
  isCalcModuleId,
  calcModuleId,
  calcModuleIdOrNull,
  type MassUnit,
  type LengthUnit,
  type ForceUnit,
  toKilograms,
  toMetres,
  toNewtons,
  assertPositiveLength,
  assertNonNegative,
  diameterToRadius,
  radiusToDiameter,
  circleArea,
  cylinderVolume,
  finPlanformArea,
} from "./value-objects/index.js";

// Entities
export {
  User,
  type UserProps,
  RocketComponent,
  type RocketComponentProps,
  type RocketComponentType,
  RocketDesign,
  type RocketDesignProps,
  type CreateRocketDesignInput,
  SimRun,
  type SimRunProps,
  type CreateSimRunInput,
  type SimRunStatus,
  type SimSummaryMetrics,
} from "./entities/index.js";

// Ports
export type {
  DesignRepository,
  SimRunRepository,
  AuthPort,
  SignInCredentials,
  SignUpCredentials,
  FileStoragePort,
  UploadInput,
  UploadResult,
  ClockPort,
  IdGeneratorPort,
  EntitlementPort,
} from "./ports/index.js";

// Specifications
export {
  canRunModule,
  isProPlan,
  isPaidPlan,
  isFreePlan,
} from "./specifications/index.js";
