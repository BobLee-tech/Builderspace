<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## BuilderSpace project notes

- Design source of truth is the prototype in `BobLee-tech/builderspace-demo` (`index.html`, the "spec" view lists tokens, materials and the PRD → page mapping). Port visuals from there; keep the UI black / white / chrome with the mascot as the only colour.
- All content reads go through `src/lib/data.ts` (`"use cache"` + `cacheTag`). Without Supabase env vars they fall back to `src/lib/sample-data.ts`; keep `<SampleNotice />` next to anything that can show sample data.
- The site has no accounts: Supabase is used with the anon key only and RLS in `supabase/migrations/` is the security boundary. Schema changes go in a new migration file, never by editing an applied one.
- Forms submit through `submitWithoutReset` so server-side validation errors do not wipe the fields.
- Times are shown in `Australia/Sydney` via `src/lib/format.ts`.
- Run `pnpm check` before committing.
