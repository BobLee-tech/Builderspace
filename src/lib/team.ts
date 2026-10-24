// The people on /people: the founders and the core team. Rows come from
// team_list() (supabase/migrations/20261026020000_team_members.sql); a member
// linked to an account shows the card they designed, everyone else the
// default card. Ops add and remove people in Supabase, see docs/team.md.
import { DEFAULT_DESIGN, readDesign, type CardDesign } from "./card-design";
import {
  LOOKING_FOR,
  MEMBER_SKILLS,
  SPARKS,
  sealLabel,
  type CardView,
  type LookingFor,
  type MemberSkill,
  type Spark,
} from "./members";
import { DEPARTMENTS, type VolunteerPosition } from "./types";

export const CORE_TEAMS = ["ops", "tech", "events"] as const;
export type CoreTeam = (typeof CORE_TEAMS)[number];
export type TeamKey = "founder" | CoreTeam;

/** Each core team with its department from the /core-team form, in the same order. */
export const TEAM_DEPARTMENTS = CORE_TEAMS.map((key, i) => ({
  key,
  ...DEPARTMENTS[i],
}));

export type TeamPerson = {
  id: string;
  /** What the enlarged card's address uses: the member's handle, else the row id. */
  slug: string;
  team: TeamKey;
  position: VolunteerPosition | null;
  /** For founders, e.g. Co-President. */
  title: string | null;
  bio: string | null;
  bioEn: string | null;
  link: string | null;
  /** Public photo URLs; null until the photo is in. */
  avatar: string | null;
  portrait: string | null;
  card: CardView;
  design: CardDesign;
};

/**
 * What the card prints where the major goes when there is none (someone not
 * linked to an account, or who left it blank), instead of the join form's
 * "Major · degree" prompt.
 */
export function teamLine(team: TeamKey) {
  if (team === "founder") return "BuilderSpace · Founding team";
  const dept = TEAM_DEPARTMENTS.find((d) => d.key === team)!;
  return `BuilderSpace · ${dept.name.en}`;
}

/** One row of team_list(). */
export type TeamRow = {
  id: string;
  team: string;
  position: string | null;
  title: string | null;
  display_name: string;
  bio: string | null;
  bio_en: string | null;
  link_url: string | null;
  avatar_path: string | null;
  portrait_path: string | null;
  spark: string;
  handle: string | null;
  member_no: number | null;
  school_degree: string | null;
  major: string | null;
  skills: string[] | null;
  building: string | null;
  looking_for: string[] | null;
  school_domain: string | null;
  verified: boolean;
  material: string | null;
  tint: string | null;
  pattern: string | null;
  tagline: string | null;
  stickers: unknown;
};

export const TEAM_PHOTO_BUCKET = "team-photos";

const isTeam = (v: string): v is TeamKey =>
  v === "founder" || (CORE_TEAMS as readonly string[]).includes(v);
const oneOf =
  <T extends string>(list: readonly T[]) =>
  (v: string): v is T =>
    (list as readonly string[]).includes(v);

/**
 * A team_list() row as the page draws it. `photoBase` is the Supabase URL the
 * public bucket hangs off. Rows the page can't place come back null.
 */
export function teamPersonOf(
  row: TeamRow,
  photoBase: string,
): TeamPerson | null {
  if (!isTeam(row.team)) return null;
  const position =
    row.team === "founder"
      ? null
      : (TEAM_DEPARTMENTS.find((d) => d.key === row.team)?.positions.find(
          (p) => p === row.position,
        ) ?? null);
  if (row.team !== "founder" && !position) return null;
  const photo = (path: string | null) =>
    path
      ? `${photoBase}/storage/v1/object/public/${TEAM_PHOTO_BUCKET}/${path}`
      : null;
  const spark: Spark = oneOf(SPARKS)(row.spark) ? row.spark : "geo";
  const degree = row.school_degree ?? "";
  return {
    id: row.id,
    slug: row.handle ?? row.id,
    team: row.team,
    position,
    title: row.title,
    bio: row.bio,
    bioEn: row.bio_en,
    link: row.link_url,
    avatar: photo(row.avatar_path),
    portrait: photo(row.portrait_path),
    card: {
      nickname: row.display_name,
      schoolDegree: degree,
      major: row.major || degree ? (row.major ?? "") : teamLine(row.team),
      skills: (row.skills ?? []).filter(oneOf<MemberSkill>(MEMBER_SKILLS)),
      spark,
      memberNo: row.member_no,
      seal: row.verified ? sealLabel(row.school_domain) : null,
      building: row.building,
      lookingFor: (row.looking_for ?? []).filter(
        oneOf<LookingFor>(LOOKING_FOR),
      ),
    },
    design: row.material
      ? readDesign({
          material: row.material,
          tint: row.tint,
          pattern: row.pattern,
          tagline: row.tagline,
          stickers: row.stickers,
        })
      : DEFAULT_DESIGN,
  };
}

/** Cards per page: the grid has six cells and the last one is the "join" card. */
export const CARDS_PER_PAGE = 5;

export const pageCount = (n: number) =>
  Math.max(1, Math.ceil(n / CARDS_PER_PAGE));

/**
 * Who sits in each cell on `page`, as indexes into the team. The last page
 * tops up from the start, so a page is never half empty.
 */
export function pageSlots(n: number, page: number): number[] {
  if (n <= CARDS_PER_PAGE) return Array.from({ length: n }, (_, i) => i);
  return Array.from(
    { length: CARDS_PER_PAGE },
    (_, s) => (page * CARDS_PER_PAGE + s) % n,
  );
}

/** "06–10 / 14": the people a page starts with, 1-based, for the counter. */
export function pageRange(n: number, page: number): [number, number] {
  const first = page * CARDS_PER_PAGE + 1;
  return [first, Math.min(n, first + CARDS_PER_PAGE - 1)];
}
