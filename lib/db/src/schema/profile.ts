import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const profileTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  tagline: text("tagline").notNull().default(""),
  about: text("about").notNull().default(""),
  expertise: text("expertise").array().notNull().default([]),
  skills: text("skills").array().notNull().default([]),
  interests: text("interests").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Profile = typeof profileTable.$inferSelect;
