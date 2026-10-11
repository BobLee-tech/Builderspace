"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ROLES,
  ROLE_LABEL,
  STATUS_LABEL,
  type Project,
  type ProjectStatus,
  type Role,
} from "@/lib/types";

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

// Cards are rendered on the server and passed in, so filtering stays client-side
// without shipping the card markup logic twice.
export function ProjectPlaza({
  projects,
  cards,
}: {
  projects: Pick<Project, "slug" | "status" | "neededRoles">[];
  cards: Record<string, ReactNode>;
}) {
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const visible = projects.filter(
    (p) =>
      (!status || p.status === status) &&
      (!role || p.neededRoles.includes(role)),
  );

  return (
    <>
      <div className="filters" role="group" aria-label="按状态筛选">
        <span className="mono mute label">状态</span>
        <Chip on={!status} onClick={() => setStatus(null)}>
          全部
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s} on={status === s} onClick={() => setStatus(s)}>
            {STATUS_LABEL[s]}
            <span className="n">
              {projects.filter((p) => p.status === s).length}
            </span>
          </Chip>
        ))}
      </div>
      <div className="filters" role="group" aria-label="按所缺角色筛选">
        <span className="mono mute label">缺的角色</span>
        <Chip on={!role} onClick={() => setRole(null)}>
          不限
        </Chip>
        {ROLES.map((r) => (
          <Chip key={r} on={role === r} onClick={() => setRole(r)}>
            {ROLE_LABEL[r]}
          </Chip>
        ))}
      </div>
      <p className="mono mute" aria-live="polite">
        显示 {visible.length} / {projects.length}
      </p>

      <div className="pgrid">
        {visible.map((p) => (
          <div key={p.slug} style={{ display: "contents" }}>
            {cards[p.slug]}
          </div>
        ))}
        <Link href="/projects/new" className="pcard-add">
          <span className="plus" aria-hidden>
            +
          </span>
          <span>提交你的项目卡</span>
          <span className="mono">人工审核后公开</span>
        </Link>
      </div>
      {visible.length === 0 && (
        <p className="empty" style={{ marginTop: 16 }}>
          没有符合条件的项目 · 换个筛选试试
        </p>
      )}
    </>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
