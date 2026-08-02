import { createHash } from "node:crypto";
import { IdentityError } from "../domain/identity";
import type { AuthenticatedMember, Clock, SessionReader } from "./ports";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateSession(
  token: string | undefined,
  dependencies: { sessions: SessionReader; clock: Clock },
): Promise<AuthenticatedMember> {
  if (!token) {
    throw new IdentityError("invalid_credentials", "La sesión no es válida");
  }

  const member = await dependencies.sessions.findActiveMemberByTokenHash(
    hashSessionToken(token),
    dependencies.clock.now(),
  );
  if (!member) {
    throw new IdentityError("invalid_credentials", "La sesión no es válida");
  }

  return member;
}
