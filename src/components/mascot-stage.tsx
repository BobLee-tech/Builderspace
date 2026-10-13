"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createProgram } from "@/lib/webgl";
import { Wordmark } from "./fx/wordmark";
import { T } from "./t";

// Ported from the prototype: ~17.5k particles sampled from the logo artwork
// (position + colour). All motion runs in the vertex shader — gather on
// scroll, jelly breathing, blinking, pointer repel, click ripple, LED-matrix
// mode — so the CPU only updates uniforms each frame.

type MascotData = {
  n: number;
  aspect: number;
  eyes: [number, number, number][];
  data: string; // base64: int16 x, int16 y, u8 r, g, b, kind (8 bytes/point)
};

const VERT = `
attribute vec3 position; attribute vec3 aColor; attribute float aKind; attribute vec4 aRnd; attribute vec3 aScatter;
uniform float uTime, uForm, uBlink, uScale, uPxW, uPulseT, uMatrix, uCell, uAsp;
uniform vec2 uRes, uCenter, uMouse, uTilt, uPulseAt;
uniform vec3 uEyes[4];
varying vec3 vColor; varying float vAlpha; varying float vSq;
void main(){
  vec3 p = position; float k = aKind, t = uTime, a = 1., sz = .0098;
  bool dust = k > 19.5;
  if (k > 9.5 && !dust) {
    float ei = k - 10.;
    vec3 e = ei < .5 ? uEyes[0] : ei < 1.5 ? uEyes[1] : ei < 2.5 ? uEyes[2] : uEyes[3];
    if (ei < 1.5) { a = step((e.y + e.z - p.y) / (2. * e.z), uBlink * 1.06); sz = .0052; }
    else { p.y = e.y + (p.y - e.y) * (1. - uBlink * .9); sz = .0048; }
  } else if (k > 1.5 && k < 2.5) sz = .0068;
  float warm = step(.22, aColor.r - aColor.b);
  float piece = (k < .5 || (k > 9.5 && k < 11.5)) ? 0. : ((k > .5 && k < 1.5) || (k > 11.5 && !dust)) ? 1. : 1. - warm;
  p.y += sin(t * 1.3 + piece * 2.2) * .016;
  p.x += sin(t * .9 + piece * 2.2) * .005;
  p.xy *= 1. + sin(t * 2.4 + p.y * 4. + piece * 1.7) * .005;
  p.z += sin(p.x * 6. + t * 1.4) * .02;
  vec3 w; float f = 1.;
  if (dust) {
    w = p; w.x = mod(p.x + t * .015 * (.4 + aRnd.y) + 2.7, 5.4) - 2.7;
    w.y += sin(t * .35 + aRnd.z * 6.283) * .06;
    sz = .0035 + aRnd.w * .006;
  } else {
    f = smoothstep(aRnd.x * .45, aRnd.x * .45 + .55, uForm);
    vec3 s = aScatter;
    s.x += sin(t * .3 + aRnd.y * 6.283) * .08; s.y += cos(t * .25 + aRnd.z * 6.283) * .08;
    vec3 q = mix(s, p, f);
    float sw = sin(f * 3.14159) * (aRnd.y - .5) * .6;
    q.xy += vec2(-q.y, q.x) * sw;
    q.xy += q.z * uTilt;
    w = vec3(q.xy * uScale + uCenter, q.z * uScale);
  }
  vec2 d = w.xy - uMouse; float r = length(d);
  float push = exp(-r * r / (.05 * uScale * uScale)) * (dust ? .05 : .15) * uScale * uForm;
  w.xy += d / max(r, 1e-3) * push;
  float pr = length(w.xy - uPulseAt);
  float wave = sin(pr * 20. / uScale - uPulseT * 13.) * exp(-uPulseT * 2.4) * exp(-pr * 2.2 / uScale) * .028 * uScale;
  w.xy += (w.xy - uPulseAt) / max(pr, 1e-3) * wave;
  vec2 ndc = vec2(w.x / uAsp, w.y);
  vec2 px = (ndc * .5 + .5) * uRes;
  vec2 snapped = ((floor(px / uCell) + .5) * uCell / uRes) * 2. - 1.;
  ndc = mix(ndc, snapped, uMatrix * (dust ? 0. : 1.));
  gl_Position = vec4(ndc, 0., 1.);
  vSq = uMatrix;
  float scanY = mod(t * .32, 2.8) - 1.4;
  float scan = dust ? 0. : exp(-pow(((w.y - uCenter.y) / uScale - scanY) * 9., 2.)) * f;
  float lum = dot(aColor, vec3(.333));
  float sparkle = (!dust && lum > .8) ? pow(.5 + .5 * sin(t * (1.5 + 2. * aRnd.y) + aRnd.z * 40.), 14.) : 0.;
  gl_PointSize = mix(sz * (dust ? 1. : uScale) * uPxW * (1. + sparkle * 1.4 + scan * .5 + push / (.15 * uScale) * .7), uCell * .74, uMatrix * (dust ? 0. : 1.));
  vColor = dust ? vec3(.9, .91, .93) : aColor;
  if (k > .5 && k < 1.5) vColor = max(vColor * 1.7, vec3(.06, .055, .05));
  vColor += sparkle * .5;
  vColor = mix(vColor, vec3(1.), scan * .45);
  float tw = .5 + .5 * sin(t * (1. + aRnd.y * 2.) + aRnd.z * 6.283);
  vAlpha = a * (dust ? .32 * tw : 1.) * mix(.25, 1., f);
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor; varying float vAlpha; varying float vSq;
void main(){
  vec2 c = abs(gl_PointCoord - .5);
  float r = length(gl_PointCoord - .5);
  float sq = 1. - smoothstep(.36, .46, max(c.x, c.y));
  float m = mix(smoothstep(.5, .3, r), sq, vSq);
  if (m * vAlpha < .01) discard;
  gl_FragColor = vec4(vColor * m * vAlpha, m * vAlpha);
}`;

function buildBuffers(D: MascotData, mobile: boolean) {
  const bytes = Uint8Array.from(atob(D.data), (c) => c.charCodeAt(0));
  const dv = new DataView(bytes.buffer);
  const n = D.n;
  const N = n + (mobile ? 420 : 1000);
  const pos = new Float32Array(N * 3),
    col = new Float32Array(N * 3),
    kind = new Float32Array(N),
    rnd = new Float32Array(N * 4),
    scat = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < 4; j++) rnd[i * 4 + j] = Math.random();
    const a = Math.random() * Math.PI * 2,
      r = 0.35 + Math.sqrt(Math.random()) * 1.5;
    scat[i * 3] = Math.cos(a) * r * 1.35;
    scat[i * 3 + 1] = Math.sin(a) * r * 0.85;
    scat[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    if (i < n) {
      const o = i * 8;
      const R = dv.getUint8(o + 4) / 255,
        G = dv.getUint8(o + 5) / 255,
        B = dv.getUint8(o + 6) / 255;
      pos[i * 3] = dv.getInt16(o, true) / 16000;
      pos[i * 3 + 1] = dv.getInt16(o + 2, true) / 16000;
      // Brighter areas bulge forward, keeping the jelly highlights' volume.
      pos[i * 3 + 2] = ((R + G + B) / 3 - 0.45) * 0.22;
      col.set([R, G, B], i * 3);
      kind[i] = dv.getUint8(o + 7);
    } else {
      // Ambient dust drifting across the whole stage.
      pos[i * 3] = (Math.random() - 0.5) * 5.4;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 2] = -0.2 - Math.random() * 0.4;
      kind[i] = 20;
    }
  }
  return {
    N,
    attrs: {
      position: [pos, 3],
      aColor: [col, 3],
      aKind: [kind, 1],
      aRnd: [rnd, 4],
      aScatter: [scat, 3],
    } as const,
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function MascotStage() {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const matrixRef = useRef(0);
  // Kept across effect runs: coming back to a hidden page restarts instantly.
  const dataRef = useRef<MascotData | null>(null);
  const [on, setOn] = useState(false);
  const [matrix, setMatrix] = useState(false);

  useEffect(() => {
    matrixRef.current = matrix ? 1 : 0;
  }, [matrix]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let cleanup = () => {};
    let cancelled = false;

    // Fetch the particle data only when the stage is about to scroll in.
    const nearIo = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        nearIo.disconnect();
        const data = dataRef.current
          ? Promise.resolve(dataRef.current)
          : fetch("/mascot-particles.json").then(
              (r) => r.json() as Promise<MascotData>,
            );
        data
          .then((D) => {
            dataRef.current = D;
            if (!cancelled) cleanup = start(D);
          })
          .catch(() => {});
      },
      { rootMargin: "100% 0px" },
    );
    nearIo.observe(stage);

    function start(D: MascotData) {
      const gl = canvas!.getContext("webgl", {
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
      const prog = gl && !gl.isContextLost() && createProgram(gl, VERT, FRAG);
      if (!gl || !prog) {
        // No WebGL: keep the static mark.
        setOn(false);
        return () => {};
      }
      gl.useProgram(prog);

      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mobile = matchMedia("(max-width: 720px)").matches;
      const { N, attrs } = buildBuffers(D, mobile);
      const bufs: WebGLBuffer[] = [];
      for (const [name, [data, size]] of Object.entries(attrs)) {
        const loc = gl.getAttribLocation(prog, name);
        if (loc < 0) continue;
        const buf = gl.createBuffer();
        bufs.push(buf);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      }
      const u = (n: string) => gl.getUniformLocation(prog, n);
      const U = {
        time: u("uTime"),
        form: u("uForm"),
        blink: u("uBlink"),
        scale: u("uScale"),
        pxW: u("uPxW"),
        pulseT: u("uPulseT"),
        matrix: u("uMatrix"),
        cell: u("uCell"),
        asp: u("uAsp"),
        res: u("uRes"),
        center: u("uCenter"),
        mouse: u("uMouse"),
        tilt: u("uTilt"),
        pulseAt: u("uPulseAt"),
      };
      gl.uniform3fv(u("uEyes[0]"), new Float32Array(D.eyes.flat()));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      let PR = Math.min(2, devicePixelRatio || 1);
      let H = 1;
      let scale = 0.6;
      const center = { x: 0, y: 0 };
      const layout = () => {
        const r = canvas!.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const W = r.width;
        H = r.height;
        canvas!.width = Math.floor(W * PR);
        canvas!.height = Math.floor(H * PR);
        gl.viewport(0, 0, canvas!.width, canvas!.height);
        const small = W <= 720;
        const wm = small ? W * 0.86 : Math.min(W * 0.54, H * 1.05, 900);
        const hm = wm * D.aspect;
        const cx = W / 2;
        const cy = small ? H * 0.42 : H * 0.44;
        scale = wm / H;
        center.x = ((cx - W / 2) * 2) / H;
        center.y = (-(cy - H / 2) * 2) / H;
        gl.uniform1f(U.asp, W / H);
        gl.uniform1f(U.scale, scale);
        gl.uniform2f(U.center, center.x, center.y);
        gl.uniform1f(U.pxW, (H * PR) / 2);
        gl.uniform2f(U.res, W * PR, H * PR);
        gl.uniform1f(U.cell, (small ? 6 : 8) * PR);
        const pad = small ? 14 : 34;
        Object.assign(frameRef.current!.style, {
          left: `${cx - wm / 2 - pad}px`,
          top: `${cy - hm / 2 - pad}px`,
          width: `${wm + pad * 2}px`,
          height: `${hm + pad * 2}px`,
        });
      };
      const ro = new ResizeObserver(layout);
      ro.observe(canvas!);
      layout();
      setOn(true);

      // Pointer: repel + tilt. Tap: ripple + blink.
      const mouse = { x: 9, y: 9 },
        mT = { x: 9, y: 9 };
      const tilt = { x: 0, y: 0 },
        tT = { x: 0, y: 0 };
      const toWorld = (e: PointerEvent) => {
        const r = canvas!.getBoundingClientRect();
        return {
          x: ((e.clientX - r.left - r.width / 2) * 2) / r.height,
          y: (-(e.clientY - r.top - r.height / 2) * 2) / r.height,
        };
      };
      let blinkT = -1,
        blinkTwice = false,
        nextBlink = 2.2,
        pulseT = 99;
      const onMove = (e: PointerEvent) => {
        Object.assign(mT, toWorld(e));
        tT.x = (mT.x - center.x) * -0.12;
        tT.y = (mT.y - center.y) * -0.12;
      };
      const onLeave = () => {
        mT.x = mT.y = 9;
        tT.x = tT.y = 0;
      };
      const onDown = (e: PointerEvent) => {
        if ((e.target as Element).closest("a, button")) return;
        const p = toWorld(e);
        gl.uniform2f(U.pulseAt, p.x, p.y);
        pulseT = 0;
        blinkT = 0;
        blinkTwice = Math.random() < 0.5;
      };
      stage!.addEventListener("pointermove", onMove);
      stage!.addEventListener("pointerleave", onLeave);
      stage!.addEventListener("pointerdown", onDown);

      let form = reduce ? 1 : 0,
        time = 0,
        matrixV = 0,
        shown = -1;
      let raf = 0,
        last = performance.now(),
        slow = 0;
      const total = D.n.toLocaleString("en");
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        const r = stage!.getBoundingClientRect(),
          vh = innerHeight;
        if (document.hidden || r.bottom < -120 || r.top > vh + 120) {
          last = now;
          return;
        }
        const raw = now - last;
        last = now;
        const dt = Math.min(0.05, raw / 1000);
        if (raw > 24 && raw < 200) {
          if (++slow > 50 && PR > 1) {
            PR = Math.max(1, PR - 0.25);
            slow = 0;
            layout();
          }
        } else slow = Math.max(0, slow - 1);
        // Gathers as the stage top rises from the bottom to the upper third.
        const fIn = reduce ? 1 : smooth(vh * 0.92, vh * 0.28, r.top);
        form += (fIn - form) * Math.min(1, dt * 4);
        const c = Math.round(D.n * Math.min(1, form * 1.02));
        if (c !== shown && countRef.current) {
          shown = c;
          countRef.current.textContent = `${c.toLocaleString("en")} / ${total}`;
        }
        stage!.classList.toggle("formed", form > 0.92);
        if (!reduce) {
          time += dt;
          if (time > nextBlink && blinkT < 0) {
            blinkT = 0;
            blinkTwice = Math.random() < 0.25;
            nextBlink = time + 2.6 + Math.random() * 3.6;
          }
        }
        let blink = 0;
        if (blinkT >= 0) {
          blinkT += dt;
          const bump = (c0: number) =>
            Math.max(0, 1 - Math.abs(blinkT - c0) / 0.085);
          blink = Math.max(bump(0.085), blinkTwice ? bump(0.29) : 0);
          if (blinkT > (blinkTwice ? 0.4 : 0.2)) blinkT = -1;
        }
        pulseT += dt;
        const lerp = mT.x > 8 ? 1 : 0.14;
        mouse.x += (mT.x - mouse.x) * lerp;
        mouse.y += (mT.y - mouse.y) * lerp;
        tilt.x += (tT.x - tilt.x) * 0.06;
        tilt.y += (tT.y - tilt.y) * 0.06;
        matrixV += (matrixRef.current - matrixV) * Math.min(1, dt * 6);

        gl.uniform1f(U.time, time);
        gl.uniform1f(U.form, form);
        gl.uniform1f(U.blink, blink);
        gl.uniform1f(U.pulseT, pulseT);
        gl.uniform1f(U.matrix, matrixV);
        gl.uniform2f(U.mouse, mouse.x, mouse.y);
        gl.uniform2f(U.tilt, tilt.x, tilt.y);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, N);
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        stage!.removeEventListener("pointermove", onMove);
        stage!.removeEventListener("pointerleave", onLeave);
        stage!.removeEventListener("pointerdown", onDown);
        // Free GPU objects but keep the context: Next hides visited pages
        // instead of unmounting them (cacheComponents → <Activity>) and re-runs
        // this effect on the same canvas when you come back.
        bufs.forEach((b) => gl.deleteBuffer(b));
        gl.deleteProgram(prog);
      };
    }

    return () => {
      cancelled = true;
      nearIo.disconnect();
      cleanup();
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className={`stage ${on ? "pm-on" : ""}`}
      aria-label="BuilderSpace mascot"
    >
      <canvas ref={canvasRef} className="stage-gl" aria-hidden />
      {/* Static fallback when WebGL is unavailable (and before data loads). */}
      <Image
        className="stage-mark"
        src="/mark-720.webp"
        alt=""
        width={720}
        height={463}
      />
      <div className="stage-frame" ref={frameRef} aria-hidden>
        <span className="c tl" />
        <span className="c tr" />
        <span className="c bl" />
        <span className="c br" />
        <span className="sf-l mono">BS-MASCOT · 02 PIECES</span>
        <span className="sf-r mono" ref={countRef}>
          0 / 17,561
        </span>
      </div>
      <Wordmark />
      <div className="wrap stage-in">
        <div>
          <p className="eyebrow mono" style={{ margin: 0 }}>
            <T zh="两块拼图 / Two pieces" en="Two pieces · one build" />
          </p>
          <p className="mute stage-cap">
            <T
              zh="靠近会躲开，点一下会眨眼。"
              en="Get close and they scatter. Tap and they blink."
            />
          </p>
        </div>
        {on && (
          <div className="seg" role="group" aria-label="Particle render mode">
            <button
              type="button"
              aria-pressed={!matrix}
              onClick={() => setMatrix(false)}
            >
              Particles
            </button>
            <button
              type="button"
              aria-pressed={matrix}
              onClick={() => setMatrix(true)}
            >
              Matrix
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
