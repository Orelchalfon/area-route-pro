import { describe, it, expect } from 'vitest';
import { buildCalendarServiceData } from './ongoingServiceCalendar';
import type { OngoingService } from '@/hooks/useOngoingServices';

function svc(partial: Partial<OngoingService> & { id: string }): OngoingService {
  return {
    service_date: '2999-01-15',
    task_description: 'לקוח לדוגמה -החלפת שרף',
    location: 'תל אביב',
    is_done: false,
    status_label: 'לא בוצע',
    customer_id: null,
    ...partial,
  };
}

describe('buildCalendarServiceData', () => {
  it('builds a job + customer from a future calendar-derived row', () => {
    const { customers, jobs } = buildCalendarServiceData([
      svc({ id: 'a', service_date: '2999-06-10', task_description: 'דוד וינטר -החלפת שרף', location: 'ירושלים' }),
    ]);
    expect(jobs).toHaveLength(1);
    expect(customers).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: 'ics-a', type: 'filter_replacement', city: 'ירושלים', scheduledDate: '2999-06-10' });
    expect(customers[0]).toMatchObject({ name: 'דוד וינטר', city: 'ירושלים', filterReplacementMonth: 6 });
  });

  it('skips app-request rows that already carry a customer_id', () => {
    const { jobs } = buildCalendarServiceData([svc({ id: 'b', customer_id: 'cust-1' })]);
    expect(jobs).toHaveLength(0);
  });

  it('skips past, completed (100%/completed), and installation rows', () => {
    const { jobs } = buildCalendarServiceData([
      svc({ id: 'past', service_date: '2000-01-01' }),
      svc({ id: 'done', task_description: 'החלפת שרף 100%' }),
      svc({ id: 'install', task_description: 'התקנה חדשה ללקוח' }),
    ]);
    expect(jobs).toHaveLength(0);
  });

  it('dedupes customers by name across multiple rows', () => {
    const { customers, jobs } = buildCalendarServiceData([
      svc({ id: '1', task_description: 'משה כהן -החלפת שרף', service_date: '2999-03-01' }),
      svc({ id: '2', task_description: 'משה כהן -ביקור שירות', service_date: '2999-09-01' }),
    ]);
    expect(jobs).toHaveLength(2);
    expect(customers).toHaveLength(1);
    expect(jobs[0].customerId).toBe(jobs[1].customerId);
  });
});
