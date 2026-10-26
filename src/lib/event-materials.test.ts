import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allEventMaterials, packFiles } from "./event-materials";

describe("event materials", () => {
  for (const [slug, m] of allEventMaterials()) {
    it(`${slug}: the zip is in public/events/${slug}/`, () => {
      expect(m.zip.startsWith(`/events/${slug}/`), m.zip).toBe(true);
      expect(existsSync(join("public", m.zip)), m.zip).toBe(true);
    });

    // Stored uncompressed, so each file's text sits in the zip as is.
    it(`${slug}: the zip matches the data (node scripts/pack-materials.mjs)`, () => {
      const zip = readFileSync(join("public", m.zip));
      for (const f of packFiles(m)) {
        expect(zip.includes(Buffer.from(f.name)), f.name).toBe(true);
        expect(zip.includes(Buffer.from(f.text)), f.name).toBe(true);
      }
    });

    it(`${slug}: the deploy step exists and links are https or on the site`, () => {
      expect(m.steps[m.deployStep]).toBeDefined();
      for (const t of m.tools) {
        if (t.href.startsWith("/")) continue;
        expect(new URL(t.href).protocol, t.href).toBe("https:");
      }
    });

    it(`${slug}: both deploy prompts keep the placeholders`, () => {
      expect(m.deployPrompt.zh).toContain("<用户名>");
      expect(m.deployPrompt.en).toContain("<username>");
    });
  }
});
