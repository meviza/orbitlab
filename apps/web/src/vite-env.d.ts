/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Data composition backend.
   * - `memory` (default): in-memory guest + seed design, offline
   * - `pocketbase`: PocketBase auth + repositories via infrastructure adapters
   */
  readonly VITE_DATA_BACKEND?: "memory" | "pocketbase" | string;
  /** PocketBase base URL when VITE_DATA_BACKEND=pocketbase. Default: http://127.0.0.1:8090 */
  readonly VITE_POCKETBASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
