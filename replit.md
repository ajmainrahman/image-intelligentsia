# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Replit Workflows

- **Start application** — Runs the Atlas frontend and Express API together:
  - API: `PORT=8080 pnpm --filter @workspace/api-server run dev`
  - Frontend: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/career-hub run dev`
- Frontend is served at `/` on port `5000` (Replit webview) and proxies `/api` requests to the local API server on port `8080`.
- Frontend Vite config binds to `0.0.0.0`, uses the workflow-provided `PORT`, enables Replit preview hosts, and proxies `/api` to the local API server on port `8080`.

## Environment Variables (Secrets)

All secrets are configured in Replit Secrets:
- `DATABASE_URL` — Replit built-in PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Individual DB connection parts
- `PORT` — Set by the workflow for each service (`20829` frontend, `8080` API)

For Vercel deployment, additionally set:
- `DATABASE_URL` — production PostgreSQL connection string (e.g. Neon)
- `ALLOWED_ORIGINS` — comma-separated list of allowed frontend origins (e.g. `https://your-app.vercel.app`)
- `JWT_SECRET` or `AUTH_SECRET` — required for account creation and sign-in token signing
- Vercel builds the API server into `artifacts/api-server/dist/app.mjs`; `api/index.ts` imports this bundle for serverless execution.

## Artifacts

### Atlas (`artifacts/career-hub`)
- **Type**: React + Vite web app
- **Preview path**: `/`
- **Purpose**: Atlas — "Map your career & research journey." A unified workspace for career goals, learning, opportunities, and a personal research library.
- **Brand**: Emerald-teal primary (`hsl(173 78% 32%)`) + warm amber accent (`hsl(38 92% 50%)`) on a warm cream canvas; deep ink sidebar. Logo is a peaked "A" mark on a gradient rounded square.

#### Features
- **Overview**: Summary stats (goals, progress, jobs, reminders), top skills from job descriptions, recent activity timeline
- **Goals**: Track career goals with target roles, status, and target year
- **Learning**: Log learning activities — courses, AI tools, projects, certifications
- **Roadmap**: 5–10 year visual timeline split into short/mid/long term phases
- **Research** *(new)*: Personal research library — papers, articles, books, datasets, theses, topics, and notes. Tagged, status-tracked (to_explore / reading / completed), with source URL, summary and personal notes; can be linked to a goal.
- **Opportunities (Jobs)**: Save job descriptions, extract keywords and required skills, track application status; optional apply date per job
- **Reminders**: Task reminders with priority, due dates, and categories
- **Notepad**: Local browser-saved notes for quick writing and interview/application notes
- **Mobile**: Top app bar + 5-tab bottom nav (Home / Goals / Research / Learning / Jobs) with safe-area insets, slide-down full-nav drawer, larger touch targets

#### Tech
- React 19 + Vite, TailwindCSS, shadcn/ui components
- TanStack Query for data fetching
- Wouter for routing
- react-hook-form + zod for forms
- framer-motion for animations

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`
- **Purpose**: Backend API for Atlas

#### Database Tables
- `goals` — career goals
- `progress_entries` — learning progress entries
- `roadmap_items` — long-term roadmap milestones
- `jobs` — saved job descriptions with keywords/skills arrays
- `jobs.apply_date` — optional timestamp for when an application was submitted
- `reminders` — task reminders with due dates
- `users` — registered users (id, name, email)
- `research` *(new)* — research library items (title, type, authors, source, summary, tags[], status, notes, optional `goal_id` link)
- `activity_log_v2` — activity feed events (type now includes `research`)

#### Schema Note
The legacy `lib/db/src/schema.ts` (single-file) is the active schema source resolved by Node module resolution; the newer `lib/db/src/schema/` directory mirrors it. When adding tables, define them in **both** places to keep types and runtime in sync.

#### Utility
- `artifacts/api-server/src/lib/serialize.ts` — converts Date objects to ISO strings before Zod validation

## Auth

Simple name + email sign-in. No passwords or hashing dependency. Session stored in localStorage.
- `POST /api/auth/signin` — finds or creates user by email, returns user object
- `POST /api/auth/signup` — creates or updates a user by name + email, returns user object
- `POST /api/auth/signout` — client-side only (clears localStorage)
- Frontend context: `artifacts/career-hub/src/contexts/auth-context.tsx`
- Sign-in page: `artifacts/career-hub/src/pages/signin.tsx`
- JWT signing accepts `JWT_SECRET`, `AUTH_SECRET`, or `NEXTAUTH_SECRET`; production requires one of them to be configured.
- Database connections accept Replit `DATABASE_URL` and common Vercel/Neon variables including `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, and `POSTGRES_PRISMA_URL`.

## Vercel / Neon DB Fix

`vercel.json` buildCommand runs `pnpm --filter @workspace/db push-force` before building the frontend. This ensures all DB tables are created/updated in Neon on every deploy.

## Database (Replit)

In the Replit dev environment the app uses Replit's built-in PostgreSQL via `DATABASE_URL` (host `helium`). To use an external Neon database instead, set `DATABASE_URL` in Secrets to your Neon connection string and re-run `pnpm --filter @workspace/db run push`.
