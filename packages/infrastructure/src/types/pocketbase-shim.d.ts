/**
 * Ambient module so dynamic import("pocketbase") typechecks
 * when the optional peer is not installed in this package.
 */
declare module "pocketbase" {
  export default class PocketBase {
    constructor(baseUrl?: string);
    readonly baseUrl: string;
    readonly authStore: {
      readonly token: string;
      readonly record: Record<string, unknown> | null;
      readonly isValid: boolean;
      clear(): void;
      save(token: string, record: Record<string, unknown>): void;
    };
    collection(name: string): {
      getOne(id: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
      getList(
        page?: number,
        perPage?: number,
        options?: Record<string, unknown>
      ): Promise<{
        page: number;
        perPage: number;
        totalItems: number;
        totalPages: number;
        items: Record<string, unknown>[];
      }>;
      getFullList(options?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      create(
        body: Record<string, unknown>,
        options?: Record<string, unknown>
      ): Promise<Record<string, unknown>>;
      update(
        id: string,
        body: Record<string, unknown>,
        options?: Record<string, unknown>
      ): Promise<Record<string, unknown>>;
      delete(id: string, options?: Record<string, unknown>): Promise<boolean>;
      authWithPassword(
        email: string,
        password: string,
        options?: Record<string, unknown>
      ): Promise<{ token: string; record: Record<string, unknown> }>;
      authRefresh(
        options?: Record<string, unknown>
      ): Promise<{ token: string; record: Record<string, unknown> }>;
    };
    files: {
      getUrl(
        record: { id: string; collectionId?: string; collectionName?: string },
        filename: string,
        queryParams?: Record<string, unknown>
      ): string;
    };
  }
}
