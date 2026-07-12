import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // sim-core package.json points at dist; alias source for monorepo HMR
      "@orbitlab/sim-core": path.resolve(
        rootDir,
        "../../packages/sim-core/src/index.ts"
      ),
      "@orbitlab/domain": path.resolve(
        rootDir,
        "../../packages/domain/src/index.ts"
      ),
      "@orbitlab/application": path.resolve(
        rootDir,
        "../../packages/application/src/index.ts"
      ),
      "@orbitlab/infrastructure": path.resolve(
        rootDir,
        "../../packages/infrastructure/src/index.ts"
      ),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
