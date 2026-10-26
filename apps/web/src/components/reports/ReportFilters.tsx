import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EMPTY_REPORT_FILTERS,
  REPORT_AREA_OPTIONS,
  REPORT_SEVERITY_OPTIONS,
  REPORT_STATUS_OPTIONS,
  hasActiveFilters,
  type ReportFilters as Filters,
} from "./report-access";

/** Matches the filter control in PeopleActivityPage so the two consoles read
 *  as the same product: own chevron, consistent gutters, shared width. */
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative w-full sm:w-[168px]">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(
          "lp-field h-10 w-full cursor-pointer appearance-none rounded-md border",
          "pl-3 pr-9 text-sm",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
      />
    </div>
  );
}

/**
 * Filters for the Issue Reports console.
 *
 * Note what is missing: there is no way to filter or search by customer. The
 * search box covers the report number, the title, the error text and the
 * anonymous reporter reference — nothing that identifies a person is queryable
 * from this page, which is the point of the whole feature.
 */
export default function ReportFilters({
  filters,
  onChange,
  assignees,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  assignees: Array<{ id: string; displayName: string }>;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
          />
          <Input
            aria-label="Search reports"
            placeholder="Report number, title, error, RPT-USR-…"
            value={filters.search}
            onChange={(event) => set("search", event.target.value)}
            className="lp-field h-10 pl-9"
          />
        </div>

        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) => set("status", value)}
          options={[
            { value: "all" as const, label: "All statuses" },
            ...REPORT_STATUS_OPTIONS,
          ]}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity}
          onChange={(value) => set("severity", value)}
          options={[
            { value: "all" as const, label: "All severities" },
            ...REPORT_SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          ]}
        />
        <FilterSelect
          label="Area"
          value={filters.area}
          onChange={(value) => set("area", value)}
          options={[{ value: "all" as const, label: "All areas" }, ...REPORT_AREA_OPTIONS]}
        />
        <FilterSelect
          label="Assigned to"
          value={filters.assignee}
          onChange={(value) => set("assignee", value)}
          options={[
            { value: "all", label: "Anyone" },
            { value: "unassigned", label: "Unassigned" },
            ...assignees.map((a) => ({ value: a.id, label: a.displayName })),
          ]}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label
            htmlFor="reports-from"
            className="text-xs font-medium text-[var(--lp-ink-soft)]"
          >
            From
          </label>
          <Input
            id="reports-from"
            type="date"
            value={filters.from}
            onChange={(event) => set("from", event.target.value)}
            className="lp-field h-10 w-[168px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="reports-to" className="text-xs font-medium text-[var(--lp-ink-soft)]">
            To
          </label>
          <Input
            id="reports-to"
            type="date"
            value={filters.to}
            onChange={(event) => set("to", event.target.value)}
            className="lp-field h-10 w-[168px]"
          />
        </div>
        {hasActiveFilters(filters) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-[var(--lp-ink-soft)]"
            onClick={() => onChange(EMPTY_REPORT_FILTERS)}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
