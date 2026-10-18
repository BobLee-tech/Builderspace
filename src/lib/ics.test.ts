import { describe, expect, it } from "vitest";
import { buildCalendar } from "./ics";
import type { SiteEvent } from "./types";

const event: SiteEvent = {
  slug: "vibe-coding-101",
  title: "Vibe Coding 101：两小时做出第一个页面, 零基础; 友好",
  kind: "workshop",
  startsAt: "2026-10-21T18:30:00+11:00",
  endsAt: "2026-10-21T20:30:00+11:00",
  location: "校内教室",
  summary: "第一行\n第二行",
  signupUrl: null,
  capacity: 40,
  registrationClosesAt: null,
  seatQuotas: null,
};

const ics = buildCalendar([event], {
  siteUrl: "https://builderspace.example",
  generatedAt: "2026-10-12T00:00:00Z",
});

describe("buildCalendar", () => {
  it("uses CRLF line endings and wraps events", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT\r\n");
  });

  it("converts Sydney times to UTC", () => {
    expect(ics).toContain("DTSTART:20261021T073000Z");
    expect(ics).toContain("DTEND:20261021T093000Z");
  });

  it("gives each event a stable UID", () => {
    expect(ics).toContain("UID:vibe-coding-101@builderspace.example");
  });

  it("escapes text values", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("零基础\\; 友好");
    expect(unfolded).toContain("页面\\, 零基础");
    expect(unfolded).toContain("DESCRIPTION:第一行\\n第二行");
  });

  it("folds lines at 75 octets without splitting characters", () => {
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
