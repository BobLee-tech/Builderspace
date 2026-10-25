"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/components/fx/motion";
import { getSmoothScroller } from "@/lib/smooth-scroll";

/**
 * A panel over the current page for an intercepted route (app/@sheet): from the
 * right on desktop, from the bottom on phones. Closing goes back in history,
 * so the browser's back button closes it too and the URL returns to the page
 * underneath. The page behind stops scrolling while it is open.
 */
export function Sheet({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"in" | "open" | "out">("in");
  const closing = useRef(false);

  // Once only: a second Escape or click must not go back a page further.
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (prefersReducedMotion()) return router.back();
    setState("out");
    setTimeout(() => router.back(), 260);
  }, [router]);

  useEffect(() => {
    // Next keeps a route it left alive but hidden (<Activity>) and shows the
    // same instance again on the next visit, so every showing starts afresh.
    closing.current = false;
    const raf = requestAnimationFrame(() => setState("open"));
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const lenis = getSmoothScroller();
    lenis?.stop();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    // Escape closes, unless something inside already used it (the studio
    // drops a selected sticker); that listener may run after this one.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setTimeout(() => {
        if (!e.defaultPrevented) close();
      });
    };
    addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
      lenis?.start();
      opener?.focus?.({ preventScroll: true });
    };
  }, [close]);

  return (
    <div className="sheet-root" data-state={state}>
      <div className="sheet-scrim" onClick={close} aria-hidden />
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <button
          type="button"
          className="sheet-x"
          onClick={close}
          aria-label="关闭 / Close"
        >
          <X weight="light" size={18} aria-hidden />
        </button>
        <div className="sheet-body" data-lenis-prevent>
          {children}
        </div>
      </div>
    </div>
  );
}
