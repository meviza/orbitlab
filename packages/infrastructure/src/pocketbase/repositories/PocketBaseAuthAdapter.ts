import {
  DomainError,
  err,
  ok,
  type AuthPort,
  type Result,
  type SignInCredentials,
  type SignUpCredentials,
  type User,
} from "@orbitlab/domain";
import type { PbLike } from "../../types/pb-like.js";
import { toUser } from "../mappers/userMapper.js";

const USERS = "users";

/**
 * PocketBase auth adapter implementing domain {@link AuthPort}.
 */
export class PocketBaseAuthAdapter implements AuthPort {
  constructor(private readonly pb: PbLike) {}

  async currentUser(): Promise<Result<User | null, DomainError>> {
    try {
      const record = this.pb.authStore.record;
      if (!this.pb.authStore.isValid || !record) {
        return ok(null);
      }
      return ok(toUser(record));
    } catch (e) {
      return err(mapAuthError(e));
    }
  }

  async signIn(
    credentials: SignInCredentials
  ): Promise<Result<User, DomainError>> {
    try {
      const result = await this.pb
        .collection(USERS)
        .authWithPassword(credentials.email, credentials.password);
      return ok(toUser(result.record));
    } catch (e) {
      const mapped = mapAuthError(e);
      // Wrong password vs server down: keep unauthorized only for real 400/401
      if (mapped.code === "UNAUTHORIZED" || isCredentialFailure(e)) {
        return err(DomainError.unauthorized(mapped.message));
      }
      return err(mapped);
    }
  }

  async signUp(
    credentials: SignUpCredentials
  ): Promise<Result<User, DomainError>> {
    try {
      await this.pb.collection(USERS).create({
        email: credentials.email,
        password: credentials.password,
        passwordConfirm: credentials.password,
        display_name:
          credentials.displayName ??
          credentials.email.split("@")[0] ??
          "pilot",
        plan: "free",
        edu_verified: false,
      });
      return this.signIn({
        email: credentials.email,
        password: credentials.password,
      });
    } catch (e) {
      return err(mapAuthError(e));
    }
  }

  async signOut(): Promise<Result<void, DomainError>> {
    try {
      this.pb.authStore.clear();
      return ok(undefined);
    } catch (e) {
      return err(mapAuthError(e));
    }
  }
}

/** PocketBase ClientResponseError-shaped object (SDK versions differ). */
type PbClientError = {
  status?: number;
  message?: string;
  data?: {
    message?: string;
    data?: Record<string, { message?: string; code?: string }>;
  };
  originalError?: unknown;
  isAbort?: boolean;
};

function asPbError(e: unknown): PbClientError | null {
  if (!e || typeof e !== "object") return null;
  return e as PbClientError;
}

function isCredentialFailure(e: unknown): boolean {
  const pb = asPbError(e);
  return pb?.status === 400 || pb?.status === 401;
}

/**
 * Turn opaque PocketBase SDK errors into actionable DomainErrors.
 * Status 0 / "Something went wrong…" almost always means network / PB down.
 */
function mapAuthError(e: unknown): DomainError {
  if (e instanceof DomainError) return e;

  const pb = asPbError(e);
  const status = pb?.status;
  const rawMessage =
    (typeof pb?.message === "string" && pb.message) ||
    (e instanceof Error ? e.message : "Auth operation failed");

  // SDK default when fetch fails (server down, CORS, wrong URL)
  if (
    status === 0 ||
    (status === undefined &&
      /something went wrong while processing your request/i.test(rawMessage))
  ) {
    return DomainError.validation(
      "Cannot reach PocketBase (network error). " +
        "Start it with `pnpm pb:serve` and open http://127.0.0.1:8090/api/health — " +
        "or set VITE_DATA_BACKEND=memory for offline guest mode."
    );
  }

  // Field-level validation (email taken, weak password, etc.)
  const fieldData = pb?.data?.data;
  if (fieldData && typeof fieldData === "object") {
    const parts = Object.entries(fieldData)
      .map(([field, info]) => {
        const msg =
          info && typeof info === "object" && "message" in info
            ? String(info.message)
            : "invalid";
        return `${field}: ${msg}`;
      })
      .filter(Boolean);
    if (parts.length > 0) {
      return DomainError.validation(parts.join("; "));
    }
  }

  const apiMessage =
    (typeof pb?.data?.message === "string" && pb.data.message) || rawMessage;

  if (status === 400 || status === 403) {
    return DomainError.validation(apiMessage);
  }
  if (status === 401) {
    return DomainError.unauthorized(apiMessage);
  }

  return DomainError.validation(apiMessage);
}
