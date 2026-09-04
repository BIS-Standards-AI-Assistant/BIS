// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const req = () => new NextRequest(new Request("http://localhost/api/v1/standards/x"));
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const findFirst = vi.fn();
vi.mock("@/db", () => ({
  getDb: () => ({ query: { documents: { findFirst } } }),
}));

beforeEach(() => {
  findFirst.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/v1/standards/[id]", () => {
  test("a malformed id is 404, not a 500 from the database", async () => {
    // The regression: documents.id is a uuid column, so Postgres raised
    // `invalid input syntax for type uuid` and the 500 escaped unhandled.
    for (const id of ["does-not-exist", "IS 14543:2016", "../../etc/passwd", "1"]) {
      const res = await GET(req(), params(id));
      expect(res.status, id).toBe(404);
      expect((await res.json()).error).toBe("Standard not found");
    }
    // None of these should have reached the database at all.
    expect(findFirst).not.toHaveBeenCalled();
  });

  test("a well-formed id with no row is 404", async () => {
    findFirst.mockResolvedValue(undefined);
    const res = await GET(req(), params("11111111-2222-3333-4444-555555555555"));
    expect(res.status).toBe(404);
  });

  test("an existing document is returned", async () => {
    findFirst.mockResolvedValue({ id: "11111111-2222-3333-4444-555555555555", title: "Doc", chunks: [] });
    const res = await GET(req(), params("11111111-2222-3333-4444-555555555555"));
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("Doc");
  });

  test("a database failure is a clean 500 that leaks no schema detail", async () => {
    findFirst.mockRejectedValue(new Error('relation "documents" does not exist'));
    const res = await GET(req(), params("11111111-2222-3333-4444-555555555555"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Could not load this standard");
    expect(JSON.stringify(body)).not.toMatch(/relation|documents|does not exist/);
  });
});
