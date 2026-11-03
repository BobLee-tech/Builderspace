import { describe, expect, it } from "vitest";
import { bi, biText, eventLd, OPEN_GRAPH, pageMeta } from "./seo";
import { siteUrl } from "./site-url";

describe("bi", () => {
  it("joins both languages, without the English full stop", () => {
    expect(bi("把自己放上网", "Put yourself online.")).toBe(
      "把自己放上网 · Put yourself online",
    );
  });
  it("gives one side when the other is missing or the same", () => {
    expect(bi("BuilderSpace", null)).toBe("BuilderSpace");
    expect(bi("BuilderSpace", " BuilderSpace ")).toBe("BuilderSpace");
    expect(bi(" 课表 ", "")).toBe("课表");
  });
});

describe("biText", () => {
  it("ends the Chinese side in a stop before the English", () => {
    expect(biText("找队友", "Find teammates.")).toBe(
      "找队友。 Find teammates.",
    );
    expect(biText("找队友！", "Find teammates.")).toBe(
      "找队友！ Find teammates.",
    );
    expect(biText("出门前就…", "Before you…")).toBe("出门前就… Before you…");
  });
  it("gives the Chinese alone when there's no other English", () => {
    expect(biText("找队友", null)).toBe("找队友");
    expect(biText("找队友 ", "找队友")).toBe("找队友");
  });
});

describe("pageMeta", () => {
  it("sets the canonical address and keeps the site's openGraph", () => {
    const meta = pageMeta("/events", { title: "活动 Events" });
    expect(meta.title).toBe("活动 Events");
    expect(meta.description).toBeUndefined();
    expect(meta.alternates).toEqual({ canonical: "/events" });
    expect(meta.openGraph).toEqual({ ...OPEN_GRAPH, url: "/events" });
  });
});

describe("eventLd", () => {
  const base = {
    path: "/events/put-yourself-online",
    name: "把自己放上网 · Put yourself online",
    description: null,
    startsAt: "2026-10-22T10:00:00+11:00",
    endsAt: "2026-10-22T13:00:00+11:00",
    location: "UNSW",
    free: true,
    full: false,
    signupUrl: null,
  };
  const offers = (e: Partial<Parameters<typeof eventLd>[0]>) =>
    (eventLd({ ...base, phase: "open", ...e }) as { offers?: object }).offers;

  it("offers free seats while sign-up is open", () => {
    expect(offers({})).toMatchObject({
      price: 0,
      url: `${siteUrl}/events/put-yourself-online`,
      availability: "https://schema.org/InStock",
    });
  });
  it("is sold out when full or closed", () => {
    expect(offers({ full: true })).toMatchObject({
      availability: "https://schema.org/SoldOut",
    });
    expect(offers({ phase: "closed" })).toMatchObject({
      availability: "https://schema.org/SoldOut",
    });
  });
  it("points to the sign-up elsewhere", () => {
    expect(
      offers({ phase: "external", signupUrl: "https://lu.ma/x" }),
    ).toMatchObject({ url: "https://lu.ma/x" });
  });
  it("offers nothing once past, or when not known to be free", () => {
    expect(offers({ phase: "past" })).toBeUndefined();
    expect(eventLd({ ...base, phase: "past" })).toMatchObject({
      isAccessibleForFree: true,
    });
    expect(offers({ free: false })).toBeUndefined();
  });
});
