import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Loader2, X } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Directory = { id: string; displayName: string; email: string };

/**
 * Assign or reassign an engineer through the existing
 * `POST /api/requests/:id/assign` workflow. Corrections always create a new
 * assignment — history rows are never edited.
 */
export default function AssignEngineerDialog({
  requestId,
  requestNumber,
  subject,
  currentEngineerId,
  onClose,
}: {
  requestId: string;
  requestNumber: string;
  subject: string;
  currentEngineerId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [engineerId, setEngineerId] = useState(currentEngineerId ?? "");

  const engineersQuery = useQuery({
    queryKey: ["engineers"],
    queryFn: () => apiRequest<Directory[]>("/api/engineers"),
  });

  const assign = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ engineerId }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activity-people"] }),
        queryClient.invalidateQueries({ queryKey: ["activity-person"] }),
        queryClient.invalidateQueries({ queryKey: ["activity-tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["activity-history"] }),
      ]);
      toast.success(currentEngineerId ? "Request reassigned." : "Engineer assigned.");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not assign engineer.");
    },
  });

  const engineers = engineersQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={currentEngineerId ? "Reassign request" : "Assign request"}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-5 shadow-[0_28px_90px_-50px_rgba(0,0,0,0.85)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="lp-display text-base font-bold text-[var(--lp-ink)]">
            {currentEngineerId ? "Reassign request" : "Assign request"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md text-[var(--lp-faint)] hover:text-[var(--lp-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-3">
          <p className="lp-mono text-[10px] uppercase tracking-wider text-[var(--lp-faint)]">
            {requestNumber}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--lp-ink)]">{subject}</p>
        </div>

        <label htmlFor="assign-engineer" className="mb-2 block text-sm font-medium text-[var(--lp-ink)]">
          Engineer
        </label>
        {engineersQuery.isLoading ? (
          <div className="h-10 animate-pulse rounded-md bg-[var(--lp-panel-2)]" aria-hidden />
        ) : engineers.length === 0 ? (
          <p className="rounded-md border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            No engineer accounts exist yet. Invite one before assigning.
          </p>
        ) : (
          <div className="relative">
            <select
              id="assign-engineer"
              value={engineerId}
              onChange={(event) => setEngineerId(event.target.value)}
              // appearance-none + our own chevron, so the icon keeps a proper
              // gutter instead of sitting flush against the border.
              className="lp-field h-10 w-full cursor-pointer appearance-none rounded-md border pl-3 pr-9 text-sm"
            >
              <option value="">Select an engineer…</option>
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.displayName} ({engineer.email})
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="cta"
            size="sm"
            disabled={!engineerId || engineerId === currentEngineerId || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentEngineerId ? "Reassign" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
