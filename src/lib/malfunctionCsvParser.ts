import { Customer, Job } from '@/types';

interface MalfunctionEntry {
  name: string;
  city: string;
  description: string;
  date: string;
  region: string;
}

const REGION_COLUMNS: { region: string; nameCol: number; addressCol: number; descCol: number; dateCol: number }[] = [
  { region: 'גוש דן', nameCol: 0, addressCol: 1, descCol: 2, dateCol: 3 },
  { region: 'צפון', nameCol: 4, addressCol: 5, descCol: 6, dateCol: 7 },
  { region: 'דרום', nameCol: 8, addressCol: 9, descCol: 10, dateCol: 11 },
  { region: 'ירושלים', nameCol: 12, addressCol: 13, descCol: 14, dateCol: 15 },
  { region: 'השומרון', nameCol: 16, addressCol: 17, descCol: 18, dateCol: 19 },
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseMalfunctionDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const cleaned = raw.replace(/\s+/g, '').replace('מיידי', '').replace(/[^\d./]/g, '');
  if (!cleaned) return new Date().toISOString().split('T')[0];

  // Try DD.MM.YY or DD/MM/YY
  let m = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  // DD/MM or DD.MM (assume 2026)
  m = cleaned.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    return `2026-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function extractPhone(text: string): string {
  const m = text.match(/0[0-9]{1,2}-?\d{7}/);
  return m ? m[0] : '';
}

export async function loadMalfunctionsFromCSV(url: string): Promise<{ customers: Customer[]; jobs: Job[] }> {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n');

  const entries: MalfunctionEntry[] = [];

  // Data starts at row index 3 (line 4)
  for (let i = 3; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    for (const rc of REGION_COLUMNS) {
      const name = (cols[rc.nameCol] || '').trim();
      const city = (cols[rc.addressCol] || '').trim();
      const desc = (cols[rc.descCol] || '').trim();
      const date = (cols[rc.dateCol] || '').trim();
      if (!name || name === '-' || name.length < 2) continue;
      // Skip clearly empty/junk rows
      if (!city && !desc) continue;
      entries.push({ name, city, description: desc, date, region: rc.region });
    }
  }

  const customers: Customer[] = [];
  const jobs: Job[] = [];

  for (const entry of entries) {
    const custId = `malf-c-${entry.name.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
    const phone = extractPhone(entry.name + ' ' + entry.description);
    const cleanName = entry.name.replace(/0[0-9]{1,2}-?\d{7}/g, '').trim();

    customers.push({
      id: custId,
      name: cleanName,
      phone,
      address: '',
      city: entry.city.replace(/[/,]$/, '').trim(),
      email: '',
      product: '',
      filterReplacementMonth: 0,
    });

    const parsedDate = parseMalfunctionDate(entry.date);
    jobs.push({
      id: `malf-j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'malfunction',
      status: 'draft',
      priority: 'high',
      customerId: custId,
      estimatedDuration: 60,
      location: '',
      city: entry.city.replace(/[/,]$/, '').trim(),
      notes: entry.description,
      createdAt: parsedDate,
    });
  }

  return { customers, jobs };
}
