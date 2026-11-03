"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";

/** Copies `text`; selects the element before it instead if copying is blocked. */
export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className="pt-copy mono"
      onClick={async (e) => {
        const prev = e.currentTarget.previousElementSibling;
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          const range = document.createRange();
          if (prev) range.selectNodeContents(prev);
          getSelection()?.removeAllRanges();
          getSelection()?.addRange(range);
        }
      }}
    >
      {done ? <T zh="已复制" en="Copied" /> : <T zh="复制" en="Copy" />}
    </button>
  );
}
