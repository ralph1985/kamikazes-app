import { assertPasswordNotEmpty, sessionExpiresAt } from "../domain/identity";
import type { Clock, PasswordChangeWriter, PasswordHasher, Session } from "./ports";
import { hashSessionToken } from "./session";

export async function changePassword(
  input: { memberId: string; currentToken: string; newPassword: string },
  dependencies: { passwords: PasswordHasher; writer: PasswordChangeWriter; clock: Clock },
): Promise<Session> {
  assertPasswordNotEmpty(input.newPassword);
  const now = dependencies.clock.now();
  const passwordHash = await dependencies.passwords.hash(input.newPassword);

  return dependencies.writer.changePasswordAndRotateSession({
    memberId: input.memberId,
    currentTokenHash: hashSessionToken(input.currentToken),
    passwordHash,
    now,
    expiresAt: sessionExpiresAt(now),
  });
}
