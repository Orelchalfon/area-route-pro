import type { OngoingService } from "@/hooks/useOngoingServices";
import { COMPLETION_STATUS_LABELS, CompletionStatus } from "@/types";

/**
 * Turns a service-line edit into the activity-log entry that records it.
 *
 * Service-cycle mutations used to leave no trace at all: a status flipped from "בוצע"
 * to "לא בוצע" changed the row and nothing else, so there was no way to see who changed
 * it or what it had been. The old value is spelled out in the details for that reason —
 * the row itself only ever holds the current one.
 *
 * Returns null when the patch changes nothing worth recording, so callers can skip
 * writing an empty entry.
 */

export type ServicePatch = {
  task_description?: string;
  location?: string;
  service_date?: string;
  phone?: string;
  completion_status?: CompletionStatus | null;
};

const FIELD_LABELS: Record<keyof ServicePatch, string> = {
  task_description: "תיאור",
  location: "מיקום",
  service_date: "תאריך",
  phone: "טלפון",
  completion_status: "סטטוס",
};

const statusLabel = (v: CompletionStatus | null | undefined) =>
  v ? COMPLETION_STATUS_LABELS[v] : "ללא סטטוס";

const shown = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t.length ? t : "ריק";
};

export function describeServicePatch(
  prev: Pick<OngoingService, "task_description" | "location" | "service_date" | "phone" | "completion_status"> | undefined,
  patch: ServicePatch,
): { action: string; details: string } | null {
  const keys = (Object.keys(patch) as (keyof ServicePatch)[]).filter(
    (k) => patch[k] !== undefined,
  );
  if (keys.length === 0) return null;

  // Drop no-op fields so re-saving a dialog without touching anything logs nothing.
  const changed = keys.filter((k) => {
    const next = patch[k] ?? null;
    const before = (prev?.[k] ?? null) as string | null;
    return (next ?? null) !== before;
  });
  if (changed.length === 0) return null;

  // A status-only edit is the common case and reads better with its own wording.
  if (changed.length === 1 && changed[0] === "completion_status") {
    const next = patch.completion_status ?? null;
    const before = prev?.completion_status ?? null;
    return next === null
      ? {
          action: "ניקוי סטטוס",
          details: `הסטטוס "${statusLabel(before)}" נוקה`,
        }
      : {
          action: "עדכון סטטוס שירות",
          details: `${statusLabel(before)} ← ${statusLabel(next)}`,
        };
  }

  const parts = changed.map((k) => {
    if (k === "completion_status") {
      return `${FIELD_LABELS[k]}: ${statusLabel(prev?.completion_status ?? null)} ← ${statusLabel(
        patch.completion_status ?? null,
      )}`;
    }
    return `${FIELD_LABELS[k]}: ${shown(prev?.[k] as string | null)} ← ${shown(
      patch[k] as string | null,
    )}`;
  });

  return { action: "עריכת שירות", details: parts.join(" | ") };
}
