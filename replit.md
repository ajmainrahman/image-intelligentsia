# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Replit built-in) + Drizzle ORM
- **DB driver**: `pg` (node-postgres) via `drizzle-orm/node-postgres`
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

All secrets are managed in Replit Secrets:
- `DATABASE_URL` — Replit built-in PostgreSQL connection string (host: helium)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Individual DB connection parts
- `JWT_SECRET` — Secret for signing JWT tokens (auto-generated during migration)
- `SESSION_SECRET` — Also accepted as fallback for JWT signing

## Database (Replit)

In the Replit dev environment the app uses Replit's built-in PostgreSQL via `DATABASE_URL`.
- DB client: `lib/db/src/index.ts` uses `pg` (node-postgres) via `drizzle-orm/node-postgres`
- Schema source of truth: `lib/db/src/schema.ts` (used by compiled API server)
- The `lib/db/src/schema/` subdirectory mirrors the schema for module exports
- Drizzle config: `lib/db/drizzle.config.ts` points to `schema.ts`

To push schema changes: `pnpm --filter @workspace/db run push`

## Artifacts

### Atlas (`artifacts/career-hub`)
- **Type**: React + Vite web app
- **Preview path**: `/`
- **Purpose**: Atlas — "Map your career & research journey." A unified workspace for career goals, learning, opportunities, and a personal research library.
- **Brand**: "Luminary" design — Plus Jakarta Sans only (no serif/mono), emerald-600 primary (`hsl(160 84% 39%)`), amber accent (`hsl(38 92% 50%)`), warm white background (`#FAFAF8` / `hsl(60 12% 98%)`), warm neutral foreground (no black). Horizontal sticky top-nav replacing sidebar. Logo is a gradient rounded-square eye mark.

#### Features
- **Overview**: Summary stats (goals, progress, jobs, reminders), top skills from job descriptions, recent activity timeline
- **Goals**: Track career goals with target roles, status, and target year
- **Learning**: Log learning activities — courses, AI tools, projects, certifications
- **Roadmap**: 5–10 year visual timeline split into short/mid/long term phases
- **Research**: Personal research library — papers, articles, books, datasets, theses, topics, and notes. Tagged, status-tracked (to_explore / reading / completed), with source URL, summary and personal notes; can be linked to a goal.
- **Opportunities (Jobs)**: Save job descriptions, extract keywords and required skills, track application status; optional apply date per job
- **Reminders**: Task reminders with priority, due dates, categories, and recurrence
- **Notepad**: Local browser-saved notes for quick writing and interview/application notes
- **Mobile**: Top app bar + 5-tab bottom nav (Home / Goals / Research / Learning / Jobs) with safe-area insets, slide-down full-nav drawer, larger touch targets
- **Dashboard Kanban**: Job pipeline board (Wishlist → Applied → Interviewing → Offered / Rejected columns) displayed on the dashboard below the summary grid

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
- `users` — registered users (id, name, email, password_hash)
- `goals` — career goals (pinned, archived, reflection, achieved_at, target_date)
- `progress_entries` — learning progress entries (start_date, pinned, archived)
- `roadmap_items` — long-term roadmap milestones (pinned, archived, reflection)
- `jobs` — saved job descriptions with keywords/skills arrays (apply_date, pinned, interview_questions, interview_answers)
- `reminders` — task reminders with due dates (recurrence, recurrence_count, parent_reminder_id)
- `profiles` — user profile (tagline, about, expertise, skills, interests)
- `research` — research library items (title, type, authors, source, summary, tags[], status, notes, optional goal_id link)
- `activity_log` — activity feed events (type, title, related_id, action)
- `weekly_reviews` — weekly review summaries
- `notes` — notepad notes (title, content)

#### Auth
Simple email/password auth with JWT tokens.
- `POST /api/auth/signup` — creates user, returns JWT token + user
- `POST /api/auth/signin` — authenticates user, returns JWT token + user
- `POST /api/auth/signout` — client-side only (clears localStorage)
- JWT signing uses `JWT_SECRET` (or `SESSION_SECRET` as fallback)
- Frontend stores JWT in localStorage

#### Utility
- `artifacts/api-server/src/lib/serialize.ts` — converts Date objects to ISO strings before Zod validation
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify helpers + requireAuth middleware
