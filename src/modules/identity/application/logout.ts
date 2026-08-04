import { hashSessionToken } from "./session";
import type { Clock, SessionRevoker } from "./ports";

export async function logout(
  token: string | undefined,
  dependencies: { sessions: SessionRevoker; clock: Clock },
): Promise<void> {
  if (!token) return;
  await dependencies.sessions.revoke(hashSessionToken(token), dependencies.clock.now());
}

export async function logoutAll(
  memberId: string,
  dependencies: { sessions: SessionRevoker; clock: Clock },
): Promise<void> {
  await dependencies.sessions.revokeAll(memberId, dependencies.clock.now());
}
