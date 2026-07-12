import { DomainError } from "../shared/errors.js";

/** Known component categories used by the design editor. */
export type RocketComponentType =
  | "nose"
  | "body"
  | "fin"
  | "motor"
  | "recovery"
  | "payload"
  | "other";

export interface RocketComponentProps {
  readonly id: string;
  readonly type: RocketComponentType | string;
  readonly name: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export class RocketComponent {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly params: Readonly<Record<string, unknown>>;

  private constructor(props: RocketComponentProps) {
    this.id = props.id;
    this.type = props.type;
    this.name = props.name;
    this.params = Object.freeze({ ...props.params });
  }

  static create(props: RocketComponentProps): RocketComponent {
    if (!props.id?.trim()) {
      throw DomainError.validation("Component id is required");
    }
    if (!props.type?.trim()) {
      throw DomainError.validation("Component type is required", {
        id: props.id,
      });
    }
    if (!props.name?.trim()) {
      throw DomainError.validation("Component name is required", {
        id: props.id,
      });
    }
    if (props.params == null || typeof props.params !== "object") {
      throw DomainError.validation("Component params must be an object", {
        id: props.id,
      });
    }

    return new RocketComponent({
      id: props.id.trim(),
      type: props.type.trim(),
      name: props.name.trim(),
      params: props.params,
    });
  }

  withParams(params: Readonly<Record<string, unknown>>): RocketComponent {
    return RocketComponent.create({
      id: this.id,
      type: this.type,
      name: this.name,
      params,
    });
  }

  withName(name: string): RocketComponent {
    return RocketComponent.create({
      id: this.id,
      type: this.type,
      name,
      params: this.params,
    });
  }
}
