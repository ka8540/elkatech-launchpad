import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  ISSUE_TYPE_LABELS,
  issueTypeSchema,
  type IssueType,
  type RequestPriority,
} from "@elkatech/contracts";
import { formatFileSize } from "@/lib/attachments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const cardSurface = "lp-card";
export const MAX_ATTACHMENT_MB = 25;
export const ISSUE_TYPES = issueTypeSchema.options as IssueType[];

/* ─── Section block ───────────────────────────────────────────────────────── */
export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-[var(--lp-line)] px-5 py-5 first:border-t-0 sm:px-6 lg:px-7">
      <div className="mb-4 flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="lp-display text-base font-semibold text-[var(--lp-ink)]">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--lp-ink-soft)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function GuidancePanel({
  icon: Icon,
  title,
  items,
  accent = "copper",
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  accent?: "copper" | "emerald";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
      : "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";
  return (
    <aside className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}>
      <div className="relative p-4 sm:p-5">
        <div className="relative flex min-w-0 items-start gap-2.5">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", accentClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="lp-display text-sm font-semibold text-[var(--lp-ink)]">{title}</h3>
        </div>
        <ul className="relative mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex min-w-0 gap-2.5 text-xs leading-5 text-[var(--lp-ink-soft)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function PageHero({
  icon: Icon,
  title,
  description,
  eyebrow = "Create Request",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <header className={cn("relative min-w-0 overflow-hidden rounded-2xl border p-5 sm:p-6", cardSurface)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
        style={{
          maskImage: "linear-gradient(to right, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
        }}
      />
      <div className="relative min-w-0">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <Icon className="h-4 w-4" />
          </div>
          <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
            {eyebrow}
          </p>
        </div>
        <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--lp-ink-soft)]">{description}</p>
      </div>
    </header>
  );
}

export function BackToRequests() {
  return (
    <Button
      asChild
      variant="outline"
      className="h-10 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-5 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
    >
      <Link to="/app/requests">
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </Link>
    </Button>
  );
}

/* ─── Attachment picker (stateful hook + presentational list) ─────────────── */
export type PickedFile = { key: string; file: File; previewUrl?: string };

export function useAttachmentPicker() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;

  // Revoke object URLs on unmount.
  useEffect(
    () => () => {
      filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    },
    [],
  );

  function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const next: PickedFile[] = [];
    for (const file of picked) {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      if (!isMedia) {
        toast.error(`${file.name} is not a photo or video.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_ATTACHMENT_MB} MB.`);
        continue;
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    if (next.length) setFiles((current) => [...current, ...next]);
  }

  function remove(key: string) {
    setFiles((current) => {
      const target = current.find((f) => f.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((f) => f.key !== key);
    });
  }

  return { files, add, remove };
}

export function AttachmentPicker({
  files,
  onAdd,
  onRemove,
}: {
  files: PickedFile[];
  onAdd: (list: FileList | null) => void;
  onRemove: (key: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onAdd(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="h-10 rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-4 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
      >
        <ImagePlus className="h-4 w-4" />
        Add photos or video
      </Button>

      {files.length > 0 && (
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {files.map((picked) => (
            <li
              key={picked.key}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 p-2.5"
            >
              {picked.previewUrl ? (
                <img src={picked.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] text-[var(--lp-accent)]">
                  <Sparkles className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--lp-ink)]">{picked.file.name}</p>
                <p className="text-xs text-[var(--lp-faint)]">{formatFileSize(picked.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(picked.key)}
                aria-label={`Remove ${picked.file.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--lp-faint)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ─── Issue + urgency + description (shared by customer & admin flows) ─────── */
export function IssueFields({
  issueType,
  onIssueType,
  urgency,
  onUrgency,
  description,
  onDescription,
}: {
  issueType: IssueType | "";
  onIssueType: (value: IssueType) => void;
  urgency: RequestPriority;
  onUrgency: (value: RequestPriority) => void;
  description: string;
  onDescription: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2.5 text-sm font-medium text-[var(--lp-ink)]">What is the issue?</p>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TYPES.map((type) => {
            const active = type === issueType;
            return (
              <button
                type="button"
                key={type}
                onClick={() => onIssueType(type)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm transition-colors",
                  active
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.12] text-[var(--lp-accent)]"
                    : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]",
                )}
              >
                {ISSUE_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-medium text-[var(--lp-ink)]">How urgent is it?</p>
        <div className="inline-flex flex-wrap gap-2">
          {[
            { value: "normal" as RequestPriority, label: "Normal" },
            { value: "urgent" as RequestPriority, label: "Urgent — production stopped" },
          ].map((option) => {
            const active = option.value === urgency;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => onUrgency(option.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  active
                    ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.12] text-[var(--lp-accent)]"
                    : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2.5 block text-sm font-medium text-[var(--lp-ink)]">
          Tell us what happened
        </label>
        <Textarea
          rows={5}
          value={description}
          onChange={(event) => onDescription(event.target.value)}
          placeholder="Example: Printer stops after 10 minutes."
          className="lp-field min-h-[120px] resize-y rounded-xl border px-4 py-3 text-sm"
        />
      </div>
    </div>
  );
}
