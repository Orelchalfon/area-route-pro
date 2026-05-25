import { Customer } from '@/types';

/**
 * Parse RFC 4180 CSV (handles quoted multi-line fields)
 */
function parseCSV(text: string): string[][] {
  // States for the parser
  const COMMA = ',';
  const QUOTE = '"';
  const NEWLINE = '\n';
  const RETURN = '\r';

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
        i++;
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
        if (ch === '\r') i++;
      } else {
        field += ch;
      }
    }
  }
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
  const match = raw.match(/[\d\-()⁩⁦+]{7,}/);
  return match ? match[0].replace(/[⁩⁦]/g, '').trim() : '';
}

/**
 * Extract ALL phone numbers from a raw field
 */
function extractAllPhones(raw: string): string[] {
  if (!raw) return [];
  const matches = raw.match(/[\d\-()⁩⁦+]{7,}/g);
  return matches ? matches.map(m => m.replace(/[⁩⁦]/g, '').trim()) : [];
}

function buildName(first: string, middle: string, last: string): string {
  return [first, middle, last].filter(Boolean).join(' ').trim();
}

function clean(val: string): string {
  return val.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse Outlook CSV contacts into Customer[] — captures ALL columns
 */
export async function loadCustomersFromCSV(url: string): Promise<Customer[]> {
  const response = await fetch(url);
  const text = await response.text();
  const rows = parseCSV(text);
  
  if (rows.length < 2) return [];
  
  // Dynamic header mapping
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const colMap = new Map<string, number>();
  header.forEach((h, idx) => { if (h) colMap.set(h, idx); });
  const col = (name: string) => colMap.get(name) ?? -1;

  // All known column indices
  const iFirst = col('First Name');
  const iMiddle = col('Middle Name');
  const iLast = col('Last Name');
  const iTitle = col('Title');
  const iSuffix = col('Suffix');
  const iNickname = col('Nickname');
  const iEmail = col('E-mail Address');
  const iEmail2 = col('E-mail 2 Address');
  const iEmail3 = col('E-mail 3 Address');
  const iHomePhone = col('Home Phone');
  const iHomePhone2 = col('Home Phone 2');
  const iBizPhone = col('Business Phone');
  const iBizPhone2 = col('Business Phone 2');
  const iMobile = col('Mobile Phone');
  const iCarPhone = col('Car Phone');
  const iOtherPhone = col('Other Phone');
  const iPrimaryPhone = col('Primary Phone');
  const iPager = col('Pager');
  const iBizFax = col('Business Fax');
  const iHomeFax = col('Home Fax');
  const iOtherFax = col('Other Fax');
  const iCompanyMainPhone = col('Company Main Phone');
  const iCallback = col('Callback');
  const iRadioPhone = col('Radio Phone');
  const iTelex = col('Telex');
  const iTTY = col('TTY/TDD Phone');
  const iIM = col('IMAddress');
  const iJobTitle = col('Job Title');
  const iDepartment = col('Department');
  const iCompany = col('Company');
  const iOffice = col('Office Location');
  const iManager = col("Manager's Name");
  const iAssistant = col("Assistant's Name");
  const iAssistantPhone = col("Assistant's Phone");
  const iCompanyYomi = col('Company Yomi');
  const iBizStreet = col('Business Street');
  const iBizCity = col('Business City');
  const iBizState = col('Business State');
  const iBizPostal = col('Business Postal Code');
  const iBizCountry = col('Business Country/Region');
  const iHomeStreet = col('Home Street');
  const iHomeCity = col('Home City');
  const iHomeState = col('Home State');
  const iHomePostal = col('Home Postal Code');
  const iHomeCountry = col('Home Country/Region');
  const iOtherStreet = col('Other Street');
  const iOtherCity = col('Other City');
  const iOtherState = col('Other State');
  const iOtherPostal = col('Other Postal Code');
  const iOtherCountry = col('Other Country/Region');
  const iWebPage = col('Personal Web Page');
  const iSpouse = col('Spouse');
  const iSchools = col('Schools');
  const iHobby = col('Hobby');
  const iLocation = col('Location');
  const iWebPage2 = col('Web Page');
  const iBirthday = col('Birthday');
  const iAnniversary = col('Anniversary');
  const iNotes = col('Notes');
  
  const customers: Customer[] = [];
  const seen = new Set<string>();
  
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (idx: number) => (idx >= 0 && idx < r.length ? r[idx]?.trim() : '') || '';
    
    const firstName = get(iFirst);
    const middleName = get(iMiddle);
    const lastName = get(iLast);
    const name = buildName(firstName, middleName, lastName);
    
    if (!name) continue;
    
    // ---- Phones: collect ALL, pick primary, rest go to notes ----
    const phoneFields = [
      { label: 'נייד', raw: get(iMobile) },
      { label: 'רכב', raw: get(iCarPhone) },
      { label: 'בית', raw: get(iHomePhone) },
      { label: 'בית 2', raw: get(iHomePhone2) },
      { label: 'עסקי', raw: get(iBizPhone) },
      { label: 'עסקי 2', raw: get(iBizPhone2) },
      { label: 'אחר', raw: get(iOtherPhone) },
      { label: 'ראשי', raw: get(iPrimaryPhone) },
      { label: 'טלפון חברה', raw: get(iCompanyMainPhone) },
      { label: 'עוזר/ת', raw: get(iAssistantPhone) },
      { label: 'callback', raw: get(iCallback) },
      { label: 'רדיו', raw: get(iRadioPhone) },
      { label: 'פקס עסקי', raw: get(iBizFax) },
      { label: 'פקס בית', raw: get(iHomeFax) },
      { label: 'פקס אחר', raw: get(iOtherFax) },
      { label: 'פייג\'ר', raw: get(iPager) },
      { label: 'טלקס', raw: get(iTelex) },
      { label: 'TTY', raw: get(iTTY) },
    ];
    
    // Primary phone: first valid extracted number
    let primaryPhone = '';
    const extraPhoneNotes: string[] = [];
    
    for (const pf of phoneFields) {
      if (!pf.raw) continue;
      const extracted = extractPhone(pf.raw);
      if (!primaryPhone && extracted) {
        primaryPhone = extracted;
        // If the raw field has extra text (names etc.), capture it
        const rawClean = clean(pf.raw);
        if (rawClean !== extracted && rawClean.length > extracted.length + 2) {
          extraPhoneNotes.push(`${pf.label}: ${rawClean}`);
        }
      } else if (pf.raw) {
        // All additional phone fields go to notes with their full raw content
        const allNums = extractAllPhones(pf.raw);
        const rawClean = clean(pf.raw);
        if (allNums.length > 0 || rawClean) {
          extraPhoneNotes.push(`${pf.label}: ${rawClean}`);
        }
      }
    }
    
    if (!primaryPhone) continue; // skip contacts without any phone
    
    // ---- Address: prefer home, then business, then other ----
    const address = clean(get(iHomeStreet)) || clean(get(iBizStreet)) || clean(get(iOtherStreet));
    const city = clean(get(iHomeCity)) || clean(get(iBizCity)) || clean(get(iOtherCity));
    
    // Capture secondary addresses in notes
    const addressNotes: string[] = [];
    const homeAddr = clean(get(iHomeStreet));
    const homeCity = clean(get(iHomeCity));
    const bizAddr = clean(get(iBizStreet));
    const bizCity = clean(get(iBizCity));
    const otherAddr = clean(get(iOtherStreet));
    const otherCity = clean(get(iOtherCity));
    
    // Add non-primary addresses
    if (bizAddr && bizAddr !== address) {
      const parts = [bizAddr, bizCity, clean(get(iBizState)), clean(get(iBizPostal)), clean(get(iBizCountry))].filter(Boolean);
      addressNotes.push(`כתובת עסקית: ${parts.join(', ')}`);
    }
    if (otherAddr && otherAddr !== address) {
      const parts = [otherAddr, otherCity, clean(get(iOtherState)), clean(get(iOtherPostal)), clean(get(iOtherCountry))].filter(Boolean);
      addressNotes.push(`כתובת נוספת: ${parts.join(', ')}`);
    }
    // If home is primary but has state/postal/country
    const homeExtra = [clean(get(iHomeState)), clean(get(iHomePostal)), clean(get(iHomeCountry))].filter(Boolean);
    if (homeExtra.length > 0 && homeAddr === address) {
      // add to city if not already there
    }
    
    // ---- Emails: collect all ----
    const email1 = get(iEmail);
    const email2 = get(iEmail2);
    const email3 = get(iEmail3);
    const primaryEmail = email1 || email2 || email3;
    const extraEmails: string[] = [];
    if (email2 && email2 !== primaryEmail) extraEmails.push(email2);
    if (email3 && email3 !== primaryEmail) extraEmails.push(email3);
    
    // ---- Build comprehensive notes ----
    const notesParts: string[] = [];
    
    const title = get(iTitle);
    const nickname = get(iNickname);
    const company = get(iCompany);
    const jobTitle = get(iJobTitle);
    const department = get(iDepartment);
    const office = get(iOffice);
    const manager = get(iManager);
    const assistant = get(iAssistant);
    const spouse = get(iSpouse);
    const location = get(iLocation);
    const im = get(iIM);
    const webPage = get(iWebPage) || get(iWebPage2);
    const birthday = get(iBirthday);
    const anniversary = get(iAnniversary);
    const notesRaw = clean(get(iNotes));
    
    if (title) notesParts.push(`תואר: ${title}`);
    if (nickname) notesParts.push(`כינוי: ${nickname}`);
    if (company) notesParts.push(`חברה: ${company}`);
    if (jobTitle) notesParts.push(`תפקיד: ${jobTitle}`);
    if (department) notesParts.push(`מחלקה: ${department}`);
    if (office) notesParts.push(`משרד: ${office}`);
    if (manager) notesParts.push(`מנהל: ${manager}`);
    if (assistant) notesParts.push(`עוזר/ת: ${assistant}`);
    if (spouse) notesParts.push(`בן/בת זוג: ${spouse}`);
    if (im) notesParts.push(`IM: ${im}`);
    if (webPage) notesParts.push(`אתר: ${webPage}`);
    if (birthday) notesParts.push(`יום הולדת: ${birthday}`);
    if (anniversary) notesParts.push(`יום נישואין: ${anniversary}`);
    if (location) notesParts.push(`מיקום: ${location}`);
    
    // Extra emails
    if (extraEmails.length > 0) notesParts.push(`מיילים נוספים: ${extraEmails.join(', ')}`);
    
    // Extra phones
    notesParts.push(...extraPhoneNotes);
    
    // Extra addresses
    notesParts.push(...addressNotes);
    
    // Original notes field
    if (notesRaw) notesParts.push(notesRaw);
    
    // Dedupe
    const key = `${name}|${primaryPhone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    
    customers.push({
      id: `c${i}`,
      name,
      phone: primaryPhone,
      address: address || '',
      city: city || '',
      email: primaryEmail || '',
      product: '',
      notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
      filterReplacementMonth: 0,
    });
  }
  
  return customers;
}
