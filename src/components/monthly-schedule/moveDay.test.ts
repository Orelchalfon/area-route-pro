import { describe, expect, it } from 'vitest';
import { Job, CompletionStatus } from '@/types';
import {
  buildMoveDayAssignments,
  buildSwapDayPlan,
  resolveSwapApprovals,
} from './moveDay';
import { calculateTimeRanges } from './utils';

// Handing a sick technician's day to the other one. Two rules carry the whole feature:
// reported stops stay with whoever did them, and times only move when the receiving
// technician already has work that day.

const job = (
  id: string,
  estimatedDuration: number,
  scheduledTime?: string,
  completionStatus?: CompletionStatus,
): Job => ({
  id,
  type: 'filter_replacement',
  status: 'confirmed',
  priority: 'low',
  customerId: `c-${id}`,
  estimatedDuration,
  location: '',
  city: '',
  notes: '',
  createdAt: '2026-08-01',
  technicianId: 't1',
  scheduledDate: '2026-08-13',
  scheduledTime,
  completionStatus,
});

const DATE = '2026-08-13';

describe('buildMoveDayAssignments — empty target day', () => {
  it('keeps every stop at its exact time, so the route order and the customer confirmations survive', () => {
    const day = [job('a', 60, '10:00'), job('b', 20, '11:00'), job('c', 45, '11:20')];

    const { assignments, movedJobs, skippedJobs } = buildMoveDayAssignments(
      day,
      [],
      't2',
      DATE,
    );

    expect(movedJobs).toHaveLength(3);
    expect(skippedJobs).toHaveLength(0);
    expect(assignments.map((a) => a.scheduledTime)).toEqual(['10:00', '11:00', '11:20']);
    assignments.forEach((a) => {
      expect(a.technicianId).toBe('t2');
      expect(a.scheduledDate).toBe(DATE);
    });
  });

  it('carries an unapproved day over untouched — placeholder times included', () => {
    const day = [job('a', 60, '08:00'), job('b', 20)];

    const { assignments } = buildMoveDayAssignments(day, [], 't2', DATE);

    expect(assignments.map((a) => a.scheduledTime)).toEqual(['08:00', '']);
  });
});

describe('buildMoveDayAssignments — target day already has work', () => {
  it('appends after the target’s last stop, with no overlap', () => {
    // Target's own route: 10:00 (60m) then 11:00 (30m) — free from 11:30.
    const target = [job('t-a', 60, '10:00'), job('t-b', 30, '11:00')];
    const day = [job('a', 20, '10:00'), job('b', 45, '10:20')];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);

    expect(assignments.map((a) => a.scheduledTime)).toEqual(['11:30', '11:50']);
  });

  it('lands on exactly the slots calculateTimeRanges derives, so the merged day reads as saved', () => {
    const target = [job('t-a', 60, '10:00'), job('t-b', 30, '11:00')];
    const day = [job('a', 20), job('b', 45)];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);
    const movedWithTimes = day.map((j, i) => ({
      ...j,
      scheduledTime: assignments[i].scheduledTime,
    }));

    // Reopening the day sorts by scheduledTime and recomputes positions from 10:00.
    const reopened = [...target, ...movedWithTimes].sort((x, y) =>
      (x.scheduledTime || '').localeCompare(y.scheduledTime || ''),
    );
    calculateTimeRanges(reopened).forEach(({ job: j, startTime }) => {
      expect(j.scheduledTime).toBe(startTime);
    });
  });

  it('re-times the stops in the source route order, not in the board’s grouping order', () => {
    const target = [job('t-a', 60, '10:00')];
    // The board hands over filter jobs first, then manual — here the manual stop was
    // actually the earlier one on the route.
    const day = [job('filter', 20, '11:00'), job('manual', 30, '10:00')];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);

    expect(assignments.map((a) => a.jobId)).toEqual(['manual', 'filter']);
    expect(assignments.map((a) => a.scheduledTime)).toEqual(['11:00', '11:30']);
  });

  it('puts stops with no time at the end of the appended block', () => {
    const target = [job('t-a', 60, '10:00')];
    const day = [job('untimed', 20), job('timed', 30, '10:00')];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);

    expect(assignments.map((a) => a.jobId)).toEqual(['timed', 'untimed']);
  });

  it('starts at 10:00 when the target’s stops are all placeholder-timed', () => {
    const target = [job('t-a', 60, '08:00')];
    const day = [job('a', 20, '13:00')];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);

    expect(assignments[0].scheduledTime).toBe('10:00');
  });
});

describe('buildMoveDayAssignments — reported stops', () => {
  it('leaves a reported stop with the technician who did it', () => {
    const day = [
      job('done', 60, '10:00', 'done'),
      job('live', 20, '11:00'),
      job('returned', 30, '11:20', 'need_return'),
    ];

    const { movedJobs, skippedJobs, assignments } = buildMoveDayAssignments(
      day,
      [],
      't2',
      DATE,
    );

    expect(movedJobs.map((j) => j.id)).toEqual(['live']);
    expect(skippedJobs.map((j) => j.id)).toEqual(['done', 'returned']);
    expect(assignments).toHaveLength(1);
  });

  it('produces nothing to move when the whole day was already reported', () => {
    const day = [job('a', 60, '10:00', 'done'), job('b', 20, '11:00', 'not_done')];

    const { movedJobs, assignments, skippedJobs } = buildMoveDayAssignments(
      day,
      [],
      't2',
      DATE,
    );

    expect(movedJobs).toHaveLength(0);
    expect(assignments).toHaveLength(0);
    expect(skippedJobs).toHaveLength(2);
  });

  it('does not let a skipped stop push the appended times', () => {
    // The reported stop stays put; only the live one is timed against the target day.
    const target = [job('t-a', 60, '10:00')];
    const day = [job('done', 90, '10:00', 'done'), job('live', 20, '11:30')];

    const { assignments } = buildMoveDayAssignments(day, target, 't2', DATE);

    expect(assignments).toEqual([
      { jobId: 'live', technicianId: 't2', scheduledDate: DATE, scheduledTime: '11:00' },
    ]);
  });
});

describe('buildSwapDayPlan', () => {
  it('trades the two days at their exact times — nobody has to re-confirm', () => {
    const shilo = [job('s1', 60, '10:00'), job('s2', 30, '11:00')];
    const neria = [job('n1', 45, '10:00'), job('n2', 20, '10:45'), job('n3', 60, '11:05')];

    const { toOther, toSource, assignments } = buildSwapDayPlan(
      shilo,
      neria,
      'shilo',
      'neria',
      DATE,
    );

    expect(toOther.assignments).toEqual([
      { jobId: 's1', technicianId: 'neria', scheduledDate: DATE, scheduledTime: '10:00' },
      { jobId: 's2', technicianId: 'neria', scheduledDate: DATE, scheduledTime: '11:00' },
    ]);
    expect(toSource.assignments.map((a) => a.scheduledTime)).toEqual([
      '10:00',
      '10:45',
      '11:05',
    ]);
    toSource.assignments.forEach((a) => expect(a.technicianId).toBe('shilo'));
    // One write, and no job can be claimed by both technicians.
    expect(assignments).toHaveLength(5);
    expect(new Set(assignments.map((a) => a.jobId)).size).toBe(5);
  });

  it('degrades to the plain hand-over when the other technician has nothing that day', () => {
    const shilo = [job('s1', 60, '10:00'), job('s2', 30, '11:00')];

    const { toOther, toSource } = buildSwapDayPlan(shilo, [], 'shilo', 'neria', DATE);

    expect(toOther.assignments).toEqual(
      buildMoveDayAssignments(shilo, [], 'neria', DATE).assignments,
    );
    expect(toSource.assignments).toHaveLength(0);
    expect(toSource.movedJobs).toHaveLength(0);
  });

  it('times each incoming block against the reported stops staying on that day', () => {
    // נריה got through her 10:00 (90m) call before going home; שילה's day is untouched.
    const neria = [job('n-done', 90, '10:00', 'done'), job('n1', 20, '11:30')];
    const shilo = [job('s1', 30, '10:00'), job('s2', 45, '10:30')];

    const { toOther, toSource } = buildSwapDayPlan(
      shilo,
      neria,
      'shilo',
      'neria',
      DATE,
    );

    // Into נריה's day: her reported call still owns 10:00–11:30, so שילה's stops start after it.
    expect(toOther.assignments.map((a) => a.scheduledTime)).toEqual(['11:30', '12:00']);
    // Into שילה's day: nothing stayed behind, so נריה's live stop keeps its own time.
    expect(toSource.assignments.map((a) => a.scheduledTime)).toEqual(['11:30']);
  });

  it('leaves every reported stop with the technician who reported it', () => {
    const shilo = [job('s-done', 60, '10:00', 'not_done'), job('s1', 30, '11:00')];
    const neria = [job('n-done', 45, '10:00', 'done'), job('n1', 20, '10:45')];

    const { toOther, toSource } = buildSwapDayPlan(
      shilo,
      neria,
      'shilo',
      'neria',
      DATE,
    );

    expect(toOther.movedJobs.map((j) => j.id)).toEqual(['s1']);
    expect(toOther.skippedJobs.map((j) => j.id)).toEqual(['s-done']);
    expect(toSource.movedJobs.map((j) => j.id)).toEqual(['n1']);
    expect(toSource.skippedJobs.map((j) => j.id)).toEqual(['n-done']);
  });

  it('still moves work back when the whole source day was already reported', () => {
    const shilo = [job('s-done', 60, '10:00', 'done')];
    const neria = [job('n1', 30, '10:00')];

    const { toOther, toSource } = buildSwapDayPlan(
      shilo,
      neria,
      'shilo',
      'neria',
      DATE,
    );

    expect(toOther.movedJobs).toHaveLength(0);
    // שילה's reported call keeps 10:00–11:00, so נריה's stop lands after it.
    expect(toSource.assignments).toEqual([
      { jobId: 'n1', technicianId: 'shilo', scheduledDate: DATE, scheduledTime: '11:00' },
    ]);
  });
});

describe('resolveSwapApprovals', () => {
  const base = {
    sourceApproved: false,
    otherApproved: false,
    sourceMoved: 0,
    otherMoved: 0,
    sourceSkipped: 0,
    otherSkipped: 0,
  };

  it('hands the approval over on a plain one-way move — the shipped behaviour', () => {
    expect(
      resolveSwapApprovals({ ...base, sourceApproved: true, sourceMoved: 3 }),
    ).toEqual({ source: false, other: true });
  });

  it('keeps both days approved when both technicians had an approved route', () => {
    expect(
      resolveSwapApprovals({
        ...base,
        sourceApproved: true,
        otherApproved: true,
        sourceMoved: 2,
        otherMoved: 3,
      }),
    ).toEqual({ source: true, other: true });
  });

  it('keeps the source approved while its reported stops stay behind', () => {
    expect(
      resolveSwapApprovals({
        ...base,
        sourceApproved: true,
        sourceMoved: 2,
        sourceSkipped: 1,
      }),
    ).toEqual({ source: true, other: true });
  });

  it('does not approve a day that receives nothing', () => {
    // Every stop on the approved source day was already reported — nothing leaves it.
    expect(
      resolveSwapApprovals({ ...base, sourceApproved: true, sourceSkipped: 2 }),
    ).toEqual({ source: true, other: false });
  });

  it('revokes the approval of a technician who takes over an unapproved route', () => {
    expect(
      resolveSwapApprovals({
        ...base,
        sourceApproved: true,
        sourceMoved: 2,
        otherMoved: 3,
      }),
    ).toEqual({ source: false, other: true });
  });

  it('leaves two unapproved days unapproved', () => {
    expect(
      resolveSwapApprovals({ ...base, sourceMoved: 2, otherMoved: 3 }),
    ).toEqual({ source: false, other: false });
  });
});

describe('buildMoveDayAssignments — job sources', () => {
  it('keeps db-ongoing / db-malf ids as they are, so the caller can route them by id', () => {
    const day = [
      { ...job('x', 20, '10:00'), id: 'db-ongoing-1111' },
      { ...job('y', 60, '10:20'), id: 'db-malf-2222', type: 'malfunction' as const },
      { ...job('z', 20, '11:20'), id: 'filter-2026-8-c1' },
    ];

    const { assignments } = buildMoveDayAssignments(day, [], 't2', DATE);

    expect(assignments.map((a) => a.jobId)).toEqual([
      'db-ongoing-1111',
      'db-malf-2222',
      'filter-2026-8-c1',
    ]);
  });
});
