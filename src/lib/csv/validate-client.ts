"use client";

import { matchHeaders, guessReportType, REPORT_SIGNATURES } from "./headers";

export interface ValidationResult {
  valid: boolean;
  matchedType: string | null;
  error?: string;
  suggestion?: string;
  rowCount?: number;
}

/**
 * Validate a CSV file client-side by reading the first few rows
 * and checking headers against known report signatures.
 */
export async function validateCsvFile(
  file: File,
  expectedType: string,
): Promise<ValidationResult> {
  if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
    return { valid: false, matchedType: null, error: "Please upload a CSV file" };
  }

  if (file.size > 200 * 1024 * 1024) {
    return { valid: false, matchedType: null, error: "File too large (max 200 MB)" };
  }

  try {
    // Read just the first chunk to get headers
    const text = await readFirstLines(file, 5);
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      return { valid: false, matchedType: null, error: "File appears to be empty" };
    }

    // Parse CSV header (handle both comma and tab delimiters)
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = parseCSVLine(lines[0], delimiter);

    // Check if headers match the expected type
    const matched = matchHeaders(headers);

    if (matched === expectedType) {
      return { valid: true, matchedType: matched };
    }

    // Wrong report in wrong slot
    if (matched && matched !== expectedType) {
      const matchedName = REPORT_SIGNATURES[matched]?.displayName ?? matched;
      const expectedName = REPORT_SIGNATURES[expectedType]?.displayName ?? expectedType;
      return {
        valid: false,
        matchedType: matched,
        error: `This looks like the ${matchedName} report, not the ${expectedName} report`,
      };
    }

    // Try a fuzzy match
    const guess = guessReportType(headers);
    if (guess) {
      const guessName = REPORT_SIGNATURES[guess.type]?.displayName ?? guess.type;
      return {
        valid: false,
        matchedType: null,
        error: `Headers don't match the expected format`,
        suggestion: `This might be the ${guessName} report`,
      };
    }

    return {
      valid: false,
      matchedType: null,
      error: "Unrecognized CSV format. Make sure you're uploading the right Seller Central report.",
    };
  } catch {
    return { valid: false, matchedType: null, error: "Could not read the file" };
  }
}

/** Read the first N lines of a file without loading the entire thing */
async function readFirstLines(file: File, n: number): Promise<string> {
  // Read first 10KB — enough for headers and a few rows
  const slice = file.slice(0, 10240);
  const text = await slice.text();
  return text.split("\n").slice(0, n).join("\n");
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim().replace(/^"|"$/g, ""));

  return fields;
}
