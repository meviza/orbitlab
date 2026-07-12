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
    } catch {
      return err(DomainError.unauthorized("Invalid email or password"));
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

function mapAuthError(e: unknown): DomainError {
  if (e instanceof DomainError) return e;
  const message = e instanceof Error ? e.message : "Auth operation failed";
  return DomainError.validation(message);
}
