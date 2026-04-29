# ============================================================
# INTEGRATION GUIDE — Run these in your Replit Shell
# ============================================================
# Work through each step in order. Copy-paste each block.
# ============================================================


## ══════════════════════════════════════════════════════════
## STEP A — DB Schema: Add new columns & table
## ══════════════════════════════════════════════════════════

# Open lib/db/src/schema.ts and make these 4 edits:

# 1. Inside the `goals` table definition, add:
#      reflection: text("reflection"),
#      achievedAt: timestamp("achieved_at"),
#      updatedAt:  timestamp("updated_at").defaultNow(),   ← if not already there

# 2. Inside the `roadmap_items` table definition, add:
#      reflection: text("reflection"),
#      updatedAt:  timestamp("updated_at").defaultNow(),

# 3. Inside the `reminders` table definition, add:
#      recurrence:       text("recurrence"),
#      recurrenceCount:  integer("recurrence_count").default(0),
#      parentReminderId: integer("parent_reminder_id"),
#      updatedAt:        timestamp("updated_at").defaultNow(),

# 4. Add the weeklyReviews table (copy from STEP_1_db_schema_additions.ts)
#    and add to your exports at the bottom of schema.ts.

# After editing, push the schema:
pnpm --filter @workspace/db run push


## ══════════════════════════════════════════════════════════
## STEP B — API: Add the new routes file
## ══════════════════════════════════════════════════════════

# Copy STEP_2_api_routes_features.ts into the project:
cp /path/to/STEP_2_api_routes_features.ts artifacts/api-server/src/routes/features.ts

# Then open artifacts/api-server/src/app.ts and add:
#   import featuresRouter from "./routes/features.js";
#   app.use("/api", featuresRouter);
# (add it after your existing router registrations)

# NOTE: Make sure progressEntries has a `goalId` column (integer).
# If not, add it to the progress_entries table in schema.ts:
#   goalId: integer("goal_id"),
# and re-run: pnpm --filter @workspace/db run push


## ══════════════════════════════════════════════════════════
## STEP C — Frontend: New pages
## ══════════════════════════════════════════════════════════

# Copy new page files:
cp /path/to/STEP_3_goal_detail_page.tsx     artifacts/career-hub/src/pages/goal-detail.tsx
cp /path/to/STEP_4_weekly_review_page.tsx   artifacts/career-hub/src/pages/weekly-review.tsx

# Copy new component files:
cp /path/to/STEP_5_dashboard_components.tsx artifacts/career-hub/src/components/due-warning-banner.tsx
# (The file contains 2 exports — split if needed, or import both from the same file)

cp /path/to/STEP_6_reflection_dialogs.tsx   artifacts/career-hub/src/components/reflection-dialogs.tsx
cp /path/to/STEP_7_recurring_reminders.tsx  artifacts/career-hub/src/components/recurring-reminder.tsx


## ══════════════════════════════════════════════════════════
## STEP D — Wire up routes in App.tsx
## ══════════════════════════════════════════════════════════

# Open artifacts/career-hub/src/App.tsx and add these imports + routes:

# imports:
#   import GoalDetailPage from "@/pages/goal-detail";
#   import WeeklyReviewPage from "@/pages/weekly-review";

# routes (inside your <Switch> or route list):
#   <Route path="/goals/:id" component={GoalDetailPage} />
#   <Route path="/weekly-review" component={WeeklyReviewPage} />


## ══════════════════════════════════════════════════════════
## STEP E — Wire up dashboard components
## ══════════════════════════════════════════════════════════

# Open artifacts/career-hub/src/pages/dashboard.tsx (or home.tsx)

# 1. Import and add DueWarningBanner near top of JSX:
#    import { DueWarningBanner } from "@/components/due-warning-banner";
#    ...
#    <DueWarningBanner userId={user.id} />

# 2. Import and add SkillsGapCard to your dashboard grid:
#    import { SkillsGapCard } from "@/components/due-warning-banner";
#    ...
#    <SkillsGapCard userId={user.id} />

# 3. Add "Weekly Review" link on dashboard:
#    import { Link } from "wouter";
#    ...
#    <Link href="/weekly-review">
#      <Button variant="outline" size="sm">📋 Weekly Review</Button>
#    </Link>


## ══════════════════════════════════════════════════════════
## STEP F — Wire up Goal Achieve dialog in goals page
## ══════════════════════════════════════════════════════════

# Open artifacts/career-hub/src/pages/goals.tsx
# 1. Import:
#    import { GoalAchieveDialog } from "@/components/reflection-dialogs";
# 2. Add state:
#    const [achievingGoal, setAchievingGoal] = useState<{id:number,title:string}|null>(null);
# 3. Replace your existing "mark achieved" button onClick with:
#    onClick={() => setAchievingGoal({ id: goal.id, title: goal.title })}
# 4. Add to JSX:
#    <GoalAchieveDialog
#      goalId={achievingGoal?.id ?? null}
#      goalTitle={achievingGoal?.title}
#      open={achievingGoal != null}
#      onOpenChange={(o) => !o && setAchievingGoal(null)}
#      onDone={() => queryClient.invalidateQueries({ queryKey: ["goals"] })}
#    />
# 5. Make each goal title a link:
#    <Link href={`/goals/${goal.id}`}>{goal.title}</Link>


## ══════════════════════════════════════════════════════════
## STEP G — Wire up Milestone Complete dialog in roadmap page
## ══════════════════════════════════════════════════════════

# Open artifacts/career-hub/src/pages/roadmap.tsx
# 1. Import:
#    import { MilestoneCompleteDialog } from "@/components/reflection-dialogs";
# 2. Add state:
#    const [completingMilestone, setCompletingMilestone] = useState<{id:number,title:string}|null>(null);
# 3. Replace "mark complete" button onClick:
#    onClick={() => setCompletingMilestone({ id: item.id, title: item.title })}
# 4. Add dialog to JSX:
#    <MilestoneCompleteDialog
#      milestoneId={completingMilestone?.id ?? null}
#      milestoneTitle={completingMilestone?.title}
#      open={completingMilestone != null}
#      onOpenChange={(o) => !o && setCompletingMilestone(null)}
#      onDone={() => queryClient.invalidateQueries({ queryKey: ["roadmap"] })}
#    />


## ══════════════════════════════════════════════════════════
## STEP H — Wire up Recurring Reminders in reminders page
## ══════════════════════════════════════════════════════════

# Open artifacts/career-hub/src/pages/reminders.tsx
# 1. Import:
#    import { RecurrenceSelector, RecurrenceBadge, useCompleteReminder } from "@/components/recurring-reminder";
# 2. In your reminder form JSX, add:
#    <RecurrenceSelector
#      value={form.watch("recurrence") ?? null}
#      onChange={(v) => form.setValue("recurrence", v)}
#    />
# 3. In your reminder card JSX, add next to priority badge:
#    <RecurrenceBadge recurrence={reminder.recurrence} count={reminder.recurrenceCount} />
# 4. Replace your complete mutation with the hook:
#    const completeReminder = useCompleteReminder();
#    // then: completeReminder.mutate(reminder.id)


## ══════════════════════════════════════════════════════════
## STEP I — Typecheck + push to GitHub
## ══════════════════════════════════════════════════════════

pnpm run typecheck

git add -A
git commit -m "feat: goal detail, weekly review, skills gap, due warnings, reflections, recurring reminders"
git push origin main

# Vercel will auto-deploy. The vercel.json buildCommand runs
# db push-force automatically so new columns/tables are created.
