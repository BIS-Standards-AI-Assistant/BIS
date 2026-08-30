/**
 * Verifies every URL in src/lib/official-links.ts still resolves to a real page.
 *
 * bis.gov.in is WordPress and serves soft 404s — HTTP 200 with an empty
 * <title> — for unknown paths, so a status code alone proves nothing. For
 * bis.gov.in we require a non-empty <title> once the site-wide
 * "- Bureau of Indian Standards" suffix is stripped. For the separate official
 * portals (manakonline.in, crsbis.in, standardsbis.bsbedge.com) we fall back to
 * the status code, since they are ordinary apps without that failure mode.
 *
 *   npx tsx scripts/check-official-links.ts
 *
 * Exits non-zero if any link is dead, so it can gate CI.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { allOfficialUrls } from "../src/lib/official-links";

const CONCURRENCY = 8;
const TIMEOUT_MS = 30_000;

/**
 * "dead" is a definitive answer from the server (a 4xx/5xx, or a soft 404).
 * "unreachable" means we never got an answer — a timeout or a transport error.
 * They are reported separately because only the first is a reason to change a
 * URL; treating a flaky network as a dead link invites someone to "fix" a
 * perfectly good page.
 */
type Verdict = "ok" | "dead" | "unreachable";
type Result = { url: string; verdict: Verdict; detail: string };

const RETRIES = 3;
const RETRY_DELAY_MS = 1_500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function checkOnce(url: string): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) return { url, verdict: "dead", detail: `HTTP ${res.status}` };

    if (!new URL(url).hostname.endsWith("bis.gov.in")) {
      return { url, verdict: "ok", detail: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const raw = /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "";
    const title = raw.replace(/-\s*Bureau of Indian Standards/i, "").trim();
    return title
      ? { url, verdict: "ok", detail: title }
      : { url, verdict: "dead", detail: "soft 404 (empty title)" };
  } catch (err) {
    return { url, verdict: "unreachable", detail: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function check(url: string): Promise<Result> {
  let last = await checkOnce(url);
  for (let attempt = 1; attempt < RETRIES && last.verdict === "unreachable"; attempt++) {
    await sleep(RETRY_DELAY_MS * attempt);
    last = await checkOnce(url);
  }
  return last;
}

const OFFICIAL_HOST_RE = /https:\/\/(?:www\.bis\.gov\.in|www\.manakonline\.in|www\.crsbis\.in|standardsbis\.bsbedge\.com)[^"'`\s)]*/g;

/**
 * Every official URL hardcoded anywhere in src/, not just the registry. The
 * footer, the About page and the Testing page all carry their own links, and a
 * wrong-but-live URL (bis.gov.in/accessibility is a procurement tender, not the
 * accessibility statement) is exactly what this is meant to catch.
 */
function urlsInSource(dir: string, found = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      urlsInSource(path, found);
      continue;
    }
    // Test fixtures use throwaway URLs on purpose.
    if (!/\.(ts|tsx)$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(OFFICIAL_HOST_RE)) {
      const url = match[0].replace(/[.,;]$/, "");
      // Bare origins are base-URL constants, not links to a page.
      if (new URL(url).pathname === "/") continue;
      found.add(url);
    }
  }
  return found;
}

async function main() {
  const urls = [...new Set([...allOfficialUrls(), ...urlsInSource("src")])].sort();
  const results: Result[] = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
      while (next < urls.length) {
        results.push(await check(urls[next++]));
      }
    }),
  );

  results.sort((a, b) => a.url.localeCompare(b.url));
  const dead = results.filter((r) => r.verdict === "dead");
  const unreachable = results.filter((r) => r.verdict === "unreachable");

  for (const r of dead) console.error(`DEAD         ${r.url}  — ${r.detail}`);
  for (const r of unreachable) console.error(`UNREACHABLE  ${r.url}  — ${r.detail} (after ${RETRIES} attempts)`);
  console.log(`\n${results.length - dead.length - unreachable.length}/${results.length} official links OK`);

  if (dead.length) {
    console.error(`\n${dead.length} dead link(s). Fix src/lib/official-links.ts — do not guess a replacement URL, verify it.`);
  }
  if (unreachable.length) {
    console.error(`\n${unreachable.length} link(s) could not be reached. This is usually the network, not the link — re-run before changing any URL.`);
  }
  // Only a definitive dead link fails the run; an unreachable host must not
  // turn this into a flaky gate.
  if (dead.length) process.exit(1);
}

main();
