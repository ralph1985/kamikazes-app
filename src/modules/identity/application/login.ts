import {
  assertPasswordNotEmpty,
  IdentityError,
  MAX_FAILED_LOGIN_ATTEMPTS,
  normalizeUsername,
  sessionExpiresAt,
} from "../domain/identity";
import type {
  AccountRepository,
  Clock,
  IdentityAuditWriter,
  PasswordHasher,
  Session,
  SessionIssuer,
} from "./ports";

type LoginDependencies = {
  accounts: AccountRepository;
  passwords: PasswordHasher;
  sessions: SessionIssuer;
  clock: Clock;
  audit?: IdentityAuditWriter;
};

export type LoginResult = {
  memberId: string;
  mustChangePassword: boolean;
  session: Session;
};

export async function login(
  input: { username: string; password: string },
  dependencies: LoginDependencies,
): Promise<LoginResult> {
  const username = normalizeUsername(input.username);
  assertPasswordNotEmpty(input.password);
  const account = await dependencies.accounts.findByUsername(username);

  if (!account) {
    throw new IdentityError("invalid_credentials");
  }

  if (!account.isActive) {
    await dependencies.audit?.record({ memberId: account.memberId, action: "account_inactive" });
    throw new IdentityError("account_inactive");
  }

  if (account.lockedAt) {
    throw new IdentityError("account_locked");
  }

  const validPassword = await dependencies.passwords.verify(account.passwordHash, input.password);
  if (!validPassword) {
    const failedAttempts = account.failedLoginAttempts + 1;
    const lockedAt = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? dependencies.clock.now() : null;
    await dependencies.accounts.recordFailedLogin(account, lockedAt);

    if (lockedAt) {
      await dependencies.audit?.record({ memberId: account.memberId, action: "login_locked" });
      throw new IdentityError("account_locked");
    }

    throw new IdentityError("invalid_credentials");
  }

  await dependencies.accounts.resetFailedLogins(account);
  const now = dependencies.clock.now();
  const session = await dependencies.sessions.issue(account.memberId, now, sessionExpiresAt(now));

  return { memberId: account.memberId, mustChangePassword: account.mustChangePassword, session };
}
