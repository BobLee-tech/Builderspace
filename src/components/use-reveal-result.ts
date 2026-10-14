"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { revealElement } from "@/lib/smooth-scroll";

const HEADER = 96;

function outOfView(el: Element) {
  const r = el.getBoundingClientRect();
  return r.top < HEADER || r.top > innerHeight * 0.6;
}

/**
 * After a submit the page stays where the button was. On success the shorter
 * confirmation would then sit above the viewport, and on a validation error
 * the first problem is often far up the form; bring either into view.
 * Put the returned ref on the element that holds both the form and the
 * confirmation (a callback ref, so it fits any element type).
 */
export function useRevealResult(state: FormState) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || state.status === "idle") return;
    if (state.status === "ok") {
      if (outOfView(root)) revealElement(root, -HEADER);
      return;
    }
    const first = root.querySelector(".err");
    const target = first?.closest<HTMLElement>(".field, .consent") ?? first;
    if (!(target instanceof HTMLElement)) return;
    if (outOfView(target)) revealElement(target, -HEADER - 24);
    target
      .querySelector<HTMLElement>("input:not([type=hidden]), textarea")
      ?.focus({ preventScroll: true });
  }, [state]);
  return useCallback((el: HTMLElement | null) => {
    ref.current = el;
  }, []);
}
