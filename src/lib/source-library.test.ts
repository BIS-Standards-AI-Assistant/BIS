import { describe, test, expect } from "vitest";
import { describeFileRejection, MAX_SOURCE_BYTES, selectedStandardNumbers, type LibrarySource } from "@/lib/source-library";

function source(patch: Partial<LibrarySource> = {}): LibrarySource {
  return {
    id: "s1",
    name: "spec.pdf",
    sizeBytes: 1000,
    addedAt: 0,
    status: "ready",
    selected: true,
    citedNumbers: ["IS 2347:2017"],
    standardNumbers: ["IS 2347:2017"],
    limitations: [],
    ...patch,
  };
}

describe("describeFileRejection", () => {
  test("accepts a PDF and a text file", () => {
    expect(describeFileRejection(new File(["x"], "a.pdf", { type: "application/pdf" }))).toBeNull();
    expect(describeFileRejection(new File(["x"], "a.txt", { type: "text/plain" }))).toBeNull();
    expect(describeFileRejection(new File(["x"], "A.PDF"))).toBeNull();
  });

  test("rejects an empty file", () => {
    expect(describeFileRejection(new File([], "a.pdf"))).toMatch(/empty/i);
  });

  test("rejects a file past the limit the endpoint itself enforces", () => {
    const big = new File(["x"], "a.pdf");
    Object.defineProperty(big, "size", { value: MAX_SOURCE_BYTES + 1 });
    expect(describeFileRejection(big)).toMatch(/larger than 10 MB/i);
  });

  test("rejects formats the analyzer cannot read", () => {
    for (const name of ["photo.png", "sheet.xlsx", "archive.zip", "notes"]) {
      expect(describeFileRejection(new File(["x"], name)), name).toMatch(/only PDF and plain-text/i);
    }
  });
});

describe("selectedStandardNumbers", () => {
  test("collects standards from ready, selected sources", () => {
    expect(
      selectedStandardNumbers([
        source(),
        source({ id: "s2", citedNumbers: ["IS 3074:2018"], standardNumbers: ["IS 3074:2018"] }),
      ]),
    ).toEqual([
      "IS 2347:2017",
      "IS 3074:2018",
    ]);
  });

  test("shares only standards the knowledge base actually has, not every citation", () => {
    // A document may cite a standard this system has never indexed; the
    // assistant has nothing to answer from for those.
    const partial = source({ citedNumbers: ["IS 2347:2017", "IS 9999:2099"], standardNumbers: ["IS 2347:2017"] });
    expect(selectedStandardNumbers([partial])).toEqual(["IS 2347:2017"]);
  });

  test("ignores deselected and still-analysing sources", () => {
    expect(selectedStandardNumbers([source({ selected: false })])).toEqual([]);
    expect(selectedStandardNumbers([source({ status: "analyzing" })])).toEqual([]);
    expect(selectedStandardNumbers([source({ status: "failed" })])).toEqual([]);
  });

  test("deduplicates a standard cited by more than one document", () => {
    expect(selectedStandardNumbers([source(), source({ id: "s2" })])).toEqual(["IS 2347:2017"]);
  });

  test("is empty for an empty library", () => {
    expect(selectedStandardNumbers([])).toEqual([]);
  });
});
