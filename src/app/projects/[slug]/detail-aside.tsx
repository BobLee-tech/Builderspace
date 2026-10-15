"use client";

import { Check, Copy } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { T } from "@/components/t";
import { revealElement } from "@/lib/smooth-scroll";

/** The owner's contact with a copy button; falls back to selecting the text. */
export function ContactCopy({ contact }: { contact: string }) {
  const text = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState<"copied" | "selected" | null>(null);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div className="d-contact">
      <span ref={text}>{contact}</span>
      <button
        type="button"
        className="ibtn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(contact);
            setDone("copied");
          } catch {
            const range = document.createRange();
            if (text.current) range.selectNodeContents(text.current);
            getSelection()?.removeAllRanges();
            getSelection()?.addRange(range);
            setDone("selected");
          }
        }}
      >
        {done === "copied" ? (
          <Check weight="light" size={14} aria-hidden />
        ) : (
          <Copy weight="light" size={14} aria-hidden />
        )}
        {done === "copied" ? (
          <T zh="已复制" en="Copied" />
        ) : done === "selected" ? (
          <T zh="已选中" en="Selected" />
        ) : (
          <T zh="复制" en="Copy" />
        )}
      </button>
    </div>
  );
}

/** In-page index; the section being read is marked as current. */
export function DetailToc({
  items,
}: {
  items: { id: string; label: ReactNode; count?: number }[];
}) {
  const [current, setCurrent] = useState(items[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);
  return (
    <nav className="d-toc" aria-label="本页 / On this page">
      {items.map(({ id, label, count }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={current === id ? "location" : undefined}
          onClick={(e) => {
            const el = document.getElementById(id);
            if (!el) return;
            e.preventDefault();
            revealElement(el, -96);
            history.replaceState(null, "", `#${id}`);
          }}
        >
          <span>{label}</span>
          {count !== undefined && <span className="n">{count}</span>}
        </a>
      ))}
    </nav>
  );
}
