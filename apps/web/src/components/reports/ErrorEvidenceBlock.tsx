import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The exact error the customer pasted, treated as evidence rather than prose:
 * inset, ruled, monospace, with its own copy affordance.
 *
 * Rendered strictly as text. `{text}` inside a `<pre>` is escaped by React, so
 * a payload containing markup shows up as literal characters — there is no
 * `dangerouslySetInnerHTML` anywhere in this feature and a test enforces that.
 */
export default function ErrorEvidenceBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is unavailable (insecure context, denied permission). The
      // text is selectable, so silently leaving the button idle is honest.
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--lp-line)] px-3 py-2">
        <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
          {label ?? "Exact error message"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-[var(--lp-ink-soft)]"
          onClick={copy}
        >
          {copied ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-5 text-[var(--lp-ink)]">
        {text}
      </pre>
    </div>
  );
}
