/** Button arrow in a round chip; two copies so hover can loop one out and one in. */
export function Arr({ diag = false }: { diag?: boolean }) {
  const c = diag ? "↗" : "→";
  return (
    <span className={diag ? "arr diag" : "arr"} aria-hidden>
      <b>{c}</b>
      <b>{c}</b>
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
