import { T, type Bi } from "./t";

/**
 * Short facts as numbered readouts on hairlines, in place of an intro
 * paragraph: a mono label over a few words each.
 */
export function SpecRow({ items }: { items: { k: Bi; v: Bi }[] }) {
  return (
    <dl
      className="spec-row"
      style={{ "--n": items.length } as React.CSSProperties}
    >
      {items.map(({ k, v }, i) => (
        <div key={i}>
          <dt className="mono mute">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <T {...k} />
          </dt>
          <dd>
            <T {...v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
