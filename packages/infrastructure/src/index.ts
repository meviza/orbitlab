/**
 * @orbitlab/infrastructure
 *
 * PocketBase adapters implementing @orbitlab/domain ports (Repository, Auth, Files).
 */

export {
  createPocketBaseClient,
  wrapPocketBaseClient,
  type CreatePocketBaseClientOptions,
} from "./pocketbase/client.js";

export {
  designMapper,
  toDesign,
  fromDesign,
  userMapper,
  toUser,
  fromUser,
  simRunMapper,
  toSimRun,
  fromSimRun,
} from "./pocketbase/mappers/index.js";

export {
  PocketBaseDesignRepository,
  PocketBaseSimRunRepository,
  PocketBaseAuthAdapter,
  PocketBaseFileStorage,
  PocketBaseUnitOfWork,
} from "./pocketbase/repositories/index.js";

export { SystemClock } from "./system/SystemClock.js";
export { CryptoIdGenerator } from "./system/CryptoIdGenerator.js";

export type {
  PbLike,
  PbRecord,
  PbAuthStore,
  PbCollectionService,
  PbListResult,
} from "./types/pb-like.js";
