"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Copy-to-clipboard button with a brief confirmed state. Used to make dispute drafts
 * copy-ready on the report (P2.3). Calm, not flashy — Controllers trust quiet tools.
 */
export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permissions) — no-op; the draft text
      // is still selectable on the page.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      className={className}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <>
          <Check className="mr-1.5 size-3.5 stroke-[1.5]" /> Copied
        </>
      ) : (
        <>
          <Copy className="mr-1.5 size-3.5 stroke-[1.5]" /> {label}
        </>
      )}
    </Button>
  );
}
