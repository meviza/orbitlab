/**
 * Composition root — single place to wire ports & use cases.
 * Features receive use cases via React context; never PocketBase SDK.
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
} from "@orbitlab/domain";
import { DEFAULT_FREE_MODULE_IDS } from "@orbitlab/sim-core";

import { FreeModuleTierLookup } from "../adapters/in-memory/FreeModuleTierLookup";
import { FreePlanEntitlements } from "../adapters/in-memory/FreePlanEntitlements";
import { GuestAuthAdapter } from "../adapters/in-memory/GuestAuthAdapter";
import { InMemoryDesignRepository } from "../adapters/in-memory/InMemoryDesignRepository";
import { InMemorySimRunRepository } from "../adapters/in-memory/InMemorySimRunRepository";
import { LocalIdGenerator } from "../adapters/in-memory/LocalIdGenerator";
import { SystemClock } from "../adapters/in-memory/SystemClock";
import { LocalSimulationRunner } from "../adapters/local-sim/LocalSimulationRunner";

const GUEST_OWNER_ID = "guest_local";

const guestUser = User.create({
  id: GUEST_OWNER_ID,
  email: "guest@orbitlab.local",
  plan: "free",
  eduVerified: false,
});

const seedDesign = RocketDesign.create({
  id: "demo_model_a",
  ownerId: GUEST_OWNER_ID,
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

const designRepository = new InMemoryDesignRepository([seedDesign]);
const simRunRepository = new InMemorySimRunRepository();
const auth = new GuestAuthAdapter(guestUser);
const ids = new LocalIdGenerator();
const clock = new SystemClock();
const entitlements = new FreePlanEntitlements();
const moduleTiers = new FreeModuleTierLookup();
const simulationRunner = new LocalSimulationRunner();

const saveDesign = new SaveDesignUseCase({
  designs: designRepository,
  auth,
  ids,
  clock,
});

const listDesigns = new ListDesignsUseCase({
  designs: designRepository,
  auth,
});

const runSimulation = new RunSimulationUseCase({
  designs: designRepository,
  simRuns: simRunRepository,
  auth,
  runner: simulationRunner,
  entitlements,
  moduleTiers,
  ids,
  clock,
});

export interface AppContainer {
  guestUser: User;
  designRepository: InMemoryDesignRepository;
  simulationRunner: LocalSimulationRunner;
  saveDesign: SaveDesignUseCase;
  listDesigns: ListDesignsUseCase;
  runSimulation: RunSimulationUseCase;
  defaultModuleIds: readonly string[];
}

export function createContainer(): AppContainer {
  return {
    guestUser,
    designRepository,
    simulationRunner,
    saveDesign,
    listDesigns,
    runSimulation,
    defaultModuleIds: DEFAULT_FREE_MODULE_IDS,
  };
}

/** Singleton composition root for the SPA lifetime */
export const container = createContainer();
