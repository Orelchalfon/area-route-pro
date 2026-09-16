// `Job.notes` is a DISPLAY string joined from two different DB columns: a per-table
// "what is this job" description and the free-text notes column —
//   malfunctions:      [description, notes]
//   installations:     [product_type, notes]
//   ongoing_services:  [task_description, notes]
// (see the `.join(' | ')` calls in useMalfunctionsInstallations / useOngoingServices).
//
// Writing that joined string straight back into `notes` — which is what
// buildDbJobUpdatePatch used to do — duplicates the description on the next refetch
// ("תיאור | תיאור | הערה"). Anything that edits notes must split it first and persist
// the two halves to their own columns.
export const JOB_NOTES_SEPARATOR = ' | ';

export interface SplitJobNotes {
  /** First segment — description / product_type / task_description. */
  description: string;
  /** Everything after the first separator — the free-text `notes` column. */
  notes: string;
}

export function splitJobNotes(joined: string | undefined | null): SplitJobNotes {
  const value = joined ?? '';
  const separatorAt = value.indexOf(JOB_NOTES_SEPARATOR);
  if (separatorAt === -1) return { description: value, notes: '' };
  return {
    description: value.slice(0, separatorAt),
    notes: value.slice(separatorAt + JOB_NOTES_SEPARATOR.length),
  };
}

// Inverse of splitJobNotes, matching the loaders' `[a, b].filter(Boolean).join(' | ')`
// so a split → join round-trip is stable.
export function joinJobNotes(description: string, notes: string): string {
  return [description, notes].filter(Boolean).join(JOB_NOTES_SEPARATOR);
}

/**
 * The joined display string with ONLY the notes half replaced — the description is
 * carried through untouched.
 *
 * For the day-approval / day-detail הערות editor, which edits technician notes and
 * must never touch the description. That matters because a calendar row arrives with
 * customer_name NULL, so ongoingCustomerName() names it after task_description: rewrite
 * the description there and you rename the job on the monthly board. The editor is
 * seeded with `splitJobNotes(job.notes).notes` and re-joined here, so the description
 * has no path back into the patch at all.
 */
export function withEditedNotes(
  joined: string | undefined | null,
  edited: string,
): string {
  return joinJobNotes(splitJobNotes(joined).description, edited);
}
