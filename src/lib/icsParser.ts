import { Customer, Job, JobType } from '@/types';

interface ICSEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  location: string;
  uid: string;
}

function parseICSDate(dateStr: string): { date: string; time: string } {
  // Format: 20250223T080000
  const clean = dateStr.replace(/;.*$/, '').replace('TZID=Israel Standard Time:', '');
  const match = clean.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return { date: '', time: '' };
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

function parseServiceType(summary: string): { jobType: JobType; notes: string; customerName: string } {
  const lower = summary.toLowerCase();
  const original = summary.trim();
  
  // Extract customer name (before the dash or service description)
  let customerName = original;
  const dashIdx = original.search(/[-–—]/);
  if (dashIdx > 0) {
    customerName = original.substring(0, dashIdx).trim();
  } else {
    // Try to split at service keywords
    const keywords = ['תלת', 'חוץ', 'ביקור שירות', 'פ.מ.ב', 'BB', 'בייפס', 'RO', 'מרכך', 'מהדר', 'סיליפוס', 'ח+ס', 'חוזה שירות'];
    for (const kw of keywords) {
      const idx = original.indexOf(kw);
      if (idx > 0) {
        customerName = original.substring(0, idx).trim();
        break;
      }
    }
  }
  // Clean up customer name
  customerName = customerName.replace(/[,\-–—]+$/, '').trim();

  // Determine job type
  if (/התק|הת'|הקנ/i.test(original) && !/ביקור/.test(original)) {
    return { jobType: 'installation', notes: original, customerName };
  }

  // Everything else is filter_replacement (service)
  return { jobType: 'filter_replacement', notes: original, customerName };
}

export function parseICS(text: string): { customers: Customer[]; jobs: Job[] } {
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
    
    // Handle folded lines (start with space)
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

  // Build unique customers from events
  const customerMap = new Map<string, Customer>();
  const jobs: Job[] = [];
  let customerIdx = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const { date, time } = parseICSDate(ev.dtstart);
    const endParsed = parseICSDate(ev.dtend);
    if (!date) continue;

    const { jobType, notes, customerName } = parseServiceType(ev.summary);
    const city = (ev.location || '').trim();
    
    // Create or find customer
    const customerKey = customerName.toLowerCase().trim();
    if (!customerMap.has(customerKey) && customerName) {
      customerIdx++;
      const month = parseInt(date.split('-')[1]);
      customerMap.set(customerKey, {
        id: `ics-c${customerIdx}`,
        name: customerName,
        phone: '',
        address: city,
        city,
        email: '',
        product: notes.includes('RO') ? 'מערכת אוסמוזה' : notes.includes('מיני בר') ? 'מיני בר' : notes.includes('תלת') ? 'פילטר תלת' : 'מערכת סינון',
        filterReplacementMonth: month,
      });
    }

    const customer = customerMap.get(customerKey);
    const customerId = customer?.id || `ics-c-unknown-${i}`;

    // Calculate duration in minutes
    const startMin = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const endMin = parseInt(endParsed.time.split(':')[0]) * 60 + parseInt(endParsed.time.split(':')[1]);
    const duration = endMin - startMin > 0 ? endMin - startMin : 30;

    jobs.push({
      id: `ics-j${i + 1}`,
      type: jobType,
      status: 'draft',
      priority: jobType === 'installation' ? 'medium' : 'low',
      customerId,
      estimatedDuration: duration,
      location: city,
      city,
      notes,
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
