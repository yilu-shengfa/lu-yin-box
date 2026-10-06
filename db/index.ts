import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

export function getDb() {
  return drizzle({ schema });
}
