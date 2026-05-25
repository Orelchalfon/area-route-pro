import { Job, Customer } from '@/types';

interface RawInstallation {
  name: string;
  orderDate: string;
  city: string;
  orderDetails: string;
  notes: string;
  region: string;
}

/**
 * Parse the multi-region installation CSV.
 * Layout: 5 region groups across columns:
 *   ג׳(גוש דן) | ירושלים | דרום | צפון | שומרון
 * Each group: שם, תאריך, עיר, הזמנה, הערות/אספקה
 * (שומרון has: שם, עיר, הזמנה, אספקה — no date column)
 */
export async function loadInstallationsFromCSV(url: string): Promise<{ customers: Customer[]; jobs: Job[] }> {
  const response = await fetch(url);
  const text = await response.text();
  const rows = parseSimpleCSV(text);

  // Region definitions: [startCol, hasDate, regionLabel]
  const regions: { start: number; hasDate: boolean; label: string }[] = [
    { start: 0, hasDate: true, label: 'גוש דן' },
    { start: 5, hasDate: true, label: 'ירושלים' },
    { start: 10, hasDate: true, label: 'דרום' },
    { start: 15, hasDate: true, label: 'צפון' },
    { start: 20, hasDate: false, label: 'שומרון' }, // no date column
  ];

  const installations: RawInstallation[] = [];

  // Data rows start from row index 2 (skip header rows 0,1)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    for (const region of regions) {
      const get = (offset: number) => (r[region.start + offset] || '').trim();

      let name: string, orderDate: string, city: string, orderDetails: string, notes: string;

      if (region.hasDate) {
        name = get(0);
        orderDate = get(1);
        city = get(2);
        orderDetails = get(3);
        notes = get(4);
      } else {
        // שומרון: שם, עיר, הזמנה, אספקה (no date)
        name = get(0);
        orderDate = '';
        city = get(1);
        orderDetails = get(2);
        notes = get(3);
      }

      if (!name || name === '#REF!') continue;

      installations.push({
        name: cleanName(name),
        orderDate,
        city: cleanCity(city),
        orderDetails,
        notes,
        region: region.label,
      });
    }
  }

  // Convert to Customer[] and Job[]
  const customers: Customer[] = [];
  const jobs: Job[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < installations.length; i++) {
    const inst = installations[i];
    const custId = `inst-c${i}`;
    const key = `${inst.name}|${inst.city}`;
    
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract phone from name or notes
    const phone = extractPhone(inst.name) || extractPhone(inst.orderDetails) || extractPhone(inst.notes) || '';

    customers.push({
      id: custId,
      name: inst.name,
      phone,
      address: '', // only city available
      city: inst.city,
      email: '',
      product: inst.orderDetails,
      filterReplacementMonth: 0,
      notes: [inst.notes, inst.region ? `אזור: ${inst.region}` : ''].filter(Boolean).join(' | '),
    });

    const scheduledDate = parseDate(inst.orderDate);

    jobs.push({
      id: `inst-j${i}`,
      type: 'installation',
      status: 'draft',
      priority: 'medium',
      customerId: custId,
      estimatedDuration: 120,
      location: '',
      city: inst.city,
      notes: [inst.orderDetails, inst.notes].filter(Boolean).join(' — '),
      createdAt: scheduledDate || new Date().toISOString().split('T')[0],
    });
  }

  return { customers, jobs };
}

function parseSimpleCSV(text: string): string[][] {
  const QUOTE = '"';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(field); field = '';
        rows.push(row); row = [];
        if (ch === '\r') i++;
      } else { field += ch; }
    }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function cleanName(raw: string): string {
  // Remove phone numbers from name, keep the name part
  return raw.replace(/[-\d()]{7,}/g, '').replace(/\s+/g, ' ').trim();
}

function cleanCity(raw: string): string {
  // Remove parenthetical notes from city
  return raw.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

function extractPhone(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/0\d[\d-]{7,}/);
  return match ? match[0].replace(/[^0-9-]/g, '').trim() : '';
}

/**
 * Parse dates like "28.2.26", "11/03", "22/3", "19/3/26", "29.1.26"
 * Returns YYYY-MM-DD or empty string
 */
function parseDate(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  
  // Try DD.MM.YY or DD/MM/YY
  let match = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) < 50 ? '20' : '19') + year;
    return `${year}-${month}-${day}`;
  }

  // Try DD/MM (no year — assume 2026)
  match = cleaned.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    return `2026-${month}-${day}`;
  }

  return '';
}
