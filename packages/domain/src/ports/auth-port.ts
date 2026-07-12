import type { User } from "../entities/user.js";
import type { DomainError } from "../shared/errors.js";
import type { Result } from "../shared/result.js";

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SignUpCredentials {
  readonly email: string;
  readonly password: string;
  readonly displayName?: string;
}

export interface AuthPort {
  /** Currently authenticated user, or null if anonymous. */
  currentUser(): Promise<Result<User | null, DomainError>>;
  signIn(credentials: SignInCredentials): Promise<Result<User, DomainError>>;
  signUp(credentials: SignUpCredentials): Promise<Result<User, DomainError>>;
  signOut(): Promise<Result<void, DomainError>>;
}
