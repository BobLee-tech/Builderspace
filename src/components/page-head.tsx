import { Fragment } from "react";
import { PageHeadFx } from "./fx/page-head-fx";
import { Scramble } from "./fx/text-fx";
import { NAV_LINKS } from "./nav-links";
import { T, type Bi } from "./t";

/** Words of a title with the running letter index each one starts at. */
function words(text: string) {
  let at = 0;
  return text.split(" ").map((word) => {
    const w = { word, at };
    at += word.length + 1;
    return w;
  });
}

type Readout = { k: Bi; v: { zh: string; en: string } };

/**
 * The two-line display title: chrome letters that rise in one by one, then an
 * outline lit by a moving light (wrap it in PageHeadFx for the light).
 */
export function LitTitle({
  title: [first, second],
  as: Tag = "h1",
  className = "page-title",
}: {
  title: [string, string?];
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Tag
      className={`display ${className}`}
      aria-label={second ? `${first} ${second}` : first}
    >
      <span className="line" aria-hidden>
        <span className="ttl-a">
          {words(first).map(({ word, at }, w) => (
            <Fragment key={w}>
              {w > 0 && " "}
              {/* Letters animate one by one; words stay unbroken. */}
              <span style={{ whiteSpace: "nowrap" }}>
                {[...word].map((c, i) => (
                  <span
                    key={i}
                    className="c2"
                    style={{ "--i": at + i } as React.CSSProperties}
                  >
                    {c}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </span>
      </span>
      {second && (
        <span className="line" aria-hidden>
          <span className="outline lit">{second}</span>
        </span>
      )}
    </Tag>
  );
}

/**
 * Shared inner-page header from the prototype: one slim terminal bar (path,
 * eyebrow, page number), a two-line title (chrome letters + an outline lit by
 * a moving light) and three readouts.
 */
export function PageHead({
  path,
  eyebrow,
  title: [first, second],
  aside,
}: {
  /** Segment after ~/builderspace/, also used to number the page. */
  path: string;
  eyebrow: Bi;
  title: [string, string?];
  aside?: Readout[];
}) {
  const idx = NAV_LINKS.findIndex((l) => l.href === `/${path.split("/")[0]}`);
  return (
    <PageHeadFx>
      <div className="ph-bar mono">
        <span className="ph-path" aria-hidden>
          <span className="mute">~/builderspace/</span>
          <b>{path}</b>
        </span>
        <p className="ph-eye">
          <T {...eyebrow} />
        </p>
        <span className="ph-rule" aria-hidden>
          <i />
        </span>
        {idx >= 0 && (
          <span className="ph-idx" aria-hidden>
            <b>{String(idx + 1).padStart(2, "0")}</b> /{" "}
            {String(NAV_LINKS.length).padStart(2, "0")}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <LitTitle title={[first, second]} />
      </div>
      {aside && (
        <dl className="page-aside">
          {aside.map(({ k, v }, i) => (
            <div key={i}>
              <dt className="mono mute">
                <T {...k} />
              </dt>
              <dd>
                <T
                  zh={
                    <Scramble text={v.zh} delay={350 + i * 110} frames={22} />
                  }
                  en={
                    <Scramble text={v.en} delay={350 + i * 110} frames={22} />
                  }
                />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </PageHeadFx>
  );
}
