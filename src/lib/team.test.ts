import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN } from "./card-design";
import { FOUNDER_PROFILES } from "./founder-profiles";
import {
  CARDS_PER_PAGE,
  CORE_TEAM_FLOOR,
  pageCount,
  pageRange,
  pageSlots,
  roughly,
  TEAM_DEPARTMENTS,
  teamPersonOf,
  type TeamRow,
} from "./team";

const BASE = "https://example.supabase.co";

function row(over: Partial<TeamRow> = {}): TeamRow {
  return {
    id: "8b0c1e3a-0000-4000-8000-000000000001",
    team: "ops",
    position: "content",
    title: null,
    display_name: "Kai",
    bio: null,
    bio_en: null,
    link_url: null,
    avatar_path: null,
    portrait_path: null,
    spark: "vivi",
    handle: null,
    member_no: null,
    school_degree: null,
    major: null,
    skills: null,
    building: null,
    looking_for: null,
    school_domain: null,
    verified: false,
    material: null,
    tint: null,
    pattern: null,
    tagline: null,
    stickers: null,
    ...over,
  };
}

describe("TEAM_DEPARTMENTS", () => {
  it("pairs each core team with its department", () => {
    expect(TEAM_DEPARTMENTS.map((d) => [d.key, d.name.en])).toEqual([
      ["ops", "Operations"],
      ["tech", "Tech"],
      ["events", "Events"],
    ]);
  });
});

describe("teamPersonOf", () => {
  it("gives someone without an account the default card", () => {
    const p = teamPersonOf(row(), BASE)!;
    expect(p.design).toEqual(DEFAULT_DESIGN);
    expect(p.card).toMatchObject({
      nickname: "Kai",
      major: "BuilderSpace · Operations",
      memberNo: null,
      seal: null,
    });
    expect(p.slug).toBe(row().id);
  });

  it("uses the linked member's card, number, handle and seal", () => {
    const p = teamPersonOf(
      row({
        handle: "kai",
        member_no: 12,
        major: "Computer Science",
        verified: true,
        school_domain: "student.unsw.edu.au",
        skills: ["web", "nonsense"],
        looking_for: ["design", "nonsense"],
        material: "holo",
        tint: "geo",
        pattern: "topo",
        tagline: "hi",
        stickers: [{ id: "logo", x: 80, y: 40, r: 0, s: 1, f: "orig" }],
      }),
      BASE,
    )!;
    expect(p.slug).toBe("kai");
    expect(p.card).toMatchObject({
      major: "Computer Science",
      memberNo: 12,
      seal: "UNSW",
      skills: ["web"],
      lookingFor: ["design"],
    });
    expect(p.design).toMatchObject({
      material: "holo",
      tint: "geo",
      pattern: "topo",
    });
    expect(p.design.stickers).toHaveLength(1);
  });

  it("turns photo paths into public bucket URLs", () => {
    const p = teamPersonOf(
      row({ avatar_path: "a1b2c3d4e5f6-sq.webp", portrait_path: null }),
      BASE,
    )!;
    expect(p.avatar).toBe(
      `${BASE}/storage/v1/object/public/team-photos/a1b2c3d4e5f6-sq.webp`,
    );
    expect(p.portrait).toBeNull();
  });

  it("drops rows the page can't place", () => {
    expect(teamPersonOf(row({ team: "board" }), BASE)).toBeNull();
    expect(teamPersonOf(row({ position: "events" }), BASE)).toBeNull();
    expect(teamPersonOf(row({ position: null }), BASE)).toBeNull();
  });

  it("keeps founders without a position", () => {
    const p = teamPersonOf(
      row({ team: "founder", position: null, title: "Co-President" }),
      BASE,
    )!;
    expect(p).toMatchObject({
      team: "founder",
      position: null,
      title: "Co-President",
    });
  });
});

describe("paging", () => {
  it("doesn't page a team that fits", () => {
    expect(pageCount(CARDS_PER_PAGE)).toBe(1);
    expect(pageSlots(3, 0)).toEqual([0, 1, 2]);
    expect(pageCount(0)).toBe(1);
  });

  it("fills the last page from the start", () => {
    expect(pageCount(14)).toBe(3);
    expect(pageSlots(14, 1)).toEqual([5, 6, 7, 8, 9]);
    expect(pageSlots(14, 2)).toEqual([10, 11, 12, 13, 0]);
  });

  it("counts the real people on a page", () => {
    expect(pageRange(14, 1)).toEqual([6, 10]);
    expect(pageRange(14, 2)).toEqual([11, 14]);
  });
});

describe("profile slugs", () => {
  it("uses the slug ops set for the profile address", () => {
    const p = teamPersonOf(
      row({ team: "founder", position: null, slug: "evan", handle: "evanj" }),
      BASE,
    )!;
    expect(p).toMatchObject({ slug: "evan", profileSlug: "evan" });
  });

  it("has no profile without a slug", () => {
    const p = teamPersonOf(row({ handle: "kai" }), BASE)!;
    expect(p).toMatchObject({ slug: "kai", profileSlug: null });
  });

  it("never reads the core team as fewer than 20", () => {
    expect(roughly(Math.max(0, CORE_TEAM_FLOOR))).toBe("20+");
    expect(roughly(Math.max(34, CORE_TEAM_FLOOR))).toBe("30+");
  });

  it("only points profiles at files the bucket accepts", () => {
    // the same check as team_members.avatar_path in 20261026020000_team_members.sql
    for (const p of Object.values(FOUNDER_PROFILES))
      if (p.site) expect(p.site.image).toMatch(/^[a-z0-9-]{8,64}\.webp$/);
  });
});
