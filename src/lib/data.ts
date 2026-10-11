import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabase } from "./supabase/client";
import {
  samplePicks,
  sampleProjects,
  sampleEvents,
  sampleTutorials,
} from "./sample-data";
import type {
  Project,
  ProjectUpdate,
  SiteEvent,
  Tutorial,
  WeeklyPick,
} from "./types";

// Every read is cached for a few minutes; ops edits in Supabase show up on the
// next revalidation without a redeploy.

export async function getEvents(): Promise<SiteEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");

  const db = getSupabase();
  if (!db) return sampleEvents;

  const { data, error } = await db
    .from("events")
    .select(
      "slug,title,kind,starts_at,ends_at,location,summary,signup_url,capacity",
    )
    .eq("published", true)
    .order("starts_at");
  if (error) throw error;

  return data.map((e) => ({
    slug: e.slug,
    title: e.title,
    kind: e.kind,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    location: e.location,
    summary: e.summary,
    signupUrl: e.signup_url,
    capacity: e.capacity,
  }));
}

/** Splits events around "now"; refreshed with the cache, so at most minutes stale. */
export async function getEventSchedule(): Promise<{
  upcoming: SiteEvent[];
  past: SiteEvent[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");

  const events = await getEvents();
  const now = Date.now();
  return {
    upcoming: events.filter((e) => Date.parse(e.endsAt) > now),
    past: events.filter((e) => Date.parse(e.endsAt) <= now).reverse(),
  };
}

const PROJECT_COLUMNS =
  "slug,name,problem,target_user,status,needed_roles,next_step,contact,owner_name,repo_url,demo_url,updated_at";

type ProjectRow = {
  slug: string;
  name: string;
  problem: string;
  target_user: string;
  status: Project["status"];
  needed_roles: Project["neededRoles"];
  next_step: string | null;
  contact: string;
  owner_name: string;
  repo_url: string | null;
  demo_url: string | null;
  updated_at: string;
};

function toProject(p: ProjectRow): Project {
  return {
    slug: p.slug,
    name: p.name,
    problem: p.problem,
    targetUser: p.target_user,
    status: p.status,
    neededRoles: p.needed_roles,
    nextStep: p.next_step,
    contact: p.contact,
    ownerName: p.owner_name,
    repoUrl: p.repo_url,
    demoUrl: p.demo_url,
    updatedAt: p.updated_at,
  };
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");

  const db = getSupabase();
  if (!db) return sampleProjects;

  const { data, error } = await db
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ProjectRow[]).map(toProject);
}

export async function getProject(slug: string): Promise<{
  project: Project;
  updates: ProjectUpdate[];
} | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects", `project:${slug}`);

  const db = getSupabase();
  if (!db) {
    const project = sampleProjects.find((p) => p.slug === slug);
    return project ? { project, updates: [] } : null;
  }

  const { data, error } = await db
    .from("projects")
    .select(`${PROJECT_COLUMNS},project_updates(kind,body,url,occurred_at)`)
    .eq("slug", slug)
    .order("occurred_at", {
      referencedTable: "project_updates",
      ascending: false,
    })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as ProjectRow & {
    project_updates: {
      kind: ProjectUpdate["kind"];
      body: string;
      url: string | null;
      occurred_at: string;
    }[];
  };
  return {
    project: toProject(row),
    updates: row.project_updates.map((u) => ({
      kind: u.kind,
      body: u.body,
      url: u.url,
      occurredAt: u.occurred_at,
    })),
  };
}

/** North star: approved projects with any update in the last 14 days. */
export async function getActiveProjectCount(): Promise<number | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects");

  const db = getSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from("biweekly_active_projects")
    .select("active_projects")
    .single();
  if (error) throw error;
  return data.active_projects;
}

export async function getTutorials(): Promise<Tutorial[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("tutorials");

  const db = getSupabase();
  if (!db) return sampleTutorials;

  const { data, error } = await db
    .from("tutorials")
    .select("title,summary,slides_url,repo_url,recording_url,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;

  return data.map((t) => ({
    title: t.title,
    summary: t.summary,
    slidesUrl: t.slides_url,
    repoUrl: t.repo_url,
    recordingUrl: t.recording_url,
    publishedAt: t.published_at,
  }));
}

export async function getWeeklyPicks(): Promise<WeeklyPick[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("picks");

  const db = getSupabase();
  if (!db) return samplePicks;

  const { data, error } = await db
    .from("weekly_picks")
    .select("kind,title,summary,source_name,source_url,picked_on")
    .eq("published", true)
    .order("picked_on", { ascending: false })
    .limit(20);
  if (error) throw error;

  return data.map((p) => ({
    kind: p.kind,
    title: p.title,
    summary: p.summary,
    sourceName: p.source_name,
    sourceUrl: p.source_url,
    pickedOn: p.picked_on,
  }));
}
