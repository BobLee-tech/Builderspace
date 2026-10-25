import Link from "next/link";
import { Suspense } from "react";
import { MemberCard } from "@/app/join/member-card";
import { getCardDesign, getSession } from "@/lib/auth";
import { cardViewOf } from "@/lib/members";
import { AccountLink } from "./account-link";
import { T } from "./t";

/**
 * The header's account button: 加入 for visitors, 继续加入 for someone who
 * signed in but has no card yet, and 我的 with their card in miniature for
 * members. The header is part of the prerendered shell; this reads the
 * session, so it streams in, with 加入 until then.
 */
export function AccountButton() {
  return (
    <Suspense fallback={<JoinLink />}>
      <Account />
    </Suspense>
  );
}

function JoinLink({ resume = false }: { resume?: boolean }) {
  return (
    <Link href="/join" className="btn solid sm">
      {resume ? (
        <T zh="继续加入" en="Finish joining" />
      ) : (
        <T zh="加入" en="Join" />
      )}
    </Link>
  );
}

async function Account() {
  const session = await getSession();
  if (!session?.member) return <JoinLink resume={Boolean(session)} />;
  const design = await getCardDesign();
  return (
    <AccountLink>
      <span className="acct-card" aria-hidden>
        <MemberCard
          card={cardViewOf(session.member)}
          design={design}
          flipped={false}
          still
          className="mini"
        />
      </span>
      <T zh="我的" en="Me" />
    </AccountLink>
  );
}
