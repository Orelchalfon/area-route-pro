import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

/**
 * Filters the day's job list down to one customer, so a technician doesn't have to
 * scroll a full day of cards to find the visit they're standing outside of.
 *
 * Presentational only — the parent owns the query and does the matching.
 */
export function JobSearchBar({
  value,
  onChange,
  resultLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  /** e.g. "מציג 1 מתוך 9 משימות". Empty while there is no active query. */
  resultLabel?: string;
}) {
  return (
    <div>
      <div className="relative">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון, כתובת או עיר..."
          aria-label="חיפוש משימה"
          // h-11 is the 44px touch target; text-base also stops iOS zooming on focus.
          className="ps-9 pe-10 h-11 text-base"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="נקה חיפוש"
            className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Announced on change so the result count reaches a screen reader too — the
          filtered list itself gives no spoken feedback. */}
      <p className="mt-1.5 text-xs text-muted-foreground text-start" aria-live="polite">
        {resultLabel}
      </p>
    </div>
  );
}
