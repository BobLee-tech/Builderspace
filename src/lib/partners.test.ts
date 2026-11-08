import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getEventPage } from "./event-pages";
import { allPartners } from "./partners";
import { displayLength } from "./text-length";

describe("partners", () => {
  const partners = allPartners();

  it("are listed once", () => {
    const names = partners.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    const slugs = partners.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const p of partners) {
    it(`${p.name}: logo is an SVG or PNG in public/partners/`, () => {
      expect(p.logo.startsWith("/partners/"), p.logo).toBe(true);
      expect(p.logo, p.logo).toMatch(/\.(svg|png)$/);
      expect(existsSync(join("public", p.logo)), p.logo).toBe(true);
    });

    it(`${p.name}: tint, term and link are well formed`, () => {
      expect(p.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.since).toMatch(/^T[1-3] 20\d\d$/);
      if (p.url) expect(new URL(p.url).protocol, p.url).toBe("https:");
    });

    it(`${p.name}: shows somewhere`, () => {
      expect(p.home || p.events.length > 0).toBe(true);
    });

    it(`${p.name}: slug is short and URL-safe`, () => {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    if (p.intro) {
      const it_ = p.intro;
      it(`${p.name}: intro is short lines, both languages`, () => {
        const lines = [
          it_.kind,
          it_.base,
          it_.line,
          ...it_.about,
          ...it_.gave,
          ...Object.values(it_.did),
          ...(it_.quote ? [it_.quote.text, it_.quote.by] : []),
        ];
        for (const l of lines) {
          expect(l.zh.trim(), l.en).not.toBe("");
          expect(l.en.trim(), l.zh).not.toBe("");
          // About 36 Chinese characters: one line, never a paragraph.
          expect(displayLength(l.zh), l.zh).toBeLessThanOrEqual(36);
          expect(displayLength(l.en), l.en).toBeLessThanOrEqual(36);
        }
        expect(it_.about.length).toBeLessThanOrEqual(3);
        expect(it_.gave.length).toBeLessThanOrEqual(4);
      });

      it(`${p.name}: intro events, link and confirmation are well formed`, () => {
        for (const slug of Object.keys(it_.did))
          expect(p.events, slug).toContain(slug);
        if (it_.page)
          expect(new URL(it_.page.url).protocol, it_.page.url).toBe("https:");
        if (it_.confirmed) expect(it_.confirmed).toMatch(/^20\d\d-\d\d-\d\d$/);
      });
    }

    it(`${p.name}: every event it supports has a page`, () => {
      for (const slug of p.events)
        expect(getEventPage(slug), slug).not.toBeNull();
    });
  }
});
