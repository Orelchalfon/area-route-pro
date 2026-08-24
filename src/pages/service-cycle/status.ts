import { COMPLETION_STATUS_CONFIG, CompletionStatus } from "@/types";

// Manager-editable completion states for a service-cycle row. Shared by the status
// popover (list view) and the edit modal so the choices look/behave identically.
//
// Derived from COMPLETION_STATUS_CONFIG (src/types/index.ts) rather than re-typed, so
// the labels here can never drift from the ones the board and the customer history use.
export const STATUS_OPTIONS: {
  value: CompletionStatus;
  label: string;
  dot: string;
}[] = (Object.keys(COMPLETION_STATUS_CONFIG) as CompletionStatus[]).map((value) => ({
  value,
  label: COMPLETION_STATUS_CONFIG[value].label,
  dot: COMPLETION_STATUS_CONFIG[value].dot,
}));

// Status shown on the service-cycle pill. Technician completion (completion_status)
// takes precedence when present; otherwise fall back to the calendar-synced
// is_done / status_label pair.
type StatusSource = {
  completion_status?: CompletionStatus | null;
  is_done: boolean | null;
  status_label?: string | null;
};

// בוצע = green, צריך לחזור = amber, לא בוצע = red — matching the completion colors
// used on the monthly board.
export const statusClass = (s: StatusSource) => {
  if (s.completion_status) return COMPLETION_STATUS_CONFIG[s.completion_status].pill;
  return s.is_done
    ? COMPLETION_STATUS_CONFIG.done.pill
    : COMPLETION_STATUS_CONFIG.not_done.pill;
};

export const statusText = (s: StatusSource) => {
  if (s.completion_status) return COMPLETION_STATUS_CONFIG[s.completion_status].label;
  return (
    s.status_label ||
    (s.is_done ? COMPLETION_STATUS_CONFIG.done.label : COMPLETION_STATUS_CONFIG.not_done.label)
  );
};

// True when the row counts as completed for summaries (technician-done or calendar-done).
export const isServiceDone = (s: StatusSource) =>
  s.completion_status === "done" || s.is_done === true;
