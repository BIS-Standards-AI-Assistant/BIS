import { describe, test, expect, beforeEach, vi } from "vitest";
import type { LibrarySource } from "./source-library";

// The library lives in sessionStorage and survives a reload; the upload
// request does not. Re-importing the module simulates the reload.
async function freshPage() {
  vi.resetModules();
  return import("./source-library");
}

function source(id: string, overrides: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id,
    name: `${id}.pdf`,
    sizeBytes: 1000,
    addedAt: 1,
    status: "analyzing",
    selected: true,
    citedNumbers: [],
    standardNumbers: [],
    limitations: [],
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("uploads interrupted by a reload", () => {
  test("an upload still analyzing when the page reloads is shown as failed, not 'Reading document…' forever", async () => {
    const before = await freshPage();
    before.addSource(source("a"));
    expect(before.getSourcesSnapshot()[0].status).toBe("analyzing");

    const after = await freshPage();
    const [a] = after.getSourcesSnapshot();
    expect(a.status).toBe("failed");
    expect(a.error).toBe(after.INTERRUPTED_UPLOAD);
  });

  test("an upload running in this page stays analyzing until it finishes", async () => {
    const lib = await freshPage();
    lib.addSource(source("a"));
    lib.addSource(source("b"));
    expect(lib.getSourcesSnapshot().map((s) => s.status)).toEqual(["analyzing", "analyzing"]);

    lib.updateSource("a", { status: "ready", standardNumbers: ["IS 14543:2016"] });
    expect(lib.getSourcesSnapshot().map((s) => s.status)).toEqual(["ready", "analyzing"]);
  });

  test("finished documents survive a reload unchanged", async () => {
    const before = await freshPage();
    before.addSource(source("done"));
    before.updateSource("done", { status: "ready", standardNumbers: ["IS 14543:2016"] });
    before.addSource(source("bad"));
    before.updateSource("bad", { status: "failed", error: "Upload failed (HTTP 413)" });

    const after = await freshPage();
    const [done, bad] = after.getSourcesSnapshot();
    expect(done.status).toBe("ready");
    expect(after.selectedStandardNumbers(after.getSourcesSnapshot())).toEqual(["IS 14543:2016"]);
    expect(bad.error).toBe("Upload failed (HTTP 413)");
  });

  test("the interrupted state is saved by the next change, and the entry can be removed", async () => {
    const before = await freshPage();
    before.addSource(source("a"));

    const after = await freshPage();
    after.addSource(source("b"));
    const stored = JSON.parse(sessionStorage.getItem("bis-source-library")!) as LibrarySource[];
    expect(stored.map((s) => [s.id, s.status])).toEqual([
      ["a", "failed"],
      ["b", "analyzing"],
    ]);

    after.removeSource("a");
    expect(after.getSourcesSnapshot().map((s) => s.id)).toEqual(["b"]);
  });
});
