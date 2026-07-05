import { CompletionStatus } from "@/types";

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
  switch (s.completion_status) {
    case "done":
      return "bg-green-100 border-green-300 text-green-800";
    case "need_return":
      return "bg-amber-100 border-amber-300 text-amber-800";
    case "not_done":
      return "bg-red-100 border-red-300 text-red-800";
    default:
      return s.is_done
        ? "bg-green-100 border-green-300 text-green-800"
        : "bg-red-100 border-red-300 text-red-800";
  }
};

export const statusText = (s: StatusSource) => {
  switch (s.completion_status) {
    case "done":
      return "בוצע";
    case "need_return":
      return "צריך לחזור";
    case "not_done":
      return "לא בוצע";
    default:
      return s.status_label || (s.is_done ? "בוצע" : "לא בוצע");
  }
};

// True when the row counts as completed for summaries (technician-done or calendar-done).
export const isServiceDone = (s: StatusSource) =>
  s.completion_status === "done" || s.is_done === true;
