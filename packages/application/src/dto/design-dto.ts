import type { RocketDesign, RocketComponent } from "@orbitlab/domain";

export interface RocketComponentDto {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface DesignDto {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly components: readonly RocketComponentDto[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SaveDesignCommand {
  readonly id?: string;
  readonly title: string;
  readonly components: readonly RocketComponentDto[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function componentToDto(component: RocketComponent): RocketComponentDto {
  return {
    id: component.id,
    type: component.type,
    name: component.name,
    params: { ...component.params },
  };
}

export function designToDto(design: RocketDesign): DesignDto {
  return {
    id: design.id,
    ownerId: design.ownerId,
    title: design.title,
    components: design.components.map(componentToDto),
    metadata: { ...design.metadata },
  };
}
