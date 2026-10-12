"use client";

import { useState, useSyncExternalStore } from "react";
import { LANG_STORAGE_KEY } from "./t";

type Lang = "zh" | "en";

function applyLang(next: Lang) {
  const root = document.documentElement;
  if (next === "en") root.dataset.lang = "en";
  else delete root.dataset.lang;
  root.lang = next === "en" ? "en" : "zh-CN";
  try {
    localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch {
    // Private mode: the choice just won't persist.
  }
}

// The boot script sets data-lang before hydration; read it as an external store.
const readLang = (): Lang =>
  document.documentElement.dataset.lang === "en" ? "en" : "zh";
const noopSubscribe = () => () => {};

export function LangToggle() {
  const initial = useSyncExternalStore(noopSubscribe, readLang, () => "zh");
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang = picked ?? initial;

  return (
    <div className="lang" role="group" aria-label="Language / 语言">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => {
            applyLang(l);
            setPicked(l);
          }}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}
