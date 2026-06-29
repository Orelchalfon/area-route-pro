import { Customer, Job, JobType, ServiceTrack } from '@/types';

interface ICSEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  location: string;
  uid: string;
}

function parseICSDate(dateStr: string): { date: string; time: string } {
  const clean = dateStr.replace(/;.*$/, '').replace('TZID=Israel Standard Time:', '');
  const match = clean.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return { date: '', time: '' };
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

/** Detect if this is an installation (should be excluded from service cycle) */
export function isInstallation(summary: string): boolean {
  return /הת['׳]|התק/i.test(summary) && !/ביקור/.test(summary);
}

/** Detect the service track from the summary text */
export function detectServiceTrack(summary: string): ServiceTrack {
  const s = summary;
  if (/ביקור שירות|אספקת מלח/i.test(s)) return 'service_visit';
  if (/בייפס|סיליפוס|ח\+ס/i.test(s)) return 'bypass_siliphos';
  if (/חוץ|פ\.מ\.ב/i.test(s)) return 'external_filter';
  // Default: annual filter (תלת, BB, RO, ASF, מהדר, תמד, etc.)
  return 'annual_filter';
}

/** Extract customer name from summary */
export function extractCustomerName(summary: string): string {
  const original = summary.trim();
  
  // Try splitting at dash first
  const dashIdx = original.search(/[-–—]/);
  if (dashIdx > 0) {
    return original.substring(0, dashIdx).trim().replace(/[,\-–—]+$/, '').trim();
  }
  
  // Try splitting at service keywords
  const keywords = ['תלת', 'חוץ', 'ביקור שירות', 'פ.מ.ב', 'BB', 'בייפס', 'RO', 'מרכך', 'מהדר', 'סיליפוס', 'ח+ס', 'חוזה שירות', 'ASF', 'תמד'];
  for (const kw of keywords) {
    const idx = original.indexOf(kw);
    if (idx > 0) {
      return original.substring(0, idx).trim().replace(/[,\-–—]+$/, '').trim();
    }
  }
  
  return original.replace(/[,\-–—]+$/, '').trim();
}

/** Detect the product type from summary */
export function detectProduct(summary: string): string {
  if (/RO/i.test(summary)) return 'מערכת אוסמוזה';
  if (/מיני בר/i.test(summary)) return 'מיני בר';
  if (/תלת/i.test(summary)) return 'פילטר תלת';
  if (/BB/i.test(summary)) return 'פילטר BB';
  if (/ASF/i.test(summary)) return 'פילטר ASF';
  if (/בייפס|סיליפוס/i.test(summary)) return 'בייפס/סיליפוס';
  if (/מהדר/i.test(summary)) return 'מהדר מים';
  if (/חוץ/i.test(summary)) return 'פילטר חוץ';
  return 'מערכת סינון';
}

export function parseICS(text: string, serviceOnly = false): { customers: Customer[]; jobs: Job[] } {
  const events: ICSEvent[] = [];
  const lines = text.split(/\r?\n/);
  
  let current: Partial<ICSEvent> | null = null;
  let lastKey = '';
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      lastKey = '';
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.summary && current?.dtstart) {
        events.push(current as ICSEvent);
      }
      current = null;
      continue;
    }
    if (!current) continue;
    
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lastKey === 'summary') {
        current.summary = (current.summary || '') + line.trim();
      }
      continue;
    }
    
    if (line.startsWith('SUMMARY:')) {
      current.summary = line.substring(8).trim();
      lastKey = 'summary';
    } else if (line.startsWith('DTSTART')) {
      current.dtstart = line.split(':').slice(1).join(':').trim();
      lastKey = 'dtstart';
    } else if (line.startsWith('DTEND')) {
      current.dtend = line.split(':').slice(1).join(':').trim();
      lastKey = 'dtend';
    } else if (line.startsWith('LOCATION:')) {
      current.location = line.substring(9).trim();
      lastKey = 'location';
    } else if (line.startsWith('UID:')) {
      current.uid = line.substring(4).trim();
      lastKey = 'uid';
    } else {
      lastKey = '';
    }
  }

  const customerMap = new Map<string, Customer>();
  const jobs: Job[] = [];
  let customerIdx = 0;

  // Today's date string for filtering past events
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const { date, time } = parseICSDate(ev.dtstart);
    const endParsed = parseICSDate(ev.dtend);
    if (!date) continue;

    // Skip past events — only import today and future
    if (date < todayStr) continue;

    // Skip installations when serviceOnly mode
    if (serviceOnly && isInstallation(ev.summary)) continue;

    // Skip completed tasks (marked with "בוצע", "100%", or "completed")
    if (/^בוצע\b|100%|completed/i.test(ev.summary.trim())) continue;

    const customerName = extractCustomerName(ev.summary);
    const city = (ev.location || '').trim();
    const serviceTrack = detectServiceTrack(ev.summary);
    const month = parseInt(date.split('-')[1]);
    
    // Create or find customer
    const customerKey = customerName.toLowerCase().trim();
    if (!customerMap.has(customerKey) && customerName) {
      customerIdx++;
      customerMap.set(customerKey, {
        id: `ics-c${customerIdx}`,
        name: customerName,
        phone: '',
        address: city,
        city,
        email: '',
        product: detectProduct(ev.summary),
        filterReplacementMonth: month,
        serviceTrack,
      });
    }

    const customer = customerMap.get(customerKey);
    const customerId = customer?.id || `ics-c-unknown-${i}`;

    // Calculate duration
    const startMin = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const endMin = parseInt(endParsed.time.split(':')[0]) * 60 + parseInt(endParsed.time.split(':')[1]);
    const duration = endMin - startMin > 0 ? endMin - startMin : 30;

    const jobType: JobType = serviceOnly ? 'filter_replacement' : (isInstallation(ev.summary) ? 'installation' : 'filter_replacement');

    jobs.push({
      id: `ics-j${i + 1}`,
      type: jobType,
      status: 'draft',
      priority: 'low',
      customerId,
      estimatedDuration: duration,
      location: city,
      city,
      notes: ev.summary,
      createdAt: date,
      scheduledDate: date,
      scheduledTime: time,
    });
  }

  return {
    customers: Array.from(customerMap.values()),
    jobs,
  };
}
