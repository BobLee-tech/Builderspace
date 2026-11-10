import { describe, expect, it } from "vitest";
import { eventTbc, featuredEvent } from "./event-pages";
import type { SiteEvent } from "./types";

const event: SiteEvent = {
  slug: "the-collectors",
  title: "一起造机器人",
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
    expect(eventTbc(event)?.short.zh).toBe("11 月中");
  });

  it("falls back to plain TBC once the placeholder has passed", () => {
    const tbc = eventTbc({ ...event, tbcLapsed: true });
    expect(tbc?.short).toEqual({ zh: "待定", en: "TBC" });
    expect(tbc?.status).toEqual([]);
    expect(JSON.stringify(tbc)).not.toContain("11 月中");
  });

  it("has plain wording for an event page without its own", () => {
    expect(eventTbc({ ...event, slug: "no-page" })?.when.zh).toBe("待定");
  });
});

describe("featuredEvent", () => {
  const dated = { ...event, dateTbc: false };
  const talk = { ...dated, slug: "ai-study-career-talk" };
  const featured = { ...dated, slug: "beyond-chatgpt" };

  it("puts a featured event ahead of an earlier one", () => {
    expect(featuredEvent([talk, featured])).toEqual({
      event: featured,
      first: false,
    });
  });

  it("is the next dated event when none is featured", () => {
    expect(featuredEvent([event, talk])).toEqual({ event: talk, first: true });
  });

  it("is nothing without a dated event", () => {
    expect(featuredEvent([event])).toBeNull();
  });
});
