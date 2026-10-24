// Prepares team photos for /people (see docs/team.md). For every original it
// writes a square avatar (800×800) and a 4:5 portrait (1200×1500) as WebP under
// random file names, plus a contact sheet to check the crops:
//   node scripts/team-photos.mjs ~/Downloads/team/*.jpg
//   node scripts/team-photos.mjs --out ./team-out ~/Downloads/team/*.jpg
// The photo is turned upright from its EXIF orientation, then every bit of
// metadata (EXIF, GPS, camera) is dropped, which is sharp's default for output.
// Crops centre on the most interesting region (sharp's "attention" strategy,
// which favours faces and skin tones); redo a bad one by cropping the original
// by hand and running it again. Colour stays in the files: the page shows them
// grey and adds colour on hover in CSS. Upload the .webp files to the
// team-photos bucket and paste their names into team_members.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";

const SIZES = {
  avatar: { width: 800, height: 800, suffix: "sq" },
  portrait: { width: 1200, height: 1500, suffix: "pt" },
};
// One file in the bucket may be at most 1 MB (20261026000000_team_members.sql).
const MAX_BYTES = 1024 * 1024;

const args = process.argv.slice(2);
let out = "team-photos-out";
const inputs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = args[++i];
  else inputs.push(args[i]);
}
if (!inputs.length) {
  console.error("usage: node scripts/team-photos.mjs [--out dir] photo.jpg …");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

/** WebP under the bucket's size limit: quality steps down until it fits. */
async function webp(pipeline) {
  for (const quality of [82, 76, 70, 62]) {
    const buf = await pipeline.clone().webp({ quality, effort: 5 }).toBuffer();
    if (buf.length <= MAX_BYTES) return buf;
  }
  throw new Error("still over 1 MB at quality 62");
}

const rows = [];
const sheet = [];
for (const file of inputs) {
  const src = sharp(resolve(file)).rotate();
  const { width = 0, height = 0 } = await src.metadata();
  // A random name per person: the public URL says nothing about who it is.
  const id = randomBytes(6).toString("hex");
  const names = {};
  for (const [kind, s] of Object.entries(SIZES)) {
    const small = width < s.width || height < s.height;
    const buf = await webp(
      src
        .clone()
        .resize(s.width, s.height, {
          fit: "cover",
          position: sharp.strategy.attention,
        })
        .normalise({ lower: 1, upper: 99 }),
    );
    const name = `${id}-${s.suffix}.webp`;
    writeFileSync(join(out, name), buf);
    names[kind] = name;
    sheet.push({ buf, kind, label: basename(file) });
    if (small)
      console.warn(
        `! ${basename(file)}: ${width}×${height} is smaller than the ${kind} (${s.width}×${s.height}); ask for the original.`,
      );
  }
  rows.push({
    file: basename(file),
    avatar_path: names.avatar,
    portrait_path: names.portrait,
  });
}

// Contact sheet: each person's avatar and portrait side by side, for a quick
// look at the crops before uploading.
const CELL = 240;
const cols = 4;
const tiles = await Promise.all(
  sheet.map(({ buf, kind }) =>
    sharp(buf)
      .resize(kind === "avatar" ? CELL : Math.round(CELL * 0.8), CELL)
      .toBuffer(),
  ),
);
const sheetRows = Math.ceil(tiles.length / cols);
await sharp({
  create: {
    width: cols * (CELL + 16) + 16,
    height: sheetRows * (CELL + 16) + 16,
    channels: 3,
    background: "#050505",
  },
})
  .composite(
    tiles.map((input, i) => ({
      input,
      left: 16 + (i % cols) * (CELL + 16),
      top: 16 + Math.floor(i / cols) * (CELL + 16),
    })),
  )
  .jpeg({ quality: 80 })
  .toFile(join(out, "contact-sheet.jpg"));

console.table(rows);
console.log(
  `\n${rows.length * 2} files in ${out}/ · check ${join(out, "contact-sheet.jpg")} before uploading.`,
);
