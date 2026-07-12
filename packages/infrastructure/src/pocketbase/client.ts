import type { PbLike } from "../types/pb-like.js";

export type CreatePocketBaseClientOptions = {
  /**
   * When true (default), attempt dynamic import of the `pocketbase` package.
   * Set false to only accept an injected client (tests / custom adapters).
   */
  tryLoadSdk?: boolean;
};

/**
 * Create a PocketBase client against the given base URL.
 *
 * Uses optional peer dependency `pocketbase`. If the package is not installed,
 * throws a descriptive error — inject a {@link PbLike} client into repositories instead.
 *
 * @example
 * ```ts
 * const pb = await createPocketBaseClient(import.meta.env.VITE_POCKETBASE_URL);
 * ```
 */
export async function createPocketBaseClient(
  url: string,
  options: CreatePocketBaseClientOptions = {}
): Promise<PbLike> {
  const tryLoadSdk = options.tryLoadSdk ?? true;
  if (!tryLoadSdk) {
    throw new Error(
      "createPocketBaseClient: tryLoadSdk=false requires providing a PbLike client elsewhere"
    );
  }

  try {
    // Dynamic import keeps pocketbase optional at install / tree-shake time.
    const mod = await import("pocketbase");
    const PocketBaseCtor =
      (mod as { default?: new (baseUrl: string) => PbLike }).default ??
      (mod as unknown as new (baseUrl: string) => PbLike);
    return new PocketBaseCtor(url) as PbLike;
  } catch (cause) {
    const message =
      'PocketBase SDK is not available. Install peer dependency "pocketbase" ' +
      "or construct repositories with a PbLike-compatible client.";
    throw new Error(message, { cause });
  }
}

/**
 * Synchronous factory when the SDK is already loaded by the host app.
 * Prefer this from the composition root after a static import of `pocketbase`.
 */
export function wrapPocketBaseClient(client: PbLike): PbLike {
  return client;
}
