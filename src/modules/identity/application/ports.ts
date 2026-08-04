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

export type AuthenticatedMember = {
  memberId: string;
  displayName: string;
  mustChangePassword: boolean;
};

export interface SessionReader {
  findActiveMemberByTokenHash(tokenHash: string, now: Date): Promise<AuthenticatedMember | null>;
}

export interface PasswordChangeWriter {
  changePasswordAndRotateSession(input: {
    memberId: string;
    currentTokenHash: string;
    passwordHash: string;
    now: Date;
    expiresAt: Date;
  }): Promise<Session>;
}

export interface SessionRevoker {
  revoke(tokenHash: string, now: Date): Promise<void>;
  revokeAll(memberId: string, now: Date): Promise<void>;
}

export type MemberProfile = {
  memberId: string;
  displayName: string;
  username: string;
};

export interface ProfileReader {
  findByMemberId(memberId: string): Promise<MemberProfile | null>;
}

export interface ProfileWriter {
  update(input: {
    memberId: string;
    displayName: string;
    username: string;
    before: MemberProfile;
    now: Date;
  }): Promise<MemberProfile>;
}

export interface GlobalAdminReader {
  isGlobalAdmin(memberId: string): Promise<boolean>;
}

export interface IdentityAuditWriter {
  record(event: { memberId: string; action: IdentityErrorCode | "login_locked" }): Promise<void>;
}

export interface Clock {
  now(): Date;
}
