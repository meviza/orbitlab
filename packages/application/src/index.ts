// Errors
export {
  ApplicationError,
  type ApplicationErrorCode,
} from "./errors/application-error.js";

// DTOs
export {
  type RocketComponentDto,
  type DesignDto,
  type SaveDesignCommand,
  componentToDto,
  designToDto,
  type SimProgressEvent,
  type SimRunResultDto,
  type RunSimulationCommand,
  simRunToDto,
  type ReportDto,
  type ExportReportCommand,
  type ThrustSampleDto,
  type ImportThrustCurveCommand,
  type ThrustCurveDto,
} from "./dto/index.js";

// Application ports
export type {
  SimulationRunnerPort,
  ModuleTierLookup,
} from "./ports/index.js";

// Use cases
export {
  SaveDesignUseCase,
  type SaveDesignDeps,
  GetDesignUseCase,
  type GetDesignDeps,
  type GetDesignQuery,
  ListDesignsUseCase,
  type ListDesignsDeps,
  DeleteDesignUseCase,
  type DeleteDesignDeps,
  type DeleteDesignCommand,
  RunSimulationUseCase,
  type RunSimulationDeps,
  ExportReportUseCase,
  ImportThrustCurveUseCase,
  parseThrustCurveCsv,
  trapezoidalImpulseNs,
} from "./use-cases/index.js";
