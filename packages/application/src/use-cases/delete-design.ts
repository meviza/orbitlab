import {
  type DesignRepository,
  type AuthPort,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";
import { ApplicationError } from "../errors/application-error.js";

export interface DeleteDesignDeps {
  readonly designs: DesignRepository;
  readonly auth: AuthPort;
}

export interface DeleteDesignCommand {
  readonly designId: string;
}

/**
 * Delete a design owned by the current user.
 */
export class DeleteDesignUseCase {
  constructor(private readonly deps: DeleteDesignDeps) {}

  async execute(
    command: DeleteDesignCommand
  ): Promise<Result<void, ApplicationError>> {
    try {
      const designId = command.designId?.trim();
      if (!designId) {
        return err(ApplicationError.validation("designId is required"));
      }

      const userResult = await this.deps.auth.currentUser();
      if (!userResult.ok) {
        return err(ApplicationError.fromDomain(userResult.error));
      }
      const user = userResult.value;
      if (!user) {
        return err(ApplicationError.unauthorized());
      }

      const found = await this.deps.designs.findById(designId);
      if (!found.ok) {
        return err(ApplicationError.fromDomain(found.error));
      }
      if (!found.value) {
        return err(ApplicationError.notFound("Design", designId));
      }
      if (!found.value.isOwnedBy(user.id)) {
        return err(ApplicationError.forbidden("Not the design owner"));
      }

      const deleted = await this.deps.designs.delete(designId);
      if (!deleted.ok) {
        return err(ApplicationError.fromDomain(deleted.error));
      }

      return ok(undefined);
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}
