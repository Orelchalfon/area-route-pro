import { Customer } from '@/types';

/**
 * Parse RFC 4180 CSV (handles quoted multi-line fields)
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        if (ch === '\r') i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // last field/row
  if (field || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

/**
 * Extract phone number from a field that may contain names/text
 */
function extractPhone(raw: string): string {
  if (!raw) return '';
  // Find phone-like pattern: sequences of digits, dashes, spaces, parentheses
  const match = raw.match(/[\d\-()⁩⁦+]{7,}/);
  return match ? match[0].replace(/[⁩⁦]/g, '').trim() : raw.trim();
}

/**
 * Build full name from first, middle, last
 */
function buildName(first: string, middle: string, last: string): string {
  return [first, middle, last].filter(Boolean).join(' ').trim();
}

/**
 * Parse Outlook CSV contacts into Customer[]
 */
export async function loadCustomersFromCSV(url: string): Promise<Customer[]> {
  const response = await fetch(url);
  const text = await response.text();
  const rows = parseCSV(text);
  
  if (rows.length < 2) return [];
  
  // Header row — find column indices
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const col = (name: string) => header.indexOf(name);
  
  const iFirst = col('First Name');
  const iMiddle = col('Middle Name');
  const iLast = col('Last Name');
  const iEmail = col('E-mail Address');
  const iMobile = col('Mobile Phone');
  const iCarPhone = col('Car Phone');
  const iHomePhone = col('Home Phone');
  const iBizPhone = col('Business Phone');
  const iHomeStreet = col('Home Street');
  const iHomeCity = col('Home City');
  const iBizStreet = col('Business Street');
  const iBizCity = col('Business City');
  const iCompany = col('Company');
  const iNotes = col('Notes');
  const iOtherPhone = col('Other Phone');
  
  const customers: Customer[] = [];
  const seen = new Set<string>(); // dedupe by name+phone
  
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (idx: number) => (idx >= 0 && idx < r.length ? r[idx]?.trim() : '') || '';
    
    const firstName = get(iFirst);
    const middleName = get(iMiddle);
    const lastName = get(iLast);
    let name = buildName(firstName, middleName, lastName);
    
    if (!name) continue; // skip empty rows
    
    // Get phone — prefer mobile, fallback to car, home, business, other
    const mobileRaw = get(iMobile);
    const carPhoneRaw = get(iCarPhone);
    let phone = extractPhone(mobileRaw) || extractPhone(carPhoneRaw) || extractPhone(get(iHomePhone)) || extractPhone(get(iBizPhone)) || extractPhone(get(iOtherPhone));
    
    if (!phone) continue; // skip contacts without any phone
    
    // Address — prefer home, fallback to business
    let address = get(iHomeStreet) || get(iBizStreet);
    let city = get(iHomeCity) || get(iBizCity);
    
    // Clean up multi-line addresses
    address = address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    city = city.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    const email = get(iEmail);
    const company = get(iCompany);
    const notesRaw = get(iNotes);
    
    // Build notes from extra info
    const notesParts: string[] = [];
    if (company) notesParts.push(`חברה: ${company}`);
    
    // If car phone has additional contact info, add to notes
    if (carPhoneRaw && carPhoneRaw !== phone) {
      notesParts.push(`טלפון נוסף: ${carPhoneRaw}`);
    }
    if (mobileRaw && mobileRaw !== phone && mobileRaw !== carPhoneRaw) {
      // Mobile field sometimes has names in it
      if (mobileRaw.match(/[א-ת]/)) {
        notesParts.push(`${mobileRaw}`);
      }
    }
    if (notesRaw) notesParts.push(notesRaw);
    
    // Dedupe
    const key = `${name}|${phone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    customers.push({
      id: `c${i}`,
      name,
      phone,
      address: address || '',
      city: city || '',
      email: email || '',
      product: '',
      filterReplacementMonth: new Date().getMonth() + 1,
    });
  }
  
  return customers;
}
