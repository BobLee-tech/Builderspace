"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ROLES,
  ROLE_LABEL,
  STATUS_LABEL,
  type Project,
  type ProjectStatus,
  type Role,
} from "@/lib/types";
import { StatusDot } from "@/components/project-card";
import { T } from "@/components/t";

const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];
const LAYOUT_KEY = "bs-layout";

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
  const [list, setList] = useState(false);

  // Remember grid vs list per visitor. This re-runs when a hidden page comes
  // back, so it also picks up a choice made in the other plaza (home vs /projects).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LAYOUT_KEY);
    } catch {}
    const id = requestAnimationFrame(() => setList(saved === "list"));
    return () => cancelAnimationFrame(id);
  }, []);
  const pickLayout = (asList: boolean) => {
    setList(asList);
    try {
      localStorage.setItem(LAYOUT_KEY, asList ? "list" : "grid");
    } catch {}
  };
  const count = (s: ProjectStatus) =>
    projects.filter((p) => p.status === s).length;

  const visible = projects.filter(
    (p) =>
      (!status || p.status === status) &&
      (!role || p.neededRoles.includes(role)),
  );

  return (
    <>
      <div className="dist" aria-label="Status mix / 项目状态分布">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={`d-${s}`}
            style={{ flex: `${Math.max(count(s), 0.4)} 1 0` }}
          >
            <StatusDot status={s} />
            <b>{count(s)}</b>
            <span className="mute">
              <T {...STATUS_LABEL[s]} />
            </span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="tb-filters">
          <div
            className="filters"
            role="group"
            aria-label="Filter by status / 按状态筛选"
          >
            <span className="mono mute label">
              <T zh="状态" en="Status" />
            </span>
            <Chip on={!status} onClick={() => setStatus(null)}>
              <T zh="全部" en="All" />
            </Chip>
            {STATUSES.map((s) => (
              <Chip key={s} on={status === s} onClick={() => setStatus(s)}>
                <StatusDot status={s} />
                <T {...STATUS_LABEL[s]} />
                <span className="n">{count(s)}</span>
              </Chip>
            ))}
          </div>
          <div
            className="filters"
            role="group"
            aria-label="Filter by needed role / 按在寻找的角色筛选"
          >
            <span className="mono mute label">
              <T zh="在寻找的角色" en="Needs" />
            </span>
            <Chip on={!role} onClick={() => setRole(null)}>
              <T zh="不限" en="Any" />
            </Chip>
            {ROLES.map((r) => (
              <Chip key={r} on={role === r} onClick={() => setRole(r)}>
                <T {...ROLE_LABEL[r]} />
              </Chip>
            ))}
          </div>
        </div>
        <div className="tb-right">
          <span className="mono mute" aria-live="polite">
            <T zh="显示" en="Showing" />{" "}
            <b style={{ color: "var(--paper)" }}>{visible.length}</b> /{" "}
            {projects.length}
          </span>
          <div className="seg icons" role="group" aria-label="Layout / 视图">
            <button
              type="button"
              aria-pressed={!list}
              aria-label="Cards / 卡片视图"
              onClick={() => pickLayout(false)}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden
              >
                <rect x="1" y="1" width="6" height="6" />
                <rect x="9" y="1" width="6" height="6" />
                <rect x="1" y="9" width="6" height="6" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={list}
              aria-label="List / 列表视图"
              onClick={() => pickLayout(true)}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden
              >
                <rect x="1" y="2" width="14" height="2" />
                <rect x="1" y="7" width="14" height="2" />
                <rect x="1" y="12" width="14" height="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={list ? "pgrid as-list" : "pgrid"}>
        {visible.map((p) => (
          <div key={p.slug} style={{ display: "contents" }}>
            {cards[p.slug]}
          </div>
        ))}
        <Link href="/projects/new" className="pcard-add">
          <span className="plus" aria-hidden>
            +
          </span>
          <span>
            <T zh="提交你的项目卡" en="Submit your project" />
          </span>
          <span className="mono">
            <T
              zh="成员提交，人工审核后公开"
              en="For members · public after review"
            />
          </span>
        </Link>
      </div>
      {visible.length === 0 && (
        <p className="empty" style={{ marginTop: 16 }}>
          <T
            zh="没有符合条件的项目 · 换个筛选试试"
            en="No projects match · try another filter"
          />
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
