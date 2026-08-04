import { normalizeUsername } from "../domain/identity";
import type { Clock, ProfileReader, ProfileWriter } from "./ports";

export async function readProfile(memberId: string, dependencies: { profiles: ProfileReader }) {
  return dependencies.profiles.findByMemberId(memberId);
}

export async function updateProfile(
  input: { memberId: string; displayName: string; username: string },
  dependencies: { profiles: ProfileReader; writer: ProfileWriter; clock: Clock },
) {
  const before = await dependencies.profiles.findByMemberId(input.memberId);
  if (!before) throw new Error("member_not_found");

  return dependencies.writer.update({
    memberId: input.memberId,
    displayName: input.displayName.trim(),
    username: normalizeUsername(input.username),
    before,
    now: dependencies.clock.now(),
  });
}
