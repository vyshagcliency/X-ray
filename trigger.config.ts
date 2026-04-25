import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_hzajkiesibincfyzmdll",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    external: [
      "@duckdb/node-bindings",
      "@duckdb/node-bindings-linux-x64",
      "@duckdb/node-bindings-linux-arm64",
      "@duckdb/node-bindings-darwin-arm64",
      "@duckdb/node-bindings-darwin-x64",
      "@duckdb/node-bindings-win32-arm64",
      "@duckdb/node-bindings-win32-x64",
      "@myriaddreamin/typst.ts",
      "@myriaddreamin/typst-ts-web-compiler",
    ],
  },
});
