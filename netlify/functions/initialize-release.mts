import type { DeploySucceededEvent } from "@netlify/functions";
import { syncRelease } from "../lib/sync-release.mjs";

export default {
  async deploySucceeded(event: DeploySucceededEvent) {
    if (event.deploy.context !== "production" || !event.deploy.publishedAt) return;
    await syncRelease();
  },
};
