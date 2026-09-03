import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not part of the source tree — generated Playwright HTML report
    // (gitignored, but a local run leaves it on disk and its minified
    // vendor JS bundles otherwise get linted as if they were source).
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
