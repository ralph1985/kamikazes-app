import { assertPasswordNotEmpty, IdentityError, sessionExpiresAt } from "../domain/identity";
import type { Clock, PasswordChangeWriter, PasswordHasher, PasswordReader, Session } from "./ports";
import { hashSessionToken } from "./session";

export async function changePassword(
  input: {
    memberId: string;
    currentToken: string;
    currentPassword: string;
    newPassword: string;
  },
  dependencies: {
    passwords: PasswordHasher;
    passwordReader: PasswordReader;
    writer: PasswordChangeWriter;
    clock: Clock;
  },
): Promise<Session> {
  assertPasswordNotEmpty(input.currentPassword);
  assertPasswordNotEmpty(input.newPassword);
  const currentPasswordHash = await dependencies.passwordReader.findHashByMemberId(input.memberId);
  if (
    !currentPasswordHash ||
    !(await dependencies.passwords.verify(currentPasswordHash, input.currentPassword))
  ) {
    throw new IdentityError("invalid_password", "La contraseña actual no es válida");
  }
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
