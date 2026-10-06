import type { Config } from "@netlify/functions";
import { syncRelease } from "../lib/sync-release.mjs";

export default async () => {
  await syncRelease();
};

export const config: Config = {
  schedule: "0 */2 * * *",
};
