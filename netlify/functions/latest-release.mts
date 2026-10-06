import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { githubRelease } from "../../db/schema.js";
import { repository } from "../lib/github-release.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  }

  try {
    const [current] = await getDb().select({
      release: githubRelease.release,
      checkedAt: githubRelease.checkedAt,
      syncedAt: githubRelease.syncedAt,
    }).from(githubRelease).where(eq(githubRelease.repository, repository())).limit(1);

    if (!current) {
      return Response.json({ message: "Release sync is pending" }, {
        status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" },
      });
    }

    return Response.json(current, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    console.error("Cached release information is temporarily unavailable.");
    return Response.json({ message: "Release information unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
};

export const config: Config = {
  path: "/api/latest-release",
};
