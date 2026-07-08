import { describe, expect, it } from 'vitest';
import {
  isDbCustomer,
  isFilterJob,
  isIcsCustomer,
  isIcsJob,
  isInstallationCustomer,
  isInstallationJob,
  isMalfunctionCustomer,
  isMalfunctionJob,
  isOngoingCustomer,
  isOngoingJob,
  makeDbCustomerId,
  makeFilterJobId,
  makeInstallationCustomerId,
  makeInstallationJobId,
  makeMalfunctionCustomerId,
  makeMalfunctionJobId,
  makeOngoingCustomerId,
  makeOngoingJobId,
  parseDbCustomerId,
} from './idConventions';

describe('build → predicate round-trips', () => {
  const uuid = 'abc-123';

  it('malfunction job id', () => {
    const id = makeMalfunctionJobId(uuid);
    expect(id).toBe('db-malf-abc-123');
    expect(isMalfunctionJob(id)).toBe(true);
    expect(isInstallationJob(id)).toBe(false);
    expect(isOngoingJob(id)).toBe(false);
  });

  it('installation job id', () => {
    const id = makeInstallationJobId(uuid);
    expect(id).toBe('db-inst-abc-123');
    expect(isInstallationJob(id)).toBe(true);
    expect(isMalfunctionJob(id)).toBe(false);
  });

  it('ongoing job id', () => {
    const id = makeOngoingJobId(uuid);
    expect(id).toBe('db-ongoing-abc-123');
    expect(isOngoingJob(id)).toBe(true);
  });

  it('derived-customer ids', () => {
    expect(isMalfunctionCustomer(makeMalfunctionCustomerId(uuid))).toBe(true);
    expect(isInstallationCustomer(makeInstallationCustomerId(uuid))).toBe(true);
    expect(isOngoingCustomer(makeOngoingCustomerId(uuid))).toBe(true);
  });

  it('db customer id round-trips through the parser', () => {
    const id = makeDbCustomerId(uuid);
    expect(id).toBe('db-cust-abc-123');
    expect(isDbCustomer(id)).toBe(true);
    expect(parseDbCustomerId(id)).toBe(uuid);
    expect(parseDbCustomerId('filter-2026-1-c1')).toBeNull();
  });

  it('filter job id (month not zero-padded)', () => {
    const id = makeFilterJobId(2026, 3, 'c1');
    expect(id).toBe('filter-2026-3-c1');
    expect(isFilterJob(id)).toBe(true);
  });

  it('ics customer/job ids', () => {
    expect(isIcsCustomer('ics-c5')).toBe(true);
    expect(isIcsCustomer('ics-c-unknown-9')).toBe(true);
    expect(isIcsJob('ics-j3')).toBe(true);
  });
});

describe('predicates do not cross-match', () => {
  it('job predicates exclude the derived-customer superset', () => {
    // `db-malf-cust-…` also starts with `db-malf-`; the job predicate must reject it.
    expect(isMalfunctionJob(makeMalfunctionCustomerId('x'))).toBe(false);
    expect(isInstallationJob(makeInstallationCustomerId('x'))).toBe(false);
    expect(isOngoingJob(makeOngoingCustomerId('x'))).toBe(false);
  });

  it('isFilterJob does not match db-* or ics-* ids', () => {
    expect(isFilterJob(makeMalfunctionJobId('x'))).toBe(false);
    expect(isFilterJob(makeOngoingJobId('x'))).toBe(false);
    expect(isFilterJob(makeDbCustomerId('x'))).toBe(false);
    expect(isFilterJob('ics-c3')).toBe(false);
  });

  it('isDbCustomer does not match derived (db-*-cust-) ids', () => {
    expect(isDbCustomer(makeMalfunctionCustomerId('x'))).toBe(false);
    expect(isDbCustomer(makeOngoingCustomerId('x'))).toBe(false);
  });
});
