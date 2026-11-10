import { Arr } from "@/components/fx/arr";
import { T } from "@/components/t";
import type { EventLine, EventPerson, EventSection } from "@/lib/event-pages";
import { EVENT_ICONS as ICONS } from "../event-parts";
import { CollectorDiagram } from "./collector-diagram";

/**
 * The blocks an event page lists under its intro (event-pages.ts), in order.
 * Short lines only; layouts switch to one column when the column is narrow.
 */
export function EventSections({ sections }: { sections: EventSection[] }) {
  return sections.map((s, i) => (
    <div key={i} className="evp-sec">
      <h2 className="evp-sec-h mono mute">
        <T {...s.heading} />
      </h2>
      <Section s={s} />
    </div>
  ));
}

function Section({ s }: { s: EventSection }) {
  switch (s.kind) {
    case "parts":
      return (
        <div className="evx-parts">
          {s.parts.map((p) => (
            <div key={p.title.en} className="evx-part">
              <div className="evx-part-h">
                <h3>
                  <T {...p.title} />
                </h3>
                <Person who={p.who} />
              </div>
              <Lines items={p.items} />
            </div>
          ))}
        </div>
      );
    case "cards":
      return (
        <ul className={`evx-cards cols-${s.cols}`}>
          {s.items.map((c) => (
            <li key={c.title.en} className={c.maybe ? "maybe" : undefined}>
              {c.mark && (
                <span className="evx-mark" aria-hidden>
                  {c.mark}
                </span>
              )}
              <span className="evx-card-t">
                {c.label && <span className="mono mute">{c.label}</span>}
                <b>
                  <T {...c.title} />
                  {c.maybe && (
                    <span className="evx-maybe mono">
                      <T zh="待定" en="TBC" />
                    </span>
                  )}
                </b>
                <span className="mute">
                  <T {...c.sub} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      );
    case "terms":
      return (
        <dl className="evx-terms">
          {s.items.map((t) => (
            <div key={t.term}>
              <dt lang="en">{t.term}</dt>
              <dd className="mute">
                <T {...t.sub} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "flow": {
      const total = s.steps.reduce((n, st) => n + st.minutes, 0);
      const clock = s.start ? clockTimes(s.start, s.steps) : null;
      return (
        <>
          <ol
            className="evx-flow"
            aria-label={`${Math.round(total / 6) / 10} h`}
          >
            {s.steps.map((st, i) => (
              <li
                key={st.label.en}
                className={st.hands ? "hands" : st.rest ? "rest" : undefined}
                style={{ flexGrow: st.minutes }}
                title={`${st.minutes}′`}
              >
                <b>
                  <T {...st.label} />
                </b>
                {clock ? (
                  <time className="mono mute">{clock[i]}</time>
                ) : (
                  <span className="mono mute">{st.minutes}′</span>
                )}
              </li>
            ))}
          </ol>
          <p className="evx-legend mute">
            <span>
              <i className="sw hands" aria-hidden />
              <T zh="动手时间" en="Hands-on" />
            </span>
            {s.note && (
              <span>
                <T {...s.note} />
              </span>
            )}
            {clock && (
              <span>
                <T
                  zh={`${clock[clock.length - 1]} 结束`}
                  en={`Ends ${clock[clock.length - 1]}`}
                />
              </span>
            )}
          </p>
        </>
      );
    }
    case "steps":
      return (
        <>
          <ol className="evx-steps">
            {s.steps.map((st, i) => (
              <li key={st.title.en} className={st.room ? "room" : undefined}>
                <span className="mono mute">{String(i).padStart(2, "0")}</span>
                <b>
                  <T {...st.title} />
                </b>
                <span className="mute">
                  <T {...st.sub} />
                </span>
              </li>
            ))}
          </ol>
          <p className="evx-legend mute">
            <span>
              <i className="sw dot" aria-hidden />
              <T {...s.legend.robot} />
            </span>
            <span>
              <i className="sw ring" aria-hidden />
              <T {...s.legend.room} />
            </span>
            {s.legend.note && (
              <span>
                <T {...s.legend.note} />
              </span>
            )}
          </p>
        </>
      );
    case "collector":
      return (
        <div className="evx-build">
          <CollectorDiagram />
          <dl className="evx-fleet">
            {s.fleet.map((f) => (
              <div key={f.label.en}>
                <dd>
                  {f.count}
                  {f.spare !== undefined && (
                    <small className="mono mute">+{f.spare}</small>
                  )}
                </dd>
                <dt>
                  <b>
                    <T {...f.label} />
                  </b>
                  <span className="mute">
                    <T {...f.sub} />
                  </span>
                </dt>
              </div>
            ))}
          </dl>
          <ul className="evx-lines evx-layers">
            {s.layers.map((l) => (
              <li key={l.label.en}>
                <span className="mono mute">
                  <T {...l.label} />
                </span>
                <b>
                  <T {...l.title} />
                </b>
                {l.sub && (
                  <span className="mute">
                    <T {...l.sub} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    case "bar":
      return (
        <div className="evx-bar">
          <div className="evx-quote">
            <p>
              {s.quote.map((q) => (
                <span key={q.en}>
                  <T {...q} />
                </span>
              ))}
            </p>
            <span className="mute">
              <T {...s.sub} />
            </span>
          </div>
          <ul className="evx-help">
            {s.help.map((h) => {
              const Glyph = ICONS[h.icon];
              return (
                <li key={h.title.en}>
                  <Glyph weight="light" size={20} aria-hidden />
                  <b>
                    <T {...h.title} />
                  </b>
                  <span className={h.tbc ? "mute evx-tbc" : "mute"}>
                    <T {...h.sub} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "guest":
      return (
        <div className="evx-guest">
          <div className="evx-guest-who">
            <Person who={s.who} big />
            {s.link && (
              <a
                href={s.link.href}
                target="_blank"
                rel="noreferrer"
                className="btn ghost"
                style={{ "--h": "38px" } as React.CSSProperties}
              >
                <T {...s.link.label} /> <Arr diag />
              </a>
            )}
          </div>
          <Lines items={s.items} />
        </div>
      );
  }
}

function Person({ who, big }: { who: EventPerson; big?: boolean }) {
  return (
    <div className={big ? "evx-who big" : "evx-who"}>
      <span className="evx-av" aria-hidden>
        {who.initial}
      </span>
      <span>
        <b>{who.name}</b>
        <span className="mute">
          <T {...who.role} />
        </span>
      </span>
    </div>
  );
}

function Lines({ items }: { items: EventLine[] }) {
  return (
    <ul className="evx-lines">
      {items.map((it, i) => (
        <li key={it.title.en}>
          <span className="mono mute">
            {it.mark ?? String(i + 1).padStart(2, "0")}
          </span>
          <b>
            <T {...it.title} />
          </b>
          {it.sub && (
            <span className="mute">
              <T {...it.sub} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Each step's start as a clock time, from the first one ("10:30"), then the
 * end of the last.
 */
function clockTimes(start: string, steps: { minutes: number }[]): string[] {
  const [h, m] = start.split(":").map(Number);
  const at = [h * 60 + m];
  for (const st of steps) at.push(at[at.length - 1] + st.minutes);
  return at.map(
    (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`,
  );
}
