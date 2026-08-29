/**
 * Unit tests for src/lib/query-normalization.ts. Pure functions, no DB, no
 * LLM call — follows the repo's existing tsx-script test convention (see
 * scripts/eval-*.ts) rather than adding a new test-runner dependency.
 *
 * Usage: npx tsx scripts/test-query-normalization.ts
 */
import assert from "node:assert/strict";
import { normalizeQuery } from "../src/lib/query-normalization";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

test("collapses repeated whitespace and trims", () => {
  const r = normalizeQuery("  What   standard   covers   steel? ");
  assert.equal(r.normalizedQuery, "What standard covers steel?");
  assert.ok(r.transformations.includes("whitespace_collapsed"));
});

test("normalizes curly quotes and dashes", () => {
  const r = normalizeQuery("What's the “standard” for water bottles — 2014 edition");
  assert.equal(r.normalizedQuery.includes("“"), false);
  assert.equal(r.normalizedQuery.includes("—"), false);
  assert.ok(r.transformations.includes("punctuation_normalized"));
});

test("expands known abbreviations without touching unrelated words", () => {
  const r = normalizeQuery("What are the cert reqs for mfg of steel utensils?");
  assert.match(r.normalizedQuery, /certification requirements for manufacturing of steel utensils/i);
  assert.ok(r.transformations.includes("abbreviations_expanded"));
  assert.ok(r.expandedTerms.some((e) => e.term.toLowerCase() === "cert"));
});

test("does not expand words that happen to contain an abbreviation as a substring", () => {
  const r = normalizeQuery("certainly this certificate is fine");
  assert.equal(r.normalizedQuery, "certainly this certificate is fine");
  assert.equal(r.expandedTerms.length, 0);
});

test("unifies British/American spelling variants", () => {
  const r = normalizeQuery("What is the colour and litre capacity required?");
  assert.match(r.normalizedQuery, /color/i);
  assert.match(r.normalizedQuery, /liter/i);
});

test("detects identifiers via the existing resolver, unaffected by expansion", () => {
  const r = normalizeQuery("IS 5522:2014 cert reqs");
  assert.equal(r.identifiers.length, 1);
  assert.equal(r.identifiers[0].normalized, "IS 5522:2014");
});

test("leaves an already-clean query with no transformations recorded", () => {
  const r = normalizeQuery("What standard covers stainless steel sheets?");
  assert.equal(r.normalizedQuery, "What standard covers stainless steel sheets?");
  assert.deepEqual(r.transformations, []);
  assert.deepEqual(r.expandedTerms, []);
});

test("never drops or reorders the original query", () => {
  const original = "  IS  5522 : 2014   cert reqs  ";
  const r = normalizeQuery(original);
  assert.equal(r.originalQuery, original);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
