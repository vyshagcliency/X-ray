import { DuckDBInstance } from "@duckdb/node-api";

/**
 * Create a fresh DuckDB instance for a single task.
 * Each Trigger.dev task gets its own in-process DuckDB — no shared state.
 */
export async function createDuckDB() {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  // Enable httpfs for reading from signed URLs
  await connection.run("INSTALL httpfs; LOAD httpfs;");

  return { instance, connection };
}
