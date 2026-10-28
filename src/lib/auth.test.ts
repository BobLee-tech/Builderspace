import { beforeEach, describe, expect, it, vi } from "vitest";

// The sign-in system end to end, without a browser or a database: cookies are
// an in-memory jar, and "Supabase" is a fake client that records what auth.ts
// asks of it. The database side (RLS, sync_member_email) is checked against
// Postgres when a migration changes.

const jar = new Map<string, string>();
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));

const supabase = vi.hoisted(() => ({
  configured: false,
  client: null as unknown,
}));
vi.mock("./supabase/client", () => ({
  isSupabaseConfigured: () => supabase.configured,
}));
vi.mock("./supabase/server", () => ({
  getSupabaseAuth: async () => supabase.client,
}));

const auth = await import("./auth");

const profile = {
  nickname: "Amy",
  schoolDegree: "UNSW · Bachelor",
  major: "CS",
  skills: ["web"],
  spark: "vivi",
  building: null,
  lookingFor: ["design"],
  channel: null,
  zid: null,
} as unknown as Parameters<typeof auth.createMember>[0];

async function joinAs(email: string) {
  await auth.sendCode(email);
  await auth.verifyCode(email, "123456");
  const made = await auth.createMember(profile);
  if (!made.ok) throw new Error(made.message);
  return made.value;
}

async function member() {
  return (await auth.getSession())?.member ?? null;
}

beforeEach(() => {
  jar.clear();
  supabase.configured = false;
  supabase.client = null;
});

describe("sign in (development, no Supabase)", () => {
  it("any 6-digit code signs in; the card comes after", async () => {
    expect(await auth.getSession()).toBeNull();
    expect(await auth.sendCode("amy@gmail.com")).toEqual({
      ok: true,
      value: undefined,
    });
    const checked = await auth.verifyCode("amy@gmail.com", "000000");
    expect(checked).toEqual({ ok: true, value: { hasCard: false } });
    expect(await auth.getSession()).toEqual({
      email: "amy@gmail.com",
      member: null,
    });
  });

  it("a new card is public and verified only for a school email", async () => {
    const amy = await joinAs("amy@gmail.com");
    expect(amy.isPublic).toBe(true);
    expect(amy.cardOnProjects).toBe(true);
    expect(amy.verified).toBe(false);

    jar.clear();
    const zed = await joinAs("z1234567@ad.unsw.edu.au");
    expect(zed.verified).toBe(true);
    expect(zed.schoolDomain).toBe("ad.unsw.edu.au");
  });

  it("signing in again with the same email keeps the card", async () => {
    await joinAs("amy@gmail.com");
    await auth.verifyCode("amy@gmail.com", "111111");
    expect((await member())?.nickname).toBe("Amy");
  });

  it("a different email starts over", async () => {
    await joinAs("amy@gmail.com");
    const other = await auth.verifyCode("bo@gmail.com", "111111");
    expect(other).toEqual({ ok: true, value: { hasCard: false } });
  });

  it("signing out clears the session", async () => {
    await joinAs("amy@gmail.com");
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });
});

describe("public card switch", () => {
  it("needs a card", async () => {
    expect((await auth.setPublicCard(false)).ok).toBe(false);
  });

  it("turns the card off and on again", async () => {
    await joinAs("amy@gmail.com");
    expect((await auth.setPublicCard(false)).ok).toBe(true);
    expect((await member())?.isPublic).toBe(false);
    await auth.setPublicCard(true);
    expect((await member())?.isPublic).toBe(true);
  });
});

describe("changing the sign-in email (development)", () => {
  it("needs a card", async () => {
    const sent = await auth.requestEmailChange("new@gmail.com");
    expect(sent.ok).toBe(false);
  });

  it("refuses the email you already use", async () => {
    await joinAs("amy@gmail.com");
    const sent = await auth.requestEmailChange("amy@gmail.com");
    expect(sent).toMatchObject({ ok: false });
  });

  it("only confirms the address the code was sent to", async () => {
    await joinAs("amy@gmail.com");
    await auth.requestEmailChange("amy@student.unsw.edu.au");
    const wrong = await auth.confirmEmailChange("other@gmail.com", "123456");
    expect(wrong.ok).toBe(false);
    expect((await auth.getSession())?.email).toBe("amy@gmail.com");
  });

  it("does nothing until the code comes back", async () => {
    await joinAs("amy@gmail.com");
    await auth.requestEmailChange("amy@outlook.com");
    expect((await auth.getSession())?.email).toBe("amy@gmail.com");
  });

  it("a school address brings the seal and its zID", async () => {
    await joinAs("amy@gmail.com");
    await auth.requestEmailChange("z7654321@ad.unsw.edu.au");
    const done = await auth.confirmEmailChange(
      "z7654321@ad.unsw.edu.au",
      "123456",
    );
    expect(done).toEqual({ ok: true, value: "z7654321@ad.unsw.edu.au" });
    const m = await member();
    expect(m).toMatchObject({
      email: "z7654321@ad.unsw.edu.au",
      verified: true,
      schoolDomain: "ad.unsw.edu.au",
      nickname: "Amy",
    });
    expect(await auth.getMyZid()).toBe("z7654321");
  });

  it("moving off a school address keeps the seal", async () => {
    await joinAs("z1234567@ad.unsw.edu.au");
    await auth.requestEmailChange("zed@gmail.com");
    await auth.confirmEmailChange("zed@gmail.com", "123456");
    expect(await member()).toMatchObject({
      email: "zed@gmail.com",
      verified: true,
      schoolDomain: "ad.unsw.edu.au",
    });
  });

  it("stars move with the email", async () => {
    await joinAs("amy@gmail.com");
    expect((await auth.setStar("coursemate", true)).ok).toBe(true);
    await auth.requestEmailChange("amy@outlook.com");
    await auth.confirmEmailChange("amy@outlook.com", "123456");
    expect((await auth.getMyStars()).map((s) => s.slug)).toEqual([
      "coursemate",
    ]);
  });

  it("the new email signs in to the same card", async () => {
    await joinAs("amy@gmail.com");
    await auth.requestEmailChange("amy@outlook.com");
    await auth.confirmEmailChange("amy@outlook.com", "123456");
    const back = await auth.verifyCode("amy@outlook.com", "222222");
    expect(back).toEqual({ ok: true, value: { hasCard: true } });
  });
});

/* ---------- with Supabase: what auth.ts asks of it ---------- */

type Err = { status?: number; code?: string } | null;

function fakeSupabase(email: string) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const result = {
    updateUser: { error: null as Err },
    verifyOtp: {
      data: { user: { email: "new@outlook.com" } as { email: string } | null },
      error: null as Err,
    },
    profileUpdate: { error: null as Err },
  };
  const row = {
    id: "u1",
    member_no: 7,
    handle: "amy",
    nickname: "Amy",
    school_degree: "",
    major: "",
    skills: [],
    spark: "vivi",
    building: null,
    looking_for: [],
    school_domain: null,
    school_verified_at: null,
    is_public: true,
    card_on_projects: true,
  };
  const client = {
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "u1", email } } }),
      updateUser: async (...args: unknown[]) => {
        calls.push({ fn: "updateUser", args });
        return result.updateUser;
      },
      verifyOtp: async (...args: unknown[]) => {
        calls.push({ fn: "verifyOtp", args });
        return result.verifyOtp;
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row }) }),
      }),
      update: (values: unknown) => ({
        eq: async (col: string, id: string) => {
          calls.push({ fn: `update ${table}`, args: [values, col, id] });
          return result.profileUpdate;
        },
      }),
    }),
  };
  supabase.configured = true;
  supabase.client = client;
  return { calls, result };
}

describe("with Supabase", () => {
  it("reads the member from the session's claims", async () => {
    fakeSupabase("amy@gmail.com");
    expect(await member()).toMatchObject({
      id: "u1",
      handle: "amy",
      email: "amy@gmail.com",
      isPublic: true,
    });
  });

  it("asks Supabase to send a code to the new address", async () => {
    const { calls } = fakeSupabase("amy@gmail.com");
    expect((await auth.requestEmailChange("new@outlook.com")).ok).toBe(true);
    expect(calls).toEqual([
      { fn: "updateUser", args: [{ email: "new@outlook.com" }] },
    ]);
  });

  it.each([
    [{ status: 422, code: "email_exists" }, "另一位成员"],
    [{ status: 429, code: "over_email_send_rate_limit" }, "太频繁"],
    [{ status: 500, code: "unexpected_failure" }, "发送失败"],
  ])("explains a failed send (%o)", async (error, says) => {
    const { result } = fakeSupabase("amy@gmail.com");
    result.updateUser.error = error;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sent = await auth.requestEmailChange("new@outlook.com");
    expect(sent.ok).toBe(false);
    expect(!sent.ok && sent.message).toContain(says);
  });

  it("confirms with an email_change code for the new address", async () => {
    const { calls } = fakeSupabase("amy@gmail.com");
    const done = await auth.confirmEmailChange("new@outlook.com", "123456");
    expect(done).toEqual({ ok: true, value: "new@outlook.com" });
    expect(calls).toEqual([
      {
        fn: "verifyOtp",
        args: [
          { email: "new@outlook.com", token: "123456", type: "email_change" },
        ],
      },
    ]);
  });

  it("a wrong code changes nothing", async () => {
    const { result } = fakeSupabase("amy@gmail.com");
    result.verifyOtp.error = { status: 403, code: "otp_expired" };
    const done = await auth.confirmEmailChange("new@outlook.com", "999999");
    expect(done.ok).toBe(false);
    expect(!done.ok && done.message).toContain("验证码不对");
  });

  it("says so when Supabase still waits on the old address", async () => {
    const { result } = fakeSupabase("amy@gmail.com");
    result.verifyOtp.data.user = { email: "amy@gmail.com" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const done = await auth.confirmEmailChange("new@outlook.com", "123456");
    expect(done.ok).toBe(false);
  });

  it("writes the public switch to the member's own profile", async () => {
    const { calls } = fakeSupabase("amy@gmail.com");
    expect((await auth.setPublicCard(false)).ok).toBe(true);
    expect(calls).toEqual([
      { fn: "update profiles", args: [{ is_public: false }, "id", "u1"] },
    ]);
  });
});
