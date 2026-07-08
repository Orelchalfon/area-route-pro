import { CompletionStatus, JobPriority, JobStatus } from '@/types';

// Shared normalizers for the raw `status` / `priority` / completion strings that
// arrive from Supabase rows. Previously each hook (useMalfunctionsInstallations,
// useOngoingServices, useScheduledFilterServices) redefined these locally; the
// copies differed only in their fallbacks, captured here as options so behavior
// is preserved exactly per caller.

const CANONICAL_STATUSES: readonly JobStatus[] = [
  'draft',
  'pending_customer',
  'confirmed',
  'in_progress',
  'completed',
  'rescheduled',
];

// Maps a raw DB status to a JobStatus. Unknown/empty values fall back to
// `defaultStatus` ('draft' for malfunctions/installations/ongoing, 'confirmed'
// for scheduled filter services). Note the legacy `'pending' → 'draft'` branch
// in the malfunctions copy was redundant (its default was already 'draft'), so
// it is covered by the default rather than a special case.
export function mapStatus(status: string | null | undefined, defaultStatus: JobStatus = 'draft'): JobStatus {
  if (status && (CANONICAL_STATUSES as readonly string[]).includes(status)) {
    return status as JobStatus;
  }
  return defaultStatus;
}

// Maps a raw DB priority to a JobPriority. Set `hebrew` to also accept the
// hand-entered Hebrew labels ('גבוהה'/'בינונית') used in malfunctions rows.
export function mapPriority(priority: string | null | undefined, opts?: { hebrew?: boolean }): JobPriority {
  if (priority === 'high' || priority === 'medium' || priority === 'low') return priority;
  if (opts?.hebrew) {
    if (priority === 'גבוהה') return 'high';
    if (priority === 'בינונית') return 'medium';
  }
  return 'low';
}

// Maps a raw DB completion status; anything unrecognized becomes undefined.
export function mapCompletionStatus(status: string | null | undefined): CompletionStatus | undefined {
  if (status === 'done' || status === 'not_done' || status === 'need_return') return status;
  return undefined;
}
