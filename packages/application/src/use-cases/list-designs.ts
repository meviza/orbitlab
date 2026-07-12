import {
  type DesignRepository,
  type AuthPort,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";
import { designToDto, type DesignDto } from "../dto/design-dto.js";
import { ApplicationError } from "../errors/application-error.js";

export interface ListDesignsDeps {
  readonly designs: DesignRepository;
  readonly auth: AuthPort;
}

/**
 * List all designs owned by the current user.
 */
export class ListDesignsUseCase {
  constructor(private readonly deps: ListDesignsDeps) {}

  async execute(): Promise<Result<DesignDto[], ApplicationError>> {
    try {
      const userResult = await this.deps.auth.currentUser();
      if (!userResult.ok) {
        return err(ApplicationError.fromDomain(userResult.error));
      }
      const user = userResult.value;
      if (!user) {
        return err(ApplicationError.unauthorized());
      }

      const listed = await this.deps.designs.listByOwner(user.id);
      if (!listed.ok) {
        return err(ApplicationError.fromDomain(listed.error));
      }

      return ok(listed.value.map(designToDto));
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}
