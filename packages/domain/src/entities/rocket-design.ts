import { DomainError } from "../shared/errors.js";
import {
  RocketComponent,
  type RocketComponentProps,
} from "./rocket-component.js";

export interface RocketDesignProps {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly components: readonly RocketComponent[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateRocketDesignInput {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly components?: readonly (RocketComponent | RocketComponentProps)[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class RocketDesign {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly components: readonly RocketComponent[];
  readonly metadata: Readonly<Record<string, unknown>>;

  private constructor(props: RocketDesignProps) {
    this.id = props.id;
    this.ownerId = props.ownerId;
    this.title = props.title;
    this.components = Object.freeze([...props.components]);
    this.metadata = Object.freeze({ ...props.metadata });
  }

  static create(input: CreateRocketDesignInput): RocketDesign {
    if (!input.id?.trim()) {
      throw DomainError.validation("Design id is required");
    }
    if (!input.ownerId?.trim()) {
      throw DomainError.validation("Design ownerId is required");
    }
    const title = input.title?.trim() ?? "";
    if (!title) {
      throw DomainError.validation("Design title must be non-empty");
    }

    const components = (input.components ?? []).map((c) =>
      c instanceof RocketComponent ? c : RocketComponent.create(c)
    );

    return new RocketDesign({
      id: input.id.trim(),
      ownerId: input.ownerId.trim(),
      title,
      components,
      metadata: input.metadata ?? {},
    });
  }

  rename(title: string): RocketDesign {
    return RocketDesign.create({
      id: this.id,
      ownerId: this.ownerId,
      title,
      components: this.components,
      metadata: this.metadata,
    });
  }

  withComponents(components: readonly RocketComponent[]): RocketDesign {
    return RocketDesign.create({
      id: this.id,
      ownerId: this.ownerId,
      title: this.title,
      components,
      metadata: this.metadata,
    });
  }

  addComponent(component: RocketComponent): RocketDesign {
    if (this.components.some((c) => c.id === component.id)) {
      throw DomainError.validation(
        `Component already exists on design: ${component.id}`
      );
    }
    return this.withComponents([...this.components, component]);
  }

  removeComponent(componentId: string): RocketDesign {
    return this.withComponents(
      this.components.filter((c) => c.id !== componentId)
    );
  }

  withMetadata(metadata: Readonly<Record<string, unknown>>): RocketDesign {
    return RocketDesign.create({
      id: this.id,
      ownerId: this.ownerId,
      title: this.title,
      components: this.components,
      metadata,
    });
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }
}
