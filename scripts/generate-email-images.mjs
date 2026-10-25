// PNGs for the emails the database sends (send_event_confirmation in
// supabase/migrations/20261020050000_event_email_design.sql). Mail apps such as
// Gmail don't show SVG, so the mark and the five mascots are rasterised at twice
// the size the email draws them. Re-run after changing the mark or the mascots:
//   node scripts/generate-email-images.mjs
// sharp comes with Next.js, so it is resolved from there.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromNext = createRequire(
  createRequire(import.meta.url).resolve("next/package.json"),
);
const sharp = fromNext("sharp");

const out = join(root, "public/email");
mkdirSync(out, { recursive: true });

// The mark is drawn 44 px wide at most.
await sharp(join(root, "public/mark-240.png"))
  .resize({ width: 88 })
  .png({ palette: true })
  .toFile(join(out, "mark.png"));

// Mascots are drawn 48 px tall.
for (const id of ["vivi", "lumi", "geo", "momo", "kiko"]) {
  await sharp(join(root, `public/mascots/${id}.svg`), { density: 600 })
    .resize({ height: 96 })
    .png()
    .toFile(join(out, `${id}.png`));
}

console.log(`wrote ${out}`);
