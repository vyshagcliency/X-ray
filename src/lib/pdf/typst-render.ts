import { createTypstCompiler } from "@myriaddreamin/typst.ts";
import fs from "fs";
import path from "path";
import type { ReportData } from "./data-builder";

/**
 * Render a PDF report using Typst WASM compiler.
 *
 * @param reportData - The structured report data from data-builder
 * @returns PDF as Uint8Array, or null if compilation fails
 */
export async function renderTypstPdf(
  reportData: ReportData,
): Promise<Uint8Array | null> {
  const compiler = createTypstCompiler();
  await compiler.init();

  // Read the Typst template
  const templatePath = path.resolve(
    process.cwd(),
    "templates",
    "report.typ",
  );
  const templateSource = fs.readFileSync(templatePath, "utf-8");

  // Add the template as the main source file
  compiler.addSource("/main.typ", templateSource);

  // Add the report data as a JSON shadow file
  const dataJson = JSON.stringify(reportData);
  compiler.mapShadow(
    "/report.data.json",
    new TextEncoder().encode(dataJson),
  );

  try {
    const result = await compiler.compile({
      mainFilePath: "/main.typ",
      format: 1 as const, // CompileFormatEnum.pdf = 1
    });

    if (!result.result) {
      console.error("Typst compilation returned no result");
      return null;
    }

    return result.result;
  } catch (err) {
    console.error("Typst compilation failed:", err);
    return null;
  }
}
