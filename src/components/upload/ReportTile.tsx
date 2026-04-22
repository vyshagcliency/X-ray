"use client";

import { useCallback, useState } from "react";
import { Upload, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateCsvFile, type ValidationResult } from "@/lib/csv/validate-client";
import type { ReportSignature } from "@/lib/csv/headers";

interface ReportTileProps {
  signature: ReportSignature;
  onValidFile: (file: File) => void;
  onClear: () => void;
}

export function ReportTile({ signature, onValidFile, onClear }: ReportTileProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      const result = await validateCsvFile(file, signature.reportType);
      setValidation(result);

      if (result.valid) {
        onValidFile(file);
      }
    },
    [signature.reportType, onValidFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClear = () => {
    setValidation(null);
    setFileName(null);
    onClear();
  };

  const isValid = validation?.valid === true;
  const isError = validation && !validation.valid;

  return (
    <Card
      className={`transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : isValid
            ? "border-green-500 bg-green-50"
            : isError
              ? "border-destructive bg-destructive/5"
              : ""
      }`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{signature.displayName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{signature.sellerCentralPath}</p>
            <p className="mt-1 text-xs text-muted-foreground">{signature.description}</p>
            <Badge variant="secondary" className="mt-2">
              {signature.dateRange}
            </Badge>
          </div>
        </div>

        {isValid ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="size-4" />
            <span className="truncate">{fileName}</span>
            <button onClick={handleClear} className="ml-auto text-xs underline">
              Remove
            </button>
          </div>
        ) : (
          <label
            className="mt-4 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-muted/50"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isError ? (
              <>
                <XCircle className="size-8 text-destructive" />
                <p className="mt-2 text-center text-sm text-destructive">{validation.error}</p>
                {validation.suggestion && (
                  <p className="mt-1 text-center text-xs text-muted-foreground">
                    {validation.suggestion}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Drop a different file or click to browse</p>
              </>
            ) : (
              <>
                {fileName ? (
                  <FileText className="size-8 text-muted-foreground" />
                ) : (
                  <Upload className="size-8 text-muted-foreground" />
                )}
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {isDragging ? "Drop your file here" : "Drag & drop your CSV or click to browse"}
                </p>
              </>
            )}
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleInput}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
