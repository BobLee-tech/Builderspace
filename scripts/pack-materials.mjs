// Builds each event's materials zip in public/events/<slug>/ from
// src/lib/event-materials.ts. Re-run after editing that file:
//   node scripts/pack-materials.mjs
// Files are stored uncompressed (zip -0) so event-materials.test.ts can check
// the zip still holds the current text. Needs the `zip` command (macOS, Linux).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allEventMaterials, packFiles } from "../src/lib/event-materials.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const [slug, materials] of allEventMaterials()) {
  const dir = mkdtempSync(join(tmpdir(), `materials-${slug}-`));
  const files = packFiles(materials);
  for (const f of files) writeFileSync(join(dir, f.name), f.text);
  const out = join(root, "public", materials.zip);
  rmSync(out, { force: true });
  execFileSync("zip", [
    "-0",
    "-X",
    "-j",
    "-q",
    out,
    ...files.map((f) => join(dir, f.name)),
  ]);
  rmSync(dir, { recursive: true });
  console.log(`${materials.zip}: ${files.map((f) => f.name).join(", ")}`);
}
