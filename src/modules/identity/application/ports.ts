import type { IdentityErrorCode } from "../domain/identity";

export type IdentityAccount = {
  accountId: string;
  memberId: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedAt: Date | null;
};

export interface AccountRepository {
  findByUsername(username: string): Promise<IdentityAccount | null>;
  recordFailedLogin(account: IdentityAccount, lockedAt: Date | null): Promise<void>;
  resetFailedLogins(account: IdentityAccount): Promise<void>;
}

export interface PasswordHasher {
  verify(passwordHash: string, password: string): Promise<boolean>;
  hash(password: string): Promise<string>;
}

export type Session = { token: string; expiresAt: Date };

export interface SessionIssuer {
  issue(memberId: string, now: Date, expiresAt: Date): Promise<Session>;
}

export interface IdentityAuditWriter {
  record(event: { memberId: string; action: IdentityErrorCode | "login_locked" }): Promise<void>;
}

export interface Clock {
  now(): Date;
}
