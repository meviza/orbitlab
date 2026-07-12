import type { CalcModule, ModuleTier } from './module.js';

/**
 * Registry of calculation modules (Strategy instances keyed by id).
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, CalcModule>();

  register(module: CalcModule): this {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
    return this;
  }

  get(id: string): CalcModule | undefined {
    return this.modules.get(id);
  }

  /** Throws if the module id is unknown. */
  require(id: string): CalcModule {
    const mod = this.modules.get(id);
    if (!mod) {
      throw new Error(`Unknown module: ${id}`);
    }
    return mod;
  }

  list(): CalcModule[] {
    return [...this.modules.values()];
  }

  listByTier(tier: ModuleTier): CalcModule[] {
    return this.list().filter((m) => m.tier === tier);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get size(): number {
    return this.modules.size;
  }
}
