/**
 * Minimal PocketBase-compatible client surface used by adapters.
 * Avoids a hard runtime dependency when the `pocketbase` package is absent.
 */

export interface PbListResult<T> {
  readonly page: number;
  readonly perPage: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly items: T[];
}

export interface PbAuthStore {
  readonly token: string;
  readonly record: PbRecord | null;
  readonly isValid: boolean;
  clear(): void;
  save(token: string, record: PbRecord): void;
}

/** Loose record shape returned by the PocketBase REST/SDK layer. */
export type PbRecord = {
  id: string;
  collectionId?: string;
  collectionName?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
};

export interface PbCollectionService {
  getOne(id: string, options?: Record<string, unknown>): Promise<PbRecord>;
  getList(
    page?: number,
    perPage?: number,
    options?: Record<string, unknown>
  ): Promise<PbListResult<PbRecord>>;
  getFullList(options?: Record<string, unknown>): Promise<PbRecord[]>;
  create(
    body: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<PbRecord>;
  update(
    id: string,
    body: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<PbRecord>;
  delete(id: string, options?: Record<string, unknown>): Promise<boolean>;
  authWithPassword(
    email: string,
    password: string,
    options?: Record<string, unknown>
  ): Promise<{ token: string; record: PbRecord }>;
  authRefresh(
    options?: Record<string, unknown>
  ): Promise<{ token: string; record: PbRecord }>;
}

/**
 * Structural client type accepted by all PocketBase adapters.
 * Compatible with the official `pocketbase` JS SDK instance.
 */
export interface PbLike {
  readonly baseUrl: string;
  readonly authStore: PbAuthStore;
  collection(name: string): PbCollectionService;
  files: {
    getUrl(
      record: { id: string; collectionId?: string; collectionName?: string },
      filename: string,
      queryParams?: Record<string, unknown>
    ): string;
  };
}
