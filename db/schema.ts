import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Release } from "../netlify/lib/github-release.mjs";

export const githubRelease = pgTable("github_release", {
  repository: text("repository").primaryKey(),
  release: jsonb("release").$type<Release>().notNull(),
  etag: text("etag"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
});
