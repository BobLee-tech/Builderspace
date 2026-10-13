import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

/** Button arrow in a round chip; two copies so hover can loop one out and one in. */
export function Arr({ diag = false }: { diag?: boolean }) {
  const Icon = diag ? ArrowUpRight : ArrowRight;
  return (
    <span className={diag ? "arr diag" : "arr"} aria-hidden>
      <b>
        <Icon weight="light" size="1.15em" />
      </b>
      <b>
        <Icon weight="light" size="1.15em" />
      </b>
    </span>
  );
}

/** HUD corner brackets for a surface (the parent needs the `hud` class). */
export function Hud() {
  return (
    <>
      <span className="c tl" aria-hidden />
      <span className="c tr" aria-hidden />
      <span className="c bl" aria-hidden />
      <span className="c br" aria-hidden />
    </>
  );
}
