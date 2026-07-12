/**
 * Lightweight Unit of Work placeholder.
 * PocketBase has no multi-collection transactions on free self-host;
 * this documents the extension point for saga/compensating flows later.
 */
export class PocketBaseUnitOfWork {
  private readonly operations: Array<() => Promise<void>> = [];

  register(op: () => Promise<void>): void {
    this.operations.push(op);
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      await op();
    }
    this.operations.length = 0;
  }

  rollback(): void {
    this.operations.length = 0;
  }
}
