/**
 * Composition root — single place to wire ports & use cases.
 * Features receive use cases via React context; never PocketBase SDK.
 *
 * Dual-mode:
 * - memory (default): offline guest + in-memory repos + seed design
 * - pocketbase: real auth/repos via @orbitlab/infrastructure
 */

import {
  ListDesignsUseCase,
  RunSimulationUseCase,
  SaveDesignUseCase,
} from "@orbitlab/application";
import {
  RocketComponent,
  RocketDesign,
  User,
  type AuthPort,
  type DesignRepository,
  type SimRunRepository,
} from "@orbitlab/domain";
import {
  CryptoIdGenerator,
  PocketBaseAuthAdapter,
  PocketBaseDesignRepository,
  PocketBaseSimRunRepository,
  SystemClock as InfraSystemClock,
  createPocketBaseClient,
} from "@orbitlab/infrastructure";
import { DEFAULT_FREE_MODULE_IDS } from "@orbitlab/sim-core";

import { PlanBasedEntitlements } from "../adapters/entitlements/PlanBasedEntitlements";
import { FreeModuleTierLookup } from "../adapters/in-memory/FreeModuleTierLookup";
import { FreePlanEntitlements } from "../adapters/in-memory/FreePlanEntitlements";
import { GuestAuthAdapter } from "../adapters/in-memory/GuestAuthAdapter";
import { InMemoryDesignRepository } from "../adapters/in-memory/InMemoryDesignRepository";
import { InMemorySimRunRepository } from "../adapters/in-memory/InMemorySimRunRepository";
import { LocalIdGenerator } from "../adapters/in-memory/LocalIdGenerator";
import { SystemClock as LocalSystemClock } from "../adapters/in-memory/SystemClock";
import { LocalSimulationRunner } from "../adapters/local-sim/LocalSimulationRunner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataBackend = "memory" | "pocketbase";

export interface CreateContainerOptions {
  /** Override env; defaults to VITE_DATA_BACKEND or `memory`. */
  backend?: DataBackend;
  /** PocketBase base URL; defaults to VITE_POCKETBASE_URL or local 8090. */
  pbUrl?: string;
}

export interface ContainerHealth {
  ok: boolean;
  message?: string;
}

export interface AppContainer {
  backend: DataBackend;
  pbUrl?: string;
  modeLabel: "MEMORY" | "POCKETBASE";
  /** Guest user in memory mode; null-ish until signed in for PocketBase. */
  guestUser: User | null;
  auth: AuthPort;
  designRepository: DesignRepository;
  simulationRunner: LocalSimulationRunner;
  saveDesign: SaveDesignUseCase;
  listDesigns: ListDesignsUseCase;
  runSimulation: RunSimulationUseCase;
  defaultModuleIds: readonly string[];
  health: ContainerHealth;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const DEFAULT_PB_URL = "http://127.0.0.1:8090";
const GUEST_OWNER_ID = "guest_local";

function readEnvBackend(): DataBackend {
  const raw = String(import.meta.env.VITE_DATA_BACKEND ?? "memory")
    .trim()
    .toLowerCase();
  return raw === "pocketbase" ? "pocketbase" : "memory";
}

function readEnvPbUrl(): string {
  const raw = import.meta.env.VITE_POCKETBASE_URL;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return DEFAULT_PB_URL;
}

// ---------------------------------------------------------------------------
// Seed (memory only)
// ---------------------------------------------------------------------------

function buildGuestUser(): User {
  return User.create({
    id: GUEST_OWNER_ID,
    email: "guest@orbitlab.local",
    plan: "free",
    eduVerified: false,
  });
}

function buildSeedDesign(ownerId: string): RocketDesign {
  return RocketDesign.create({
    id: "demo_model_a",
    ownerId,
    title: "Demo Model A",
    components: [
      RocketComponent.create({
        id: "nose-cone",
        type: "nose",
        name: "Nose cone",
        params: {},
      }),
      RocketComponent.create({
        id: "body-tube",
        type: "body",
        name: "Body tube",
        params: {},
      }),
      RocketComponent.create({
        id: "fins",
        type: "fin",
        name: "Fins",
        params: {},
      }),
      RocketComponent.create({
        id: "motor-mount",
        type: "motor",
        name: "Motor mount",
        params: {},
      }),
      RocketComponent.create({
        id: "parachute",
        type: "recovery",
        name: "Parachute",
        params: {},
      }),
    ],
    metadata: {
      massKg: 0.45,
      thrustN: 18,
      burnTimeS: 1.2,
      cd: 0.5,
      areaM2: 0.01,
    },
  });
}

// ---------------------------------------------------------------------------
// Wire use cases (shared by both backends)
// ---------------------------------------------------------------------------

function wireUseCases(deps: {
  designs: DesignRepository;
  simRuns: SimRunRepository;
  auth: AuthPort;
  ids: { nextId(): string };
  clock: { now(): Date };
  entitlements: FreePlanEntitlements | PlanBasedEntitlements;
  moduleTiers: FreeModuleTierLookup;
  runner: LocalSimulationRunner;
}): Pick<AppContainer, "saveDesign" | "listDesigns" | "runSimulation"> {
  const saveDesign = new SaveDesignUseCase({
    designs: deps.designs,
    auth: deps.auth,
    ids: deps.ids,
    clock: deps.clock,
  });

  const listDesigns = new ListDesignsUseCase({
    designs: deps.designs,
    auth: deps.auth,
  });

  const runSimulation = new RunSimulationUseCase({
    designs: deps.designs,
    simRuns: deps.simRuns,
    auth: deps.auth,
    runner: deps.runner,
    entitlements: deps.entitlements,
    moduleTiers: deps.moduleTiers,
    ids: deps.ids,
    clock: deps.clock,
  });

  return { saveDesign, listDesigns, runSimulation };
}

// ---------------------------------------------------------------------------
// Memory path
// ---------------------------------------------------------------------------

export function createMemoryContainer(): AppContainer {
  const guestUser = buildGuestUser();
  const seedDesign = buildSeedDesign(guestUser.id);

  const designRepository = new InMemoryDesignRepository([seedDesign]);
  const simRunRepository = new InMemorySimRunRepository();
  const auth = new GuestAuthAdapter(guestUser);
  const ids = new LocalIdGenerator();
  const clock = new LocalSystemClock();
  const entitlements = new FreePlanEntitlements();
  const moduleTiers = new FreeModuleTierLookup();
  const simulationRunner = new LocalSimulationRunner();

  const useCases = wireUseCases({
    designs: designRepository,
    simRuns: simRunRepository,
    auth,
    ids,
    clock,
    entitlements,
    moduleTiers,
    runner: simulationRunner,
  });

  return {
    backend: "memory",
    modeLabel: "MEMORY",
    guestUser,
    auth,
    designRepository,
    simulationRunner,
    ...useCases,
    defaultModuleIds: DEFAULT_FREE_MODULE_IDS,
    health: { ok: true },
  };
}

// ---------------------------------------------------------------------------
// PocketBase path
// ---------------------------------------------------------------------------

async function checkPocketBaseHealth(
  pbUrl: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = pbUrl.replace(/\/$/, "");
  const healthUrl = `${base}/api/health`;
  try {
    const res = await fetch(healthUrl, {
      method: "GET",
      // health is public; no credentials needed
    });
    if (!res.ok) {
      return {
        ok: false,
        message:
          `PocketBase health check failed (${res.status}) at ${healthUrl}. ` +
          `Run: pnpm pb:serve`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        `Cannot reach PocketBase at ${base}. ` +
        `The server is not running or the URL is wrong.\n\n` +
        `Fix:\n` +
        `1) cd orbitlab && pnpm pb:download && pnpm pb:serve\n` +
        `2) Open ${healthUrl} — should return JSON\n` +
        `3) Or use offline mode: VITE_DATA_BACKEND=memory in apps/web/.env`,
    };
  }
}

export async function createPocketBaseContainer(
  pbUrl: string = DEFAULT_PB_URL
): Promise<AppContainer> {
  const health = await checkPocketBaseHealth(pbUrl);
  if (!health.ok) {
    // Fail boot with a clear banner (providers.tsx) instead of a cryptic signup error later
    throw new Error(health.message);
  }

  let pb;
  try {
    pb = await createPocketBaseClient(pbUrl);
  } catch (cause) {
    const detail =
      cause instanceof Error ? cause.message : "Unknown PocketBase init error";
    throw new Error(
      `Failed to initialize PocketBase client at ${pbUrl}. ` +
        `Is the "pocketbase" package installed and the URL correct? ${detail}`,
      { cause }
    );
  }

  const auth = new PocketBaseAuthAdapter(pb);
  const designRepository = new PocketBaseDesignRepository(pb);
  const simRunRepository = new PocketBaseSimRunRepository(pb, () => {
    const record = pb.authStore.record;
    if (!pb.authStore.isValid || !record) return null;
    return String(record.id);
  });
  const ids = new CryptoIdGenerator();
  const clock = new InfraSystemClock();
  const entitlements = new PlanBasedEntitlements();
  // Registry-backed lookup already maps free/pro module tiers from sim-core
  const moduleTiers = new FreeModuleTierLookup();
  const simulationRunner = new LocalSimulationRunner();

  const useCases = wireUseCases({
    designs: designRepository,
    simRuns: simRunRepository,
    auth,
    ids,
    clock,
    entitlements,
    moduleTiers,
    runner: simulationRunner,
  });

  return {
    backend: "pocketbase",
    pbUrl,
    modeLabel: "POCKETBASE",
    guestUser: null,
    auth,
    designRepository,
    simulationRunner,
    ...useCases,
    defaultModuleIds: DEFAULT_FREE_MODULE_IDS,
    health: { ok: true, message: `Connected to ${pbUrl}` },
  };
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Build the app composition root.
 *
 * Defaults:
 * - backend: `import.meta.env.VITE_DATA_BACKEND` → `memory`
 * - pbUrl: `import.meta.env.VITE_POCKETBASE_URL` → `http://127.0.0.1:8090`
 */
export async function createContainer(
  options: CreateContainerOptions = {}
): Promise<AppContainer> {
  const backend = options.backend ?? readEnvBackend();

  if (backend === "pocketbase") {
    const pbUrl = options.pbUrl ?? readEnvPbUrl();
    return createPocketBaseContainer(pbUrl);
  }

  return createMemoryContainer();
}
