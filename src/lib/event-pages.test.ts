import { describe, expect, it } from "vitest";
import { eventTbc } from "./event-pages";
import type { SiteEvent } from "./types";

const event: SiteEvent = {
  slug: "beyond-chatgpt",
  title: "Beyond ChatGPT",
  kind: "workshop",
  startsAt: "2026-11-15T10:00:00+11:00",
  endsAt: "2026-11-15T13:00:00+11:00",
  location: "待定",
  summary: null,
  signupUrl: null,
  capacity: null,
  registrationClosesAt: null,
  seatQuotas: null,
  dateTbc: true,
};

describe("eventTbc", () => {
  it("is nothing once the date is set", () => {
    expect(eventTbc({ ...event, dateTbc: false })).toBeNull();
  });

  it("uses the page's own wording while the placeholder is ahead", () => {
    expect(eventTbc(event)?.short.zh).toBe("下周");
  });

  it("falls back to plain TBC once the placeholder has passed", () => {
    const tbc = eventTbc({ ...event, tbcLapsed: true });
    expect(tbc?.short).toEqual({ zh: "待定", en: "TBC" });
    expect(tbc?.status).toEqual([]);
    expect(JSON.stringify(tbc)).not.toContain("下周");
  });

  it("has plain wording for an event page without its own", () => {
    expect(eventTbc({ ...event, slug: "no-page" })?.when.zh).toBe("待定");
  });
});
