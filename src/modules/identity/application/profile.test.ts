import { describe, expect, it } from "vitest";
import { readProfile, updateProfile } from "./profile";
import type { MemberProfile, ProfileReader, ProfileWriter } from "./ports";

const profile: MemberProfile = {
  memberId: "123e4567-e89b-12d3-a456-426614174000",
  displayName: "José",
  username: "jose",
};

describe("perfil de identidad", () => {
  it("lee el perfil mediante su puerto", async () => {
    const profiles: ProfileReader = { findByMemberId: async () => profile };
    await expect(readProfile(profile.memberId, { profiles })).resolves.toEqual(profile);
  });

  it("normaliza usuario y conserva los valores anteriores para auditar", async () => {
    let received: Parameters<ProfileWriter["update"]>[0] | undefined;
    const profiles: ProfileReader = { findByMemberId: async () => profile };
    const writer: ProfileWriter = {
      update: async (input) => {
        received = input;
        return { ...profile, displayName: input.displayName, username: input.username };
      },
    };

    await updateProfile(
      { memberId: profile.memberId, displayName: "  José María ", username: " José María " },
      { profiles, writer, clock: { now: () => new Date("2026-08-04T10:00:00.000Z") } },
    );

    expect(received).toMatchObject({
      displayName: "José María",
      username: "josemaria",
      before: profile,
    });
  });
});
