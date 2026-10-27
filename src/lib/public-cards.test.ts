import { beforeEach, describe, expect, it, vi } from "vitest";
import { memberSeed, seededDesign } from "./card-design";
import { samplePublicCards } from "./sample-data";

// getPublicCards() maps public_cards() rows to what the wall and /m/<handle>
// draw. The function itself (who is public, which fields leave) is SQL.

const db = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("./supabase/client", () => ({ getSupabase: () => db.client }));

const { getPublicCard, getPublicCards } = await import("./data");

const row = {
  handle: "amy",
  nickname: "Amy",
  member_no: 7,
  spark: "vivi",
  major: "CS",
  school_degree: "UNSW",
  skills: ["web"],
  building: "合租雷达",
  looking_for: ["design"],
  seal: "UNSW",
  material: "chrome",
  tint: "vivi",
  pattern: "dots",
  tagline: "hi",
  stickers: [],
  projects: ["hezu"],
};

function rpc(data: unknown, error: { message: string } | null = null) {
  const calls: string[] = [];
  db.client = {
    rpc: async (fn: string) => {
      calls.push(fn);
      return { data, error };
    },
  };
  return calls;
}

beforeEach(() => {
  db.client = null;
});

describe("getPublicCards", () => {
  it("shows placeholders without Supabase", async () => {
    expect(await getPublicCards()).toBe(samplePublicCards);
  });

  it("maps a row to the card it prints", async () => {
    const calls = rpc([row]);
    const [amy] = await getPublicCards();
    expect(calls).toEqual(["public_cards"]);
    expect(amy).toMatchObject({
      handle: "amy",
      projects: ["hezu"],
      card: {
        nickname: "Amy",
        memberNo: 7,
        seal: "UNSW",
        building: "合租雷达",
        lookingFor: ["design"],
      },
      design: { material: "chrome", tint: "vivi", tagline: "hi" },
    });
  });

  it("an undesigned card gets the design its studio starts from", async () => {
    rpc([{ ...row, material: null, tint: null, pattern: null, tagline: null }]);
    const [amy] = await getPublicCards();
    expect(amy.design).toEqual(seededDesign(memberSeed(7)).design);
  });

  it("a failure leaves the wall empty instead of breaking the page", async () => {
    rpc(null, { message: "boom" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getPublicCards()).toEqual([]);
  });
});

describe("getPublicCard", () => {
  it("finds a handle whatever its case", async () => {
    rpc([row]);
    expect((await getPublicCard("AMY"))?.handle).toBe("amy");
  });

  it("is null for a card that isn't public", async () => {
    rpc([row]);
    expect(await getPublicCard("bo")).toBeNull();
  });
});
