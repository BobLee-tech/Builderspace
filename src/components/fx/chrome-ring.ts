/**
 * The cursor ring as faint, translucent liquid chrome. Loaded on demand by
 * global-fx.tsx (three.js is big), and only on fine pointers. A satin metal
 * tube is lit by a measured studio (Poly Haven "Studio Small 09", CC0,
 * downsampled by scripts/downsample-hdri.mjs) and its alpha falls to zero
 * toward the tube's silhouette, so it reads as a soft band with no edge.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  EquirectangularReflectionMapping,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { frameLoop, type RingBox } from "./motion";

const OPACITY = 0.36;
// Tube radius: a wide, faint band rather than a line.
const TUBE = 4;
const RIPPLE = { from: 12, to: 46, tube: 2.4, seconds: 0.8 };
const ARC = 16,
  SIDES = 16,
  N = 4 * (ARC + 1);

/** Satin chrome whose alpha follows how squarely it faces the viewer. */
function chrome() {
  const m = new MeshPhysicalMaterial({
    color: new Color(0xffffff),
    metalness: 1,
    roughness: 0.3,
    transparent: true,
    opacity: OPACITY,
    depthWrite: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
      float facing = smoothstep(0.1, 1.0, abs(normal.z));
      gl_FragColor.a *= facing * facing;`,
    );
  };
  return m;
}

/** A tube swept round a rounded rectangle; reshaped in place, never reallocated. */
function tubeGeometry() {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(N * SIDES * 3), 3),
  );
  g.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(N * SIDES * 3), 3),
  );
  const index: number[] = [];
  for (let i = 0; i < N; i++) {
    const i2 = (i + 1) % N;
    for (let j = 0; j < SIDES; j++) {
      const j2 = (j + 1) % SIDES;
      const a = i * SIDES + j,
        b = i2 * SIDES + j,
        c = i2 * SIDES + j2,
        d = i * SIDES + j2;
      index.push(a, b, d, b, c, d);
    }
  }
  g.setIndex(index);
  return g;
}

/** w/h/r describe the outer edge, like the CSS ring; t is the tube radius. */
function shapeTube(
  g: BufferGeometry,
  w: number,
  h: number,
  r: number,
  t: number,
) {
  const hw = Math.max(0, w / 2 - t),
    hh = Math.max(0, h / 2 - t);
  const rr = Math.max(0, Math.min(r - t, hw, hh));
  const ax = hw - rr,
    ay = hh - rr;
  const pos = g.attributes.position.array as Float32Array;
  const nor = g.attributes.normal.array as Float32Array;
  const corners = [
    [ax, ay],
    [-ax, ay],
    [-ax, -ay],
    [ax, -ay],
  ];
  let k = 0;
  corners.forEach(([cx, cy], q) => {
    for (let s = 0; s <= ARC; s++) {
      const a = ((q + s / ARC) * Math.PI) / 2,
        nx = Math.cos(a),
        ny = Math.sin(a);
      const px = cx + nx * rr,
        py = cy + ny * rr;
      for (let j = 0; j < SIDES; j++) {
        const th = (j / SIDES) * Math.PI * 2,
          ct = Math.cos(th),
          st = Math.sin(th);
        const o = (k * SIDES + j) * 3;
        nor[o] = nx * ct;
        nor[o + 1] = ny * ct;
        nor[o + 2] = st;
        pos[o] = px + t * nor[o];
        pos[o + 1] = py + t * nor[o + 1];
        pos[o + 2] = t * st;
      }
      k++;
    }
  });
  g.attributes.position.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  g.computeBoundingSphere();
}

export type ChromeRing = {
  /** Draws the ring at `box`; `vx`/`vy` (px/s) let the reflections drift. */
  draw(box: RingBox, vx: number, vy: number): void;
  /** A faint ring of the same metal spreading from a click. */
  ripple(x: number, y: number): void;
  dispose(): void;
};

/** Resolves once the studio light has loaded; rejects without WebGL. */
export async function createChromeRing(
  canvas: HTMLCanvasElement,
): Promise<ChromeRing> {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // Neutral keeps the silver neutral; matte metal needs a little more light.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.45;

  const scene = new Scene();
  // Orthographic, one unit per CSS pixel, y pointing down the page.
  const camera = new OrthographicCamera(0, 1, 0, -1, 0.1, 400);
  camera.position.z = 200;
  const fit = () => {
    const w = document.documentElement.clientWidth,
      h = document.documentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.right = w;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
  };
  fit();

  try {
    const hdr = await new HDRLoader().loadAsync("/env/studio-small-09.hdr");
    hdr.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
  } catch (error) {
    renderer.dispose();
    throw error;
  }

  const ring = new Mesh(tubeGeometry(), chrome());
  scene.add(ring);
  let last: RingBox | null = null,
    shape = "",
    sway = 0,
    tilt = 0,
    ripples = 0,
    disposed = false;
  const render = () => renderer.render(scene, camera);

  const onResize = () => {
    fit();
    render();
  };
  addEventListener("resize", onResize);

  return {
    draw(box, vx, vy) {
      last = box;
      // Reflections drift a little with the motion, then settle.
      sway += (Math.max(-0.25, Math.min(0.25, vx / 4000)) - sway) * 0.08;
      tilt += (Math.max(-0.15, Math.min(0.15, vy / 6000)) - tilt) * 0.08;
      scene.environmentRotation.set(tilt, sway, 0);
      ring.position.set(box.cx, -box.cy, 0);
      const next = [box.w, box.h, box.r].map((v) => v.toFixed(2)).join();
      if (next !== shape) {
        shape = next;
        shapeTube(ring.geometry, box.w, box.h, Math.max(0, box.r), TUBE);
      }
      if (!ripples) render();
    },
    ripple(x, y) {
      const m = new Mesh(tubeGeometry(), chrome());
      m.position.set(x, -y, 0);
      scene.add(m);
      ripples++;
      let t = 0;
      frameLoop.add((dt) => {
        if (disposed) return false;
        t = Math.min(1, t + dt / RIPPLE.seconds);
        const k = 1 - Math.pow(2, -10 * t); // expo out
        const s = RIPPLE.from + (RIPPLE.to - RIPPLE.from) * k;
        shapeTube(m.geometry, s * 2, s * 2, s, RIPPLE.tube);
        (m.material as MeshPhysicalMaterial).opacity = OPACITY * 0.8 * (1 - k);
        if (t >= 1) {
          scene.remove(m);
          m.geometry.dispose();
          (m.material as MeshPhysicalMaterial).dispose();
          ripples--;
        }
        if (last) ring.position.set(last.cx, -last.cy, 0);
        render();
        return t < 1;
      });
    },
    dispose() {
      disposed = true;
      removeEventListener("resize", onResize);
      ring.geometry.dispose();
      (ring.material as MeshPhysicalMaterial).dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
