import { isDeepStrictEqual } from "node:util";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { githubRelease } from "../../db/schema.js";
import { fetchLatestRelease, repository } from "./github-release.mjs";

export async function syncRelease() {
  let phase = "database-read";

  try {
    const db = getDb();
    const [previous] = await db.select().from(githubRelease)
      .where(eq(githubRelease.repository, repository())).limit(1);
    phase = "github-check";
    const result = await fetchLatestRelease(previous?.etag);
    const checkedAt = new Date();
    phase = "database-write";

    if (result.unchanged) {
      if (!previous) throw new Error("Missing cached release");
      await db.update(githubRelease).set({ checkedAt })
        .where(eq(githubRelease.repository, repository()));
      console.log("GitHub release check completed: unchanged.");
      return;
    }

    const changed = !previous || !isDeepStrictEqual(previous.release, result.release);
    const syncedAt = changed ? checkedAt : previous.syncedAt;
    const values = { release: result.release, etag: result.etag, checkedAt, syncedAt };
    await db.insert(githubRelease).values({ repository: repository(), ...values })
      .onConflictDoUpdate({ target: githubRelease.repository, set: values });
    console.log(changed ? "GitHub release synchronized." : "GitHub release check completed: unchanged.");
  } catch {
    console.error(`GitHub release sync failed during ${phase}; existing download information was preserved.`);
    throw new Error(`GitHub release synchronization failed during ${phase}`);
  }
}
