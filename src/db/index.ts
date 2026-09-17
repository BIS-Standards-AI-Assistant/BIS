import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      // Fails on first DB-backed request with a clear, actionable error
      // instead of an opaque one from deep inside the Neon driver. Next.js
      // on Vercel has no single app-boot phase to hook (serverless,
      // per-request), so this is the earliest point a missing env var can
      // be caught.
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (or set it in the Vercel project's environment variables) before starting the app.");
    }
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
