import {
  SimRun,
  calcModuleId,
  canRunModule,
  type DesignRepository,
  type SimRunRepository,
  type AuthPort,
  type ClockPort,
  type IdGeneratorPort,
  type EntitlementPort,
  type PlanTier,
  ok,
  err,
  type Result,
  DomainError,
} from "@orbitlab/domain";
import {
  simRunToDto,
  type RunSimulationCommand,
  type SimProgressEvent,
  type SimRunResultDto,
} from "../dto/sim-run-dto.js";
import { ApplicationError } from "../errors/application-error.js";
import type {
  ModuleTierLookup,
  SimulationRunnerPort,
} from "../ports/simulation-runner-port.js";

export interface RunSimulationDeps {
  readonly designs: DesignRepository;
  readonly simRuns: SimRunRepository;
  readonly auth: AuthPort;
  readonly runner: SimulationRunnerPort;
  readonly entitlements: EntitlementPort;
  readonly moduleTiers: ModuleTierLookup;
  readonly ids: IdGeneratorPort;
  readonly clock: ClockPort;
}

/**
 * Orchestration:
 * 1. Authenticate
 * 2. Load design (ownership check)
 * 3. Authorize each module via entitlements + plan specs
 * 4. Run simulation via SimulationRunnerPort
 * 5. Persist SimRun
 * 6. Return result DTO
 */
export class RunSimulationUseCase {
  constructor(private readonly deps: RunSimulationDeps) {}

  async execute(
    command: RunSimulationCommand,
    onProgress?: (event: SimProgressEvent) => void
  ): Promise<Result<SimRunResultDto, ApplicationError>> {
    try {
      const designId = command.designId?.trim();
      if (!designId) {
        return err(ApplicationError.validation("designId is required"));
      }
      if (!command.moduleIds?.length) {
        return err(
          ApplicationError.validation("At least one moduleId is required")
        );
      }

      // 1. Authenticate
      const userResult = await this.deps.auth.currentUser();
      if (!userResult.ok) {
        return err(ApplicationError.fromDomain(userResult.error));
      }
      const user = userResult.value;
      if (!user) {
        return err(ApplicationError.unauthorized());
      }

      // 2. Load design
      const designResult = await this.deps.designs.findById(designId);
      if (!designResult.ok) {
        return err(ApplicationError.fromDomain(designResult.error));
      }
      if (!designResult.value) {
        return err(ApplicationError.notFound("Design", designId));
      }
      const design = designResult.value;
      if (!design.isOwnedBy(user.id)) {
        return err(ApplicationError.forbidden("Not the design owner"));
      }

      // Normalize + validate module ids
      let moduleIds: string[];
      try {
        moduleIds = command.moduleIds.map((id) => calcModuleId(id.trim()));
      } catch (e) {
        return err(
          ApplicationError.validation(
            e instanceof Error ? e.message : "Invalid module id"
          )
        );
      }

      // 3. Authorize modules
      for (const moduleId of moduleIds) {
        const tierRequired = await this.deps.moduleTiers.requiredTier(moduleId);
        const allowedBySpec = canRunModule(user, tierRequired as PlanTier);
        const allowedByPort = await this.deps.entitlements.canUseModule(
          user,
          calcModuleId(moduleId),
          tierRequired as PlanTier
        );

        if (!allowedBySpec || !allowedByPort) {
          return err(
            ApplicationError.entitlement(
              `Module "${moduleId}" requires plan tier "${tierRequired}"`,
              { moduleId, tierRequired, userPlan: user.plan }
            )
          );
        }
      }

      // 4. Run simulation
      const runId = this.deps.ids.nextId();
      const createdAt = this.deps.clock.now();

      let pending: SimRun;
      try {
        pending = SimRun.create({
          id: runId,
          designId: design.id,
          moduleIds,
          status: "pending",
          createdAt,
        }).markRunning();
      } catch (e) {
        if (e instanceof DomainError) {
          return err(ApplicationError.fromDomain(e));
        }
        return err(ApplicationError.fromUnknown(e));
      }

      const savePending = await this.deps.simRuns.save(pending);
      if (!savePending.ok) {
        return err(ApplicationError.fromDomain(savePending.error));
      }

      let runnerResult: SimRunResultDto;
      try {
        runnerResult = await this.deps.runner.run(
          design,
          moduleIds,
          onProgress
        );
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Simulation runner failed";
        const failed = pending.markFailed(message);
        await this.deps.simRuns.save(failed);
        return err(
          ApplicationError.simulation(message, { designId, moduleIds })
        );
      }

      // 5. Persist completed / failed run from runner status
      let finalRun: SimRun;
      try {
        if (runnerResult.status === "failed") {
          finalRun = pending.markFailed(
            runnerResult.errorMessage ?? "Simulation failed"
          );
        } else {
          finalRun = pending.markCompleted(runnerResult.summary ?? {});
        }
      } catch (e) {
        if (e instanceof DomainError) {
          return err(ApplicationError.fromDomain(e));
        }
        return err(ApplicationError.fromUnknown(e));
      }

      const saved = await this.deps.simRuns.save(finalRun);
      if (!saved.ok) {
        return err(ApplicationError.fromDomain(saved.error));
      }

      // 6. Return DTO (prefer persisted identity + runner extras)
      return ok(
        simRunToDto(saved.value, {
          samples: runnerResult.samples,
          moduleOutputs: runnerResult.moduleOutputs,
        })
      );
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}
