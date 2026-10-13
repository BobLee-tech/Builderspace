"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/fx/motion";

// What a workshop session boils down to, typed out once the card is on screen.
const SCRIPT: [cls: "" | "c" | "ok", text: string][] = [
  ["c", "# 1. 先拆需求，再让 AI 写 / break it down first"],
  ["", "$ npx create-next-app my-first-page"],
  ["", '$ claude "做一个活动报名页，字段：昵称、专业"'],
  ["c", "# 2. 逐行读懂，改掉不需要的 / read every line"],
  ["", "$ npm run dev"],
  ["ok", "✓ Ready on http://localhost:3000"],
  ["", "$ vercel --prod"],
  ["ok", "✓ Deployed → my-first-page.vercel.app"],
];

export function Typewriter() {
  const ref = useRef<HTMLPreElement>(null);
  // [line index, characters shown on that line]; null = static, full script.
  const [at, setAt] = useState<[number, number] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let timer = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      let li = 0,
        ci = 0;
      const next = () => {
        if (li >= SCRIPT.length) return;
        const [cls, text] = SCRIPT[li];
        ci++;
        setAt([li, ci]);
        if (ci >= [...text].length) {
          li++;
          ci = 0;
          timer = window.setTimeout(next, cls === "ok" ? 380 : 220);
        } else timer = window.setTimeout(next, cls ? 8 : 22);
      };
      next();
    });
    // Blank the card, then type once it is on screen.
    timer = window.setTimeout(() => {
      setAt([0, 0]);
      io.observe(el);
    }, 0);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <pre className="term-body" ref={ref}>
      {SCRIPT.map(([cls, text], i) => {
        if (at && i > at[0]) return null;
        const shown =
          at && i === at[0] ? [...text].slice(0, at[1]).join("") : text;
        return (
          <div key={i} className={cls || undefined}>
            {shown}
            {at && i === at[0] && <span className="caret" />}
          </div>
        );
      })}
    </pre>
  );
}
