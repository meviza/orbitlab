import type { IdGeneratorPort } from "@orbitlab/domain";

export class LocalIdGenerator implements IdGeneratorPort {
  private seq = 0;

  nextId(): string {
    this.seq += 1;
    const rand = Math.random().toString(36).slice(2, 8);
    return `local_${Date.now().toString(36)}_${this.seq}_${rand}`;
  }
}
