import {
  type DesignRepository,
  type AuthPort,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";
import { designToDto, type DesignDto } from "../dto/design-dto.js";
import { ApplicationError } from "../errors/application-error.js";

export interface GetDesignDeps {
  readonly designs: DesignRepository;
  readonly auth: AuthPort;
}

export interface GetDesignQuery {
  readonly designId: string;
}

/**
 * Load a single design if the current user owns it (or is authenticated for own data).
 */
export class GetDesignUseCase {
  constructor(private readonly deps: GetDesignDeps) {}

  async execute(
    query: GetDesignQuery
  ): Promise<Result<DesignDto, ApplicationError>> {
    try {
      const designId = query.designId?.trim();
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

      return ok(designToDto(found.value));
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}
