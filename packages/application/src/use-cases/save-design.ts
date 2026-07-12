import {
  RocketDesign,
  RocketComponent,
  type DesignRepository,
  type AuthPort,
  type IdGeneratorPort,
  type ClockPort,
  ok,
  err,
  type Result,
  DomainError,
} from "@orbitlab/domain";
import {
  designToDto,
  type DesignDto,
  type SaveDesignCommand,
} from "../dto/design-dto.js";
import { ApplicationError } from "../errors/application-error.js";

export interface SaveDesignDeps {
  readonly designs: DesignRepository;
  readonly auth: AuthPort;
  readonly ids: IdGeneratorPort;
  /** Reserved for future audit timestamps; not stored on entity yet. */
  readonly clock?: ClockPort;
}

/**
 * Create or update a rocket design owned by the current user.
 */
export class SaveDesignUseCase {
  constructor(private readonly deps: SaveDesignDeps) {}

  async execute(
    command: SaveDesignCommand
  ): Promise<Result<DesignDto, ApplicationError>> {
    try {
      const userResult = await this.deps.auth.currentUser();
      if (!userResult.ok) {
        return err(ApplicationError.fromDomain(userResult.error));
      }
      const user = userResult.value;
      if (!user) {
        return err(ApplicationError.unauthorized());
      }

      const title = command.title?.trim() ?? "";
      if (!title) {
        return err(ApplicationError.validation("Design title must be non-empty"));
      }

      let designId = command.id?.trim();
      let ownerId = user.id;

      if (designId) {
        const existing = await this.deps.designs.findById(designId);
        if (!existing.ok) {
          return err(ApplicationError.fromDomain(existing.error));
        }
        if (existing.value) {
          if (!existing.value.isOwnedBy(user.id)) {
            return err(ApplicationError.forbidden("Not the design owner"));
          }
          ownerId = existing.value.ownerId;
        }
      } else {
        designId = this.deps.ids.nextId();
      }

      let components: RocketComponent[];
      try {
        components = command.components.map((c) =>
          RocketComponent.create({
            id: c.id,
            type: c.type,
            name: c.name,
            params: c.params ?? {},
          })
        );
      } catch (e) {
        if (e instanceof DomainError) {
          return err(ApplicationError.fromDomain(e));
        }
        return err(ApplicationError.fromUnknown(e));
      }

      let design: RocketDesign;
      try {
        design = RocketDesign.create({
          id: designId,
          ownerId,
          title,
          components,
          metadata: command.metadata ?? {},
        });
      } catch (e) {
        if (e instanceof DomainError) {
          return err(ApplicationError.fromDomain(e));
        }
        return err(ApplicationError.fromUnknown(e));
      }

      const saved = await this.deps.designs.save(design);
      if (!saved.ok) {
        return err(ApplicationError.fromDomain(saved.error));
      }

      return ok(designToDto(saved.value));
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}
