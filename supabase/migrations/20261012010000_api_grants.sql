-- Explicit privileges for the Data API roles. Newer Supabase projects no longer
-- grant anon/authenticated access to new tables by default, and older ones grant
-- everything; spelling it out keeps both cases least-privilege. RLS still
-- decides which rows are visible.

revoke all on events, projects, project_updates, tutorials, weekly_picks,
  join_submissions, biweekly_active_projects from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on events, projects, project_updates, tutorials, weekly_picks,
  biweekly_active_projects to anon, authenticated;

grant insert on projects, join_submissions to anon, authenticated;
