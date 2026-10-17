// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

const execute = vi.fn();
vi.mock("@/db", () => ({ getDb: () => ({ execute }) }));

beforeEach(() => {
  execute.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/health", () => {
  test("reports ok when the database answers", async () => {
    execute.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "connected" });
  });

  test("a database failure is a 503 that does not leak the driver error", async () => {
    execute.mockRejectedValue(
      new Error('password authentication failed for user "neondb_owner" at ep-cool-host-123.ap-southeast-1.aws.neon.tech'),
    );
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ status: "error", database: "unreachable" });
    expect(JSON.stringify(body)).not.toMatch(/neondb_owner|neon\.tech|password/);
    expect(console.error).toHaveBeenCalled();
  });
});
