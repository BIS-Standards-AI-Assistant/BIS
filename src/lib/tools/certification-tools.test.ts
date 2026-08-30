import { describe, test, expect } from "vitest";
import { getCertificationSchemeTool } from "./certification-tools";

describe("getCertificationSchemeTool", () => {
  test("returns ok with a real, source-attributed scheme for a known standard", async () => {
    const result = await getCertificationSchemeTool.execute({ canonicalNumber: "IS 269:2015" });
    expect(result.status).toBe("ok");
    expect(result.data?.standardNumber).toBe("IS 269:2015");
    expect(result.provenance?.[0].source).toMatch(/^https:\/\/www\.bis\.gov\.in/);
  });

  test("returns not_found for a standard outside the reference dataset, never fabricating a scheme", async () => {
    const result = await getCertificationSchemeTool.execute({ canonicalNumber: "IS 99999:2099" });
    expect(result.status).toBe("not_found");
    expect(result.data).toBeUndefined();
  });
});
