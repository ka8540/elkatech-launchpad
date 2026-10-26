import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TableSearch({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-9 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)] pl-9 text-sm focus-visible:ring-[var(--lp-accent)]/40"
      />
    </div>
  );
}
