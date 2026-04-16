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

- **Start application** — Runs the Career Hub frontend (`PORT=20829 pnpm --filter @workspace/career-hub run dev`), served at `/`
- **API Server** — Runs the Express API server (`PORT=8080 pnpm --filter @workspace/api-server run dev`), served at `/api`
- Frontend Vite config binds to `0.0.0.0`, uses the workflow-provided `PORT`, enables Replit preview hosts, and proxies `/api` to the local API server on port `8080`.

## Environment Variables (Secrets)

All secrets are configured in Replit Secrets:
- `DATABASE_URL` — Replit built-in PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Individual DB connection parts
- `PORT` — Set to `20829` (frontend service port)

For Vercel deployment, additionally set:
- `DATABASE_URL` — production PostgreSQL connection string (e.g. Neon)
- `ALLOWED_ORIGINS` — comma-separated list of allowed frontend origins (e.g. `https://your-app.vercel.app`)

## Artifacts

### Career Hub (`artifacts/career-hub`)
- **Type**: React + Vite web app
- **Preview path**: `/`
- **Purpose**: Personal career planning dashboard for job preparation (Data Scientist, Data Analyst, ML Engineer)

#### Features
- **Dashboard**: Summary stats (goals, progress, jobs, reminders), top skills from job descriptions, recent activity timeline
- **Goals**: Track career goals with target roles, status, and target year
- **Progress**: Log learning activities — courses, AI tools (Google AI Studio, ChatGPT), projects, certifications
- **Roadmap**: 5-10 year visual timeline split into short/mid/long term phases
- **Jobs**: Save job descriptions, extract keywords and required skills, track application status
- **Reminders**: Task reminders with priority, due dates, and categories

#### Tech
- React 19 + Vite, TailwindCSS, shadcn/ui components
- TanStack Query for data fetching
- Wouter for routing
- react-hook-form + zod for forms
- framer-motion for animations

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`
- **Purpose**: Backend API for Career Hub

#### Database Tables
- `goals` — career goals
- `progress_entries` — learning progress entries
- `roadmap_items` — long-term roadmap milestones
- `jobs` — saved job descriptions with keywords/skills arrays
- `reminders` — task reminders with due dates
- `users` — registered users (id, name, email)

#### Utility
- `artifacts/api-server/src/lib/serialize.ts` — converts Date objects to ISO strings before Zod validation

## Auth

Simple name + email sign-in. No passwords or hashing dependency. Session stored in localStorage.
- `POST /api/auth/signin` — finds or creates user by email, returns user object
- `POST /api/auth/signup` — creates or updates a user by name + email, returns user object
- `POST /api/auth/signout` — client-side only (clears localStorage)
- Frontend context: `artifacts/career-hub/src/contexts/auth-context.tsx`
- Sign-in page: `artifacts/career-hub/src/pages/signin.tsx`
- JWT signing uses a development-only fallback secret; production requires `JWT_SECRET` to be configured.

## Vercel / Neon DB Fix

`vercel.json` buildCommand runs `pnpm --filter @workspace/db push-force` before building the frontend. This ensures all DB tables are created/updated in Neon on every deploy.
