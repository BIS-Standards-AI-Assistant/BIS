import { describe, test, expect } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  test.each(["3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f", "3F2B8C1E-9A4D-4C6B-8E2F-1A2B3C4D5E6F"])("accepts %s", (id) => {
    expect(isUuid(id)).toBe(true);
  });

  test.each(["", "is-14543", "IS 14543:2016", "BIS-STD-001", "../../etc/passwd", "3f2b8c1e9a4d4c6b8e2f1a2b3c4d5e6f", " 3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f"])(
    "rejects %j",
    (id) => {
      expect(isUuid(id)).toBe(false);
    },
  );
});
