"use client";

import { useCallback, useState } from "react";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
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
      className={`h-full transition-all duration-200 ${
        isDragging
          ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
          : isValid
            ? "border-green-500/70 bg-green-50/70"
            : isError
              ? "border-destructive bg-destructive/5"
              : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <CardContent className="p-4">
        {isValid ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium">{signature.displayName}</h3>
              <p className="truncate text-xs text-green-700">{fileName}</p>
            </div>
            <button onClick={handleClear} className="shrink-0 text-xs text-muted-foreground underline">
              Remove
            </button>
          </div>
        ) : (
          <label
            className="flex cursor-pointer items-center gap-4"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{signature.displayName}</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {signature.dateRange}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-foreground/70">{signature.description}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{signature.sellerCentralPath}</p>
              {isError && (
                <p className="mt-1 text-xs text-destructive">
                  {validation.error}
                  {validation.suggestion && ` (${validation.suggestion})`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3.5 py-2 text-muted-foreground transition-colors hover:border-slate-400 hover:bg-muted/40">
              {isError ? (
                <XCircle className="size-4 text-destructive" />
              ) : (
                <Upload className="size-4" />
              )}
              <span className="text-xs">
                {isDragging ? "Drop here" : "Drop CSV or browse"}
              </span>
            </div>
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
