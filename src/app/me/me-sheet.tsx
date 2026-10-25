import { T } from "@/components/t";
import { getCardDesign, getSession } from "@/lib/auth";
import { cardViewOf, memberCode, sealLabel, SPARK_INFO } from "@/lib/members";
import { CardStudio } from "./card/card-studio";

/**
 * What the 我的 sheet holds (app/@sheet/(.)me): who you are, and the card
 * studio laid out in one column. Everything else on /me (details, survey,
 * sign out) stays on the full page, a plain link away.
 */
export async function MeSheet() {
  const session = await getSession();
  const m = session?.member;
  if (!m) {
    return (
      <div className="me-sheet-head">
        <h2 className="h2">
          <T zh="先加入" en="Join first" />
        </h2>
        {/* A full load: a client-side hop would keep this sheet open. */}
        <a href="/join" className="btn solid sm">
          <T zh="加入" en="Join" />
        </a>
      </div>
    );
  }
  const design = await getCardDesign();
  const spark = SPARK_INFO[m.spark];
  return (
    <>
      <div className="me-sheet-head">
        <div>
          <p className="mono mute">
            {memberCode(m.memberNo)} · {spark.name} · <T {...spark.role} />
            {m.verified && ` · ✓ ${sealLabel(m.schoolDomain)}`}
          </p>
          <h2 className="h2">
            <T zh="我的卡片" en="My card" />
          </h2>
        </div>
        {/* The full /me page, not this sheet again. */}
        <a href="/me" className="btn ghost sm">
          <T zh="完整页面" en="Full page" />
        </a>
      </div>
      <CardStudio
        card={cardViewOf(m)}
        design={design}
        verified={m.verified}
        compact
      />
    </>
  );
}
