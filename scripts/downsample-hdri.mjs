// Shrinks an equirectangular Radiance .hdr by an integer factor (box filter)
// and writes it back as flat RGBE. The cursor's chrome only needs the studio's
// soft light, not its detail, so a 256×128 copy of a 1k HDRI is plenty.
//
//   node scripts/downsample-hdri.mjs <in.hdr> <out.hdr> [width=256]
//
// public/env/studio-small-09.hdr comes from Poly Haven's "Studio Small 09"
// (CC0, https://polyhaven.com/a/studio_small_09), 1k .hdr.
import { readFileSync, writeFileSync } from "node:fs";
import { FloatType } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const [input, output, widthArg = "256"] = process.argv.slice(2);
if (!input || !output) {
  console.error(
    "usage: node scripts/downsample-hdri.mjs <in.hdr> <out.hdr> [width]",
  );
  process.exit(1);
}

const file = readFileSync(input);
const loader = new HDRLoader().setDataType(FloatType);
const src = loader.parse(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
);
const width = Number(widthArg);
const k = src.width / width;
if (!Number.isInteger(k) || src.height % k)
  throw new Error(`${src.width}×${src.height} doesn't divide by ${k}`);
const height = src.height / k;

const out = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    let r = 0,
      g = 0,
      b = 0;
    for (let dy = 0; dy < k; dy++)
      for (let dx = 0; dx < k; dx++) {
        const i = ((y * k + dy) * src.width + (x * k + dx)) * 4;
        r += src.data[i];
        g += src.data[i + 1];
        b += src.data[i + 2];
      }
    const n = k * k;
    [r, g, b] = [r / n, g / n, b / n];
    // RGBE: a shared exponent from the brightest channel.
    const v = Math.max(r, g, b);
    const o = (y * width + x) * 4;
    if (v < 1e-32) continue;
    const e = Math.floor(Math.log2(v)) + 1;
    const scale = 256 / 2 ** e;
    out[o] = Math.min(255, Math.floor(r * scale));
    out[o + 1] = Math.min(255, Math.floor(g * scale));
    out[o + 2] = Math.min(255, Math.floor(b * scale));
    out[o + 3] = e + 128;
  }

const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`;
writeFileSync(output, Buffer.concat([Buffer.from(header, "ascii"), out]));
console.log(
  `${input} ${src.width}×${src.height} → ${output} ${width}×${height}`,
);
