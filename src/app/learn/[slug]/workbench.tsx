"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Book,
  Check,
  GearSix,
  Globe,
  Plus,
  Pulse,
  UploadSimple,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { T } from "@/components/t";
import {
  fillUser,
  PLACEHOLDER,
  type EventMaterials,
  type KitIcon,
  type MaterialPath,
} from "@/lib/event-materials";
import { PosterDialog } from "./poster";

type Bi = { zh: string; en: string };
type Lang = "zh" | "en";

const KIT_ICONS: Record<KitIcon, Icon> = {
  globe: Globe,
  book: Book,
  upload: UploadSimple,
  gear: GearSix,
  pulse: Pulse,
};

/** Shared by every materials page: one GitHub username per visitor. */
const USER_KEY = "materials:github";

const currentLang = (): Lang =>
  document.documentElement.dataset.lang === "en" ? "en" : "zh";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode: it just won't be remembered.
  }
}

/** A prompt's text with 【…】 / […] picked out. */
function marked(text: string) {
  return text
    .split(PLACEHOLDER)
    .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/** Both languages of a template, filled with the username. */
function Filled({ t, user, marks }: { t: Bi; user: string; marks?: boolean }) {
  const one = (l: Lang) => {
    const s = fillUser(t[l], user, l);
    return marks ? marked(s) : s;
  };
  return <T zh={one("zh")} en={one("en")} />;
}

/** "a" + "b" in the visitor's language: Chinese runs on, English adds a space. */
const join = (a: Bi, b?: Bi): Bi =>
  b ? { zh: a.zh + b.zh, en: `${a.en} ${b.en}` } : a;

export function Workbench({
  slug,
  m,
  head,
  wall,
}: {
  slug: string;
  m: EventMaterials;
  head: ReactNode;
  wall: ReactNode;
}) {
  const pathKey = `materials:${slug}:path`;
  const stepsKey = `materials:${slug}:steps`;
  const [user, setUser] = useState("");
  const [path, setPath] = useState<MaterialPath>(m.paths[0].id);
  const [done, setDone] = useState<number[]>([]);
  const [toast, setToast] = useState<Bi | null>(null);
  const [poster, setPoster] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // What this visitor typed, picked and ticked last time, once mounted.
  useEffect(() => {
    const savedPath = read(pathKey);
    let savedSteps: number[] = [];
    try {
      savedSteps = JSON.parse(read(stepsKey) ?? "[]");
    } catch {}
    /* eslint-disable react-hooks/set-state-in-effect -- read once after hydration */
    setUser(read(USER_KEY) ?? "");
    if (m.paths.some((p) => p.id === savedPath))
      setPath(savedPath as MaterialPath);
    setDone(savedSteps);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [m.paths, pathKey, stepsKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const pick = (p: MaterialPath, scroll = false) => {
    setPath(p);
    write(pathKey, p);
    if (scroll)
      document
        .getElementById(`panel-${p}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const tick = (i: number) => {
    const next = done.includes(i) ? done.filter((d) => d !== i) : [...done, i];
    setDone(next);
    write(stepsKey, JSON.stringify(next));
  };
  const needUser = () => {
    input.current?.focus();
    setToast({
      zh: "先填 GitHub 用户名",
      en: "Add your GitHub username first",
    });
  };

  /** A link whose address needs the username: inert until there is one. */
  const link = (href: string) =>
    href.includes("{u}") && !user
      ? {
          "aria-disabled": true,
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            needUser();
          },
        }
      : {
          href: fillUser(href, user, "en"),
          ...(href.startsWith("/")
            ? {}
            : { target: "_blank", rel: "noreferrer" }),
        };

  /** Copies a template in the language on screen. */
  const copier = (t: Bi) => () => {
    if (!user && (t.zh.includes("{u}") || t.en.includes("{u}")))
      setToast({
        zh: "填上 GitHub 用户名，提示词就是你的了",
        en: "Add your GitHub username to fill it in",
      });
    const l = currentLang();
    return fillUser(t[l], user, l);
  };

  const steps = m.steps.length;

  return (
    <div className="mat-bench">
      <div className="mat-head">
        {head}
        <p className="mat-ask">
          <T zh="你现在是哪种情况？" en="Where are you at?" />
        </p>
        <div className="mat-paths" role="tablist" aria-label="Paths / 选一条路">
          {m.paths.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={path === p.id}
              aria-controls={`panel-${p.id}`}
              className="mat-path"
              onClick={() => pick(p.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art */}
              <img src={`/mascots/${p.spark}.svg`} alt="" />
              <b>
                <T {...p.title} />
              </b>
              <span>
                <T {...p.sub} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="mat-kit-col">
        <div className="mat-kit surf">
          <h2 className="mat-kit-h">Your kit.</h2>
          <label className="mat-field" htmlFor="materials-user">
            <span className="mono">github.com/</span>
            <input
              id="materials-user"
              ref={input}
              value={user}
              placeholder="username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value
                  .trim()
                  .replace(/^@/, "")
                  .replace(/[^A-Za-z0-9-]/g, "");
                setUser(v);
                write(USER_KEY, v);
              }}
            />
          </label>
          <p className="mat-hint">
            {user ? (
              <T
                zh="都换成你的了，下次打开还在。"
                en="All yours now. It stays for next time."
              />
            ) : (
              <T
                zh="填一次，链接和提示词都换成你的。"
                en="Add it once; every link and prompt fills in."
              />
            )}
          </p>
          <ul className={user ? "mat-links" : "mat-links off"}>
            {m.kit.map((k) => {
              const Glyph = KIT_ICONS[k.icon];
              return (
                <li key={k.title.en}>
                  <a {...link(k.href)}>
                    <Glyph weight="light" size={18} aria-hidden />
                    <span>
                      <b>
                        <T {...k.title} />
                      </b>
                      <small className="mono">
                        <Filled t={k.sub} user={user} />
                      </small>
                    </span>
                    <ArrowUpRight
                      weight="light"
                      size={14}
                      className="mat-arr"
                      aria-hidden
                    />
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mat-kit-row">
            <button
              type="button"
              className="btn solid primary"
              onClick={() => setPoster(true)}
            >
              <T zh="存一张图" en="Save as image" />
            </button>
            <a href="/prompt" className="btn ghost">
              <T zh="提示词工具" en="Prompt tool" />
            </a>
          </div>
        </div>
      </aside>

      <div className="mat-work">
        {m.paths.map((p) => (
          <section
            key={p.id}
            id={`panel-${p.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${p.id}`}
            className="mat-panel"
            hidden={path !== p.id}
          >
            <div className="mat-panel-h">
              <h2>
                <T {...p.head} />
              </h2>
              <p>
                <T {...p.note} />
              </p>
            </div>

            {p.id === "edit" && (
              <>
                <div className="mat-note">
                  <div>
                    <b>
                      <T
                        zh="找不到当天的对话？"
                        en="Lost the chat from the day?"
                      />
                    </b>
                    <span>
                      <T
                        zh="新开一个，先发这条，AI 就接上了。"
                        en="Start a new one and send this first. The AI picks up from there."
                      />
                    </span>
                  </div>
                  <CopyButton text={copier(m.handoff)} />
                </div>
                <div className="mat-slips">
                  {m.changes.map((c) => {
                    const full = join(c.prompt, m.push);
                    return (
                      <Slip
                        key={c.title.en}
                        title={c.title}
                        text={copier(full)}
                      >
                        <Filled t={full} user={user} marks />
                      </Slip>
                    );
                  })}
                </div>
              </>
            )}

            {p.id === "start" && (
              <>
                <div className="mat-meter">
                  <span className="mat-track">
                    <i style={{ width: `${(done.length / steps) * 100}%` }} />
                  </span>
                  <span className="mono">
                    {done.length} / {steps}
                    {done.length === steps && (
                      <T zh=" · 上线了" en=" · You're online" />
                    )}
                  </span>
                </div>
                <ol className="mat-steps">
                  {m.steps.map((s, i) => (
                    <li
                      key={s.title.en}
                      className={done.includes(i) ? "done" : undefined}
                    >
                      <button
                        type="button"
                        className="mat-tick"
                        aria-pressed={done.includes(i)}
                        aria-label={`${i + 1} · ${s.title.en}`}
                        onClick={() => tick(i)}
                      >
                        {done.includes(i) ? (
                          <Check weight="bold" size={16} aria-hidden />
                        ) : (
                          i + 1
                        )}
                      </button>
                      <div className="mat-step">
                        <b>
                          <T {...s.title} />
                        </b>
                        {s.sub && (
                          <p>
                            <T {...s.sub} />
                          </p>
                        )}
                        {s.subs && (
                          <ol className="mat-subs">
                            {s.subs.map((x) => (
                              <li key={x.en}>
                                <T {...x} />
                              </li>
                            ))}
                          </ol>
                        )}
                        {s.actions && (
                          <div className="mat-acts">
                            {s.actions.map((a) =>
                              a.kind === "link" ? (
                                <a
                                  key={a.label.en}
                                  className={
                                    a.solid ? "mat-chip solid" : "mat-chip"
                                  }
                                  {...link(a.href)}
                                >
                                  <T {...a.label} />
                                  {!a.href.startsWith("/") && (
                                    <ArrowUpRight
                                      weight="light"
                                      size={14}
                                      aria-hidden
                                    />
                                  )}
                                </a>
                              ) : a.kind === "copy" ? (
                                <CopyButton
                                  key={a.label.en}
                                  solid
                                  label={a.label}
                                  text={copier(m.deployPrompt)}
                                />
                              ) : (
                                <button
                                  key={a.label.en}
                                  type="button"
                                  className="mat-chip"
                                  onClick={() => pick(a.to, true)}
                                >
                                  <T {...a.label} />
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {p.id === "stuck" && (
              <ul className="mat-faq">
                {m.stuck.map((s, i) => {
                  const ask = s.prompt;
                  return (
                    <li key={s.title.en}>
                      <details open={i === 0}>
                        <summary>
                          <b>
                            <T {...s.title} />
                          </b>
                          <Plus weight="light" size={18} aria-hidden />
                        </summary>
                        <div className="mat-fix">
                          <div className="mat-checks">
                            <ol className="mat-subs">
                              {s.checks.map((c) => (
                                <li key={c.en}>
                                  <T {...c} />
                                </li>
                              ))}
                            </ol>
                            {s.link && (
                              <div className="mat-acts">
                                <a className="mat-chip" {...link(s.link.href)}>
                                  <T {...s.link.label} />
                                  <ArrowUpRight
                                    weight="light"
                                    size={14}
                                    aria-hidden
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                          <Slip
                            title={{ zh: "发给 AI", en: "Tell the AI" }}
                            small
                            text={copier(ask)}
                          >
                            <Filled t={ask} user={user} marks />
                          </Slip>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
        {wall}
      </div>

      <PosterDialog
        open={poster}
        onClose={() => setPoster(false)}
        user={user}
        slug={slug}
        poster={m.poster}
      />
      <div className={toast ? "mat-toast on" : "mat-toast"} role="status">
        {toast && <T {...toast} />}
      </div>
    </div>
  );
}

/** A titled prompt with its copy button. */
function Slip({
  title,
  text,
  small,
  children,
}: {
  title: Bi;
  text: () => string;
  small?: boolean;
  children: ReactNode;
}) {
  const pre = useRef<HTMLPreElement>(null);
  return (
    <div className="mat-slip">
      <div className="mat-slip-top">
        {small ? (
          <span className="mono mute">
            <T {...title} />
          </span>
        ) : (
          <b>
            <T {...title} />
          </b>
        )}
        <CopyButton text={text} select={pre} />
      </div>
      <pre ref={pre}>{children}</pre>
    </div>
  );
}

/**
 * Copies on click; where the clipboard is refused it selects the text on
 * screen instead, so a long-press or ⌘C still works.
 */
function CopyButton({
  text,
  label,
  solid,
  select,
}: {
  text: () => string;
  label?: Bi;
  solid?: boolean;
  select?: React.RefObject<HTMLElement | null>;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className={done ? "mat-chip done" : solid ? "mat-chip solid" : "mat-chip"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text());
          setDone(true);
        } catch {
          const el = select?.current?.querySelector(
            `[data-l="${currentLang()}"]`,
          );
          if (!el) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          getSelection()?.removeAllRanges();
          getSelection()?.addRange(range);
        }
      }}
    >
      {done ? (
        <T zh="已复制" en="Copied" />
      ) : (
        <T {...(label ?? { zh: "复制", en: "Copy" })} />
      )}
    </button>
  );
}
