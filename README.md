# Image Intelligentsia

A career planning dashboard for tracking goals, progress, job applications, and roadmaps.

## Stack

- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express 5 API
- **Database**: PostgreSQL + Drizzle ORM
- **Monorepo**: pnpm workspaces
- **Deploy**: Vercel (frontend + serverless API) + Neon (DB)

## Local Development (Replit)

The app runs automatically via Replit workflows:
- API on port `8080`
- Frontend on port `20829`

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Required for deployment:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Secret for signing auth tokens |
| `ALLOWED_ORIGINS` | Comma-separated allowed frontend origins |

## Deployment (Vercel)

1. Connect this repo to Vercel
2. Set environment variables in Vercel dashboard
3. Push to `main` — Vercel builds and deploys automatically

## Packages

| Package | Path | Description |
|---|---|---|
| `@workspace/career-hub` | `artifacts/career-hub` | React frontend |
| `@workspace/api-server` | `artifacts/api-server` | Express API |
| `@workspace/db` | `lib/db` | Drizzle schema & migrations |
