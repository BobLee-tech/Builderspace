"use client";

import { useEffect, useState } from "react";
import { T } from "@/components/t";

/**
 * A page's link with a copy button. Copies the full address on whatever host
 * this is; selects the text instead if copying is blocked.
 */
export function CopyLink({ path, label }: { path: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <span className="me-link">
      <a href={path}>{label}</a>
      <button
        type="button"
        className="linkish"
        onClick={async (e) => {
          const a = e.currentTarget.previousElementSibling;
          try {
            await navigator.clipboard.writeText(location.origin + path);
            setDone(true);
          } catch {
            const range = document.createRange();
            if (a) range.selectNodeContents(a);
            getSelection()?.removeAllRanges();
            getSelection()?.addRange(range);
          }
        }}
      >
        {done ? <T zh="已复制" en="Copied" /> : <T zh="复制" en="Copy" />}
      </button>
    </span>
  );
}
