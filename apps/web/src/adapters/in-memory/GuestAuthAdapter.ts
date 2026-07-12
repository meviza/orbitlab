import {
  type AuthPort,
  type SignInCredentials,
  type SignUpCredentials,
  type User,
  DomainError,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";

/**
 * Always-signed-in guest for offline demo.
 * Replace with PocketBase AuthPort in di.ts later.
 */
export class GuestAuthAdapter implements AuthPort {
  constructor(private readonly guest: User) {}

  async currentUser(): Promise<Result<User | null, DomainError>> {
    return ok(this.guest);
  }

  async signIn(
    _credentials: SignInCredentials
  ): Promise<Result<User, DomainError>> {
    return ok(this.guest);
  }

  async signUp(
    _credentials: SignUpCredentials
  ): Promise<Result<User, DomainError>> {
    return ok(this.guest);
  }

  async signOut(): Promise<Result<void, DomainError>> {
    return err(
      DomainError.forbidden("Guest session cannot sign out in offline demo")
    );
  }
}
