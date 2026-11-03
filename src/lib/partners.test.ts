import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allPartners } from "./partners";

describe("partners", () => {
  const partners = allPartners();

  it("are listed once", () => {
    const names = partners.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
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
  }
});
