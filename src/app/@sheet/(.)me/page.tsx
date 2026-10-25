import type { Metadata } from "next";
import { Suspense } from "react";
import { MeSheet } from "@/app/me/me-sheet";
import { Sheet } from "@/components/sheet";
import "../../members.css";
import "../../me/card/studio.css";

export const metadata: Metadata = { title: "我的卡片" };

/**
 * 我的 from the header: /me opened over the current page, with the card
 * studio in it. A refresh or a shared /me link loads the full page instead.
 */
export default function MeSheetPage() {
  return (
    <Sheet label="我的卡片 / My card">
      <Suspense fallback={<div className="join-wait" aria-busy />}>
        <MeSheet />
      </Suspense>
    </Sheet>
  );
}
