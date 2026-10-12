"use client";

import { useEffect, useRef } from "react";
import { createProgram } from "@/lib/webgl";

// Ported from the prototype: ray-marched liquid-metal blobs, shaded with a
// studio environment, then 1-bit Bayer 8×8 dithered. Rendered at half (or
// lower) resolution and upscaled with `image-rendering: pixelated`.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uTime, uShift, uScroll;
uniform vec2 uRes, uMouse;
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float bayer4(vec2 a){ return bayer2(.5 * a) * .25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(.5 * a) * .25 + bayer2(a); }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float map(vec3 p){
  p.x -= uShift;
  p *= 1.45;
  float t = uTime * .35;
  vec3 m = vec3((uMouse.x - .5) * 2.4, (uMouse.y - .5) * 2.4, .4);
  float d = length(p - vec3(sin(t) * .9, cos(t * 1.3) * .45, sin(t * .7) * .4)) - .82;
  d = smin(d, length(p - vec3(cos(t * .8) * 1.15, sin(t * 1.1) * .75, cos(t) * .5)) - .55, .65);
  d = smin(d, length(p - vec3(sin(t * 1.7) * .55, sin(t * .9) * .95, .35)) - .44, .6);
  d = smin(d, length(p - vec3(-cos(t * 1.2) * .7, -sin(t * .6) * .9, -.2)) - .5, .6);
  d = smin(d, length(p - m) - .32, .75);
  d += sin(p.x * 5. + uTime * .9) * sin(p.y * 5. + uTime * 1.1) * sin(p.z * 5. + uTime * .7) * .025;
  return d / 1.45;
}
vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.); const float h = .002;
  return normalize(k.xyy * map(p + k.xyy * h) + k.yyx * map(p + k.yyx * h) + k.yxy * map(p + k.yxy * h) + k.xxx * map(p + k.xxx * h));
}
float studio(vec3 r){
  float top = smoothstep(.25, .32, r.y) * .95;
  float strip = smoothstep(.55, .6, r.x) * smoothstep(.95, .6, r.x) * .8;
  float back = smoothstep(.7, .9, -r.z) * .35;
  float bands = (.5 + .5 * sin(r.y * 14. + uTime * .3)) * .08;
  float horizon = exp(-abs(r.y + .05) * 18.) * .55;
  return top + strip + back + bands + horizon + .03;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  uv.y += uScroll * .25;
  vec3 ro = vec3(0., 0., 4.2);
  vec3 rd = normalize(vec3(uv, -1.65));
  float t = 0., d; bool hit = false;
  // Bounding-sphere cull: only pixels that pass the blob region ray-march.
  vec3 oc = ro - vec3(uShift, 0., 0.);
  float b = dot(oc, rd), h = b * b - dot(oc, oc) + 1.75 * 1.75;
  if (h > 0.) {
    float tmax = -b + sqrt(h);
    t = max(0., -b - sqrt(h));
    for (int i = 0; i < 56; i++) {
      d = map(ro + rd * t);
      if (d < .0015) { hit = true; break; }
      t += d * .92;
      if (t > tmax) break;
    }
  }
  float c;
  if (hit) {
    vec3 p = ro + rd * t, n = nrm(p), r = reflect(rd, n);
    float fres = pow(1. + dot(rd, n), 3.);
    c = studio(r) * .9 + fres * .55;
    c *= .55 + .45 * clamp(dot(n, normalize(vec3(.4, .8, .6))), 0., 1.);
    c += pow(max(dot(r, normalize(vec3(-.3, .7, .6))), 0.), 40.) * .9;
  } else {
    float g = exp(-length(uv - vec2(uShift * .32, 0.)) * 2.2) * .12;
    c = g + (hash(gl_FragCoord.xy + floor(uTime * 12.)) - .5) * .03;
  }
  c = clamp(c, 0., 1.);
  float o = step(bayer8(gl_FragCoord.xy), pow(c, 1.15));
  gl_FragColor = vec4(vec3(o) * vec3(.957, .957, .949), 1.);
}`;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

// Contexts waiting to be released after unmount. In development React runs the
// effect, cleans up, and runs it again on the same canvas; releasing the
// context straight away left that second run with a dead canvas.
const pendingRelease = new WeakMap<HTMLCanvasElement, number>();

export function HeroMetal() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const hero = canvas?.parentElement;
    if (!canvas || !hero) return;
    window.clearTimeout(pendingRelease.get(canvas));
    const gl = canvas.getContext("webgl", {
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;
    const prog = createProgram(gl, VERT, FRAG);
    if (!prog) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uTime = u("uTime"),
      uRes = u("uRes"),
      uMouse = u("uMouse"),
      uShift = u("uShift"),
      uScroll = u("uScroll");

    let pr = 0.5;
    let time = 0;
    const mouse = { x: 0.7, y: 0.5 };
    const target = { x: 0.7, y: 0.5 };

    const size = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      canvas.width = Math.floor(r.width * pr);
      canvas.height = Math.floor(r.height * pr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      // Desktop pushes the blobs to the right of the headline; phones centre them.
      gl.uniform1f(
        uShift,
        r.width > 720 ? 1.27 * (r.width / r.height) * 0.52 : 0,
      );
    };
    const draw = () => {
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uScroll, Math.min(1, scrollY / innerHeight));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const ro = new ResizeObserver(() => {
      size();
      draw();
    });
    ro.observe(canvas);
    size();
    draw();
    canvas.dataset.on = "";

    // Weak or software GPUs can drop the context under this shader. Fade the
    // canvas out then, so the hero falls back to plain black instead of
    // showing a dead canvas.
    let lost = false;
    const onLost = () => {
      lost = true;
      delete canvas.dataset.on;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };
    hero.addEventListener("pointermove", onMove);

    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
    });
    io.observe(hero);

    let raf = 0;
    let last = performance.now();
    let slow = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const raw = now - last;
      last = now;
      if (!visible || lost || document.hidden) return;
      // Adaptive resolution: keep dropping detail while frames run long.
      if (raw > 26 && raw < 200) {
        if (++slow > 45 && pr > 0.3) {
          pr = Math.round((pr - 0.08) * 100) / 100;
          slow = 0;
          size();
        }
      } else slow = Math.max(0, slow - 1);
      time += Math.min(0.05, raw / 1000);
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;
      draw();
    };
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      hero.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      pendingRelease.set(
        canvas,
        window.setTimeout(() => {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }, 0),
      );
    };
  }, []);

  return <canvas ref={ref} className="hero-gl" aria-hidden />;
}
