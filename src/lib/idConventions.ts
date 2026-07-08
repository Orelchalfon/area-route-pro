// Single source of truth for the prefixed string IDs the app uses to encode a
// job's or customer's data source. The prefix determines how/where a record
// persists (see CLAUDE.md → "Job ID conventions"). Previously these literals were
// built and inspected via raw template strings / `startsWith` in ~13 files; a typo
// silently broke routing. Build IDs with the `make*` helpers and inspect them with
// the `is*` predicates so the strings live in exactly one place.
//
// Note on supersets: a derived-customer id (`db-malf-cust-…`) also starts with the
// job prefix (`db-malf-`). Job ids never carry a `-cust-` segment, so the job
// predicates below explicitly exclude it to stay unambiguous.

export const ID_PREFIX = {
  malfunctionJob: 'db-malf-',
  installationJob: 'db-inst-',
  ongoingJob: 'db-ongoing-',
  malfunctionCustomer: 'db-malf-cust-',
  installationCustomer: 'db-inst-cust-',
  ongoingCustomer: 'db-ongoing-cust-',
  dbCustomer: 'db-cust-',
  filterJob: 'filter-',
  icsCustomer: 'ics-c',
  icsJob: 'ics-',
} as const;

// ---- Builders -------------------------------------------------------------

export const makeMalfunctionJobId = (rowId: string) => `${ID_PREFIX.malfunctionJob}${rowId}`;
export const makeInstallationJobId = (rowId: string) => `${ID_PREFIX.installationJob}${rowId}`;
export const makeOngoingJobId = (rowId: string) => `${ID_PREFIX.ongoingJob}${rowId}`;

export const makeMalfunctionCustomerId = (rowId: string) => `${ID_PREFIX.malfunctionCustomer}${rowId}`;
export const makeInstallationCustomerId = (rowId: string) => `${ID_PREFIX.installationCustomer}${rowId}`;
export const makeOngoingCustomerId = (rowId: string) => `${ID_PREFIX.ongoingCustomer}${rowId}`;
export const makeDbCustomerId = (rowId: string) => `${ID_PREFIX.dbCustomer}${rowId}`;

// Synthetic filter-replacement job id. Deterministic (no DB row) so re-deriving the
// same customer/month/year never produces a duplicate. Month is NOT zero-padded.
export const makeFilterJobId = (year: number | string, month: number | string, customerId: string) =>
  `${ID_PREFIX.filterJob}${year}-${month}-${customerId}`;

export const makeIcsCustomerId = (idx: number | string) => `${ID_PREFIX.icsCustomer}${idx}`;

// ---- Predicates -----------------------------------------------------------

export const isMalfunctionJob = (id: string) =>
  id.startsWith(ID_PREFIX.malfunctionJob) && !id.startsWith(ID_PREFIX.malfunctionCustomer);
export const isInstallationJob = (id: string) =>
  id.startsWith(ID_PREFIX.installationJob) && !id.startsWith(ID_PREFIX.installationCustomer);
export const isOngoingJob = (id: string) =>
  id.startsWith(ID_PREFIX.ongoingJob) && !id.startsWith(ID_PREFIX.ongoingCustomer);
export const isFilterJob = (id: string) => id.startsWith(ID_PREFIX.filterJob);

export const isMalfunctionCustomer = (id: string) => id.startsWith(ID_PREFIX.malfunctionCustomer);
export const isInstallationCustomer = (id: string) => id.startsWith(ID_PREFIX.installationCustomer);
export const isOngoingCustomer = (id: string) => id.startsWith(ID_PREFIX.ongoingCustomer);
export const isDbCustomer = (id: string) => id.startsWith(ID_PREFIX.dbCustomer);

// `ics-c…` are calendar-derived customers; `ics-…` (the broader prefix) covers the
// calendar-derived jobs too. Order matters: an ics customer id also matches isIcsJob.
export const isIcsCustomer = (id: string) => id.startsWith(ID_PREFIX.icsCustomer);
export const isIcsJob = (id: string) => id.startsWith(ID_PREFIX.icsJob);

// ---- Parsers --------------------------------------------------------------

// Strip the `db-cust-` prefix back to the raw customers-table UUID, or null.
export const parseDbCustomerId = (id: string): string | null =>
  id.startsWith(ID_PREFIX.dbCustomer) ? id.slice(ID_PREFIX.dbCustomer.length) : null;
