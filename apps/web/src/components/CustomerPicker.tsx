import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  CUSTOMER_PICKER_MIN_SEARCH_LENGTH,
  CUSTOMER_PICKER_PAGE_SIZE_DEFAULT,
  type CustomerPickerCustomer,
  type CustomerPickerResponse,
} from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CU"
  );
}

function statusLabel(status: CustomerPickerCustomer["approvalStatus"]): string {
  switch (status) {
    case "pending_approval":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "suspended":
      return "Suspended";
    default:
      return "Approved";
  }
}

function CustomerStatusBadge({
  status,
}: {
  status: CustomerPickerCustomer["approvalStatus"];
}) {
  const approved = status === "approved";
  const pending = status === "pending_approval";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        approved
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
          : pending
            ? "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300"
            : "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function CustomerIdentity({
  customer,
  selected = false,
}: {
  customer: CustomerPickerCustomer;
  selected?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-xs font-semibold text-[var(--lp-ink-soft)]">
        {initials(customer.displayName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--lp-ink)]">
            {customer.displayName}
          </span>
          {selected && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--lp-accent)]" />}
        </span>
        <span className="block truncate text-xs text-[var(--lp-ink-soft)]">
          {customer.email}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {customer.companyName && (
            <>
              <span className="truncate text-[11px] text-[var(--lp-faint)]">
                {customer.companyName}
              </span>
              <span aria-hidden="true" className="text-[var(--lp-faint)]">
                ·
              </span>
            </>
          )}
          <CustomerStatusBadge status={customer.approvalStatus} />
        </span>
      </span>
    </div>
  );
}

export type CustomerPickerProps = {
  value: CustomerPickerCustomer | null;
  onChange: (customer: CustomerPickerCustomer | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
};

const CustomerPicker = ({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: CustomerPickerProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery, SEARCH_DEBOUNCE_MS);
  const canSearch = debouncedQuery.length >= CUSTOMER_PICKER_MIN_SEARCH_LENGTH;

  const resultsQuery = useInfiniteQuery({
    queryKey: ["admin", "customer-picker", debouncedQuery],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({
        search: debouncedQuery,
        limit: String(CUSTOMER_PICKER_PAGE_SIZE_DEFAULT),
      });
      if (pageParam) params.set("cursor", pageParam);
      return apiRequest<CustomerPickerResponse>(
        `/api/admin/customer-picker?${params.toString()}`,
        { signal },
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open && canSearch,
  });

  const customers = useMemo(
    () => resultsQuery.data?.pages.flatMap((page) => page.customers) ?? [],
    [resultsQuery.data],
  );
  const isDebouncing =
    normalizedQuery.length >= CUSTOMER_PICKER_MIN_SEARCH_LENGTH &&
    normalizedQuery !== debouncedQuery;
  const showLoading =
    normalizedQuery.length >= CUSTOMER_PICKER_MIN_SEARCH_LENGTH &&
    (isDebouncing || (resultsQuery.isPending && canSearch));
  const showError = open && canSearch && !showLoading && resultsQuery.isError;
  const showNoResults =
    open &&
    canSearch &&
    !showLoading &&
    resultsQuery.isSuccess &&
    customers.length === 0;
  const showResults =
    open &&
    canSearch &&
    !showLoading &&
    !resultsQuery.isError &&
    customers.length > 0;

  useEffect(() => {
    if (!showResults) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) =>
      current >= 0 && current < customers.length ? current : 0,
    );
  }, [customers.length, showResults]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${listboxId}-${customers[activeIndex]?.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, customers, listboxId]);

  function choose(customer: CustomerPickerCustomer) {
    onChange(customer);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function beginChange() {
    onChange(null);
    setQuery("");
    setOpen(true);
  }

  if (value) {
    return (
      <div
        data-testid="selected-customer-summary"
        className="rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)]/55 p-3"
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <CustomerIdentity customer={value} selected />
          {!readOnly && (
            <button
              type="button"
              aria-label="Clear customer selection"
              onClick={() => onChange(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--lp-faint)] transition-colors hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={beginChange}
            className="mt-2 text-xs font-semibold text-[var(--lp-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
          >
            Change customer
          </button>
        )}
      </div>
    );
  }

  return (
    <Popover
      open={showResults}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false);
      }}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex h-10 items-center rounded-md border border-input bg-background px-3 shadow-sm transition-colors",
            "hover:border-[var(--lp-line-strong)] focus-within:border-[var(--lp-accent)]/65 focus-within:ring-2 focus-within:ring-[var(--lp-accent)]/20",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none mr-2 h-4 w-4 shrink-0 text-[var(--lp-faint)]"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search customers"
            aria-autocomplete="list"
            aria-controls={showResults ? listboxId : undefined}
            aria-expanded={showResults}
            aria-activedescendant={
              showResults && activeIndex >= 0 && customers[activeIndex]
                ? `${listboxId}-${customers[activeIndex].id}`
                : undefined
            }
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => {
              inputRef.current?.focus();
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                if (customers.length > 0) {
                  setActiveIndex((current) =>
                    current < 0 ? 0 : (current + 1) % customers.length,
                  );
                }
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                if (customers.length > 0) {
                  setActiveIndex((current) =>
                    current <= 0 ? customers.length - 1 : current - 1,
                  );
                }
                return;
              }
              if (
                event.key === "Enter" &&
                activeIndex >= 0 &&
                customers[activeIndex]
              ) {
                event.preventDefault();
                choose(customers[activeIndex]);
              }
            }}
            disabled={disabled}
            placeholder="Search customer by name, email, or company"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--lp-ink)] outline-none placeholder:text-[var(--lp-faint)] disabled:cursor-not-allowed"
          />
          {showLoading && (
            <span
              role="status"
              className="flex shrink-0 items-center text-[var(--lp-faint)]"
            >
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              <span className="sr-only">Searching customers…</span>
            </span>
          )}
          {showNoResults && (
            <span
              role="status"
              className="shrink-0 text-[11px] font-medium text-[var(--lp-faint)]"
            >
              No matches
            </span>
          )}
          {showError && (
            <span
              role="alert"
              className="flex shrink-0 items-center gap-1.5 text-rose-600 dark:text-rose-300"
            >
              <span className="sr-only">Couldn’t load customers.</span>
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
              <button
                type="button"
                aria-label="Try again"
                onClick={() => void resultsQuery.refetch()}
                className="text-[11px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45"
              >
                Retry
              </button>
            </span>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        collisionPadding={16}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === inputRef.current) event.preventDefault();
        }}
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-0 shadow-xl"
      >
        <div
          id={listboxId}
          role="listbox"
          aria-label="Customer results"
          className="max-h-72 overflow-y-auto overscroll-contain p-1"
        >
          {customers.map((customer, index) => (
            <button
              key={customer.id}
              id={`${listboxId}-${customer.id}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => choose(customer)}
              className={cn(
                "flex min-h-14 w-full rounded-lg px-2.5 py-2 text-left text-[var(--lp-ink)] outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lp-accent)]",
                activeIndex === index &&
                  "bg-[var(--lp-panel-2)] shadow-[inset_3px_0_0_var(--lp-accent)]",
              )}
            >
              <CustomerIdentity customer={customer} />
            </button>
          ))}
          {resultsQuery.hasNextPage && (
            <div className="border-t border-[var(--lp-line)] p-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-[var(--lp-accent)]"
                disabled={resultsQuery.isFetchingNextPage}
                onClick={() => void resultsQuery.fetchNextPage()}
              >
                {resultsQuery.isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CustomerPicker;
