"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { T } from "@/components/t";

/**
 * The deploy prompt in both languages (CSS shows one) with a button that
 * copies the one on screen. If the clipboard is blocked it selects the text.
 */
export function DeployPrompt({ zh, en }: { zh: string; en: string }) {
  const [done, setDone] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);

  async function copy() {
    const english = document.documentElement.dataset.lang === "en";
    try {
      await navigator.clipboard.writeText(english ? en : zh);
      setDone(true);
    } catch {
      const pre = box.current?.querySelector(
        `pre[data-l="${english ? "en" : "zh"}"]`,
      );
      if (!pre) return;
      const range = document.createRange();
      range.selectNodeContents(pre);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
  }

  return (
    <div className="mat-prompt" ref={box}>
      <div className="mat-prompt-top mono mute">
        <T
          zh="只换掉 <用户名> 和最后的 HTML"
          en="Change only <username> and the HTML at the end"
        />
        <button type="button" className="mat-copy mono" onClick={copy}>
          {done ? (
            <Check weight="light" size={14} aria-hidden />
          ) : (
            <Copy weight="light" size={14} aria-hidden />
          )}
          {done ? <T zh="已复制" en="Copied" /> : <T zh="复制" en="Copy" />}
        </button>
      </div>
      <pre data-l="zh">{zh}</pre>
      <pre data-l="en" lang="en">
        {en}
      </pre>
    </div>
  );
}
