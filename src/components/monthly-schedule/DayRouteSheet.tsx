import { RouteSheetRow } from "./routeSheet";

// The paper "דף משימות" the manager hands the technician for the day — the sheet that
// used to be copied out by hand. It is filled in on paper (payments, per-stop notes,
// ticks), so it is print-only: hidden on screen, revealed by the @media print block in
// index.css, which also hides the rest of the app.
//
// Colors are hard-coded black on white rather than theme tokens: the sheet is never
// looked at on screen, and a dark-mode token would print white text on nothing. Borders
// are real 1px lines, never background fills, so they survive printing with "background
// graphics" turned off.

// A4 portrait at 10mm margins leaves 190mm of usable width.
const COLUMN_WIDTHS = ["10mm", "36mm", "42mm", "30mm", "44mm", "28mm"];
const HEADERS = ["", "שם", "כתובת", "טלפון", "משימה", "תשלום"];

export function DayRouteSheet({
  dateText,
  areas,
  technicianName,
  rows,
}: {
  dateText: string;
  areas: string[];
  technicianName: string;
  rows: RouteSheetRow[];
}) {
  return (
    <div dir='rtl' className='bg-white text-black text-[11pt] leading-tight'>
      {/* Three columns so the title stays centred regardless of what flanks it. */}
      <div className='grid grid-cols-3 items-baseline mb-2'>
        <span className='text-start text-[9pt]'>בס״ד</span>
        <span className='text-center font-bold text-[14pt]'>דף משימות</span>
        <span className='text-end'>תאריך: {dateText}</span>
      </div>

      {/* Areas of the day, plus room to write in. Kept at full height even with no
          areas selected — days start with none (getDayAreas) and the box is half
          handwriting on the paper form anyway. */}
      <div className='border border-black min-h-[20mm] p-2 mb-3'>
        <span className='font-semibold'>{areas.join(", ")}</span>
      </div>

      <table className='w-full border-collapse border border-black'>
        <colgroup>
          {COLUMN_WIDTHS.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr className='break-inside-avoid'>
            {HEADERS.map((header, i) => (
              <th
                key={i}
                className='border border-black px-1.5 py-1 font-semibold text-center'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.order} className='break-inside-avoid'>
              {/* Row height, not text size, is what makes the sheet writable — the
                  technician fills the cells by hand. 20mm still fits ~12 stops on one
                  A4 page; longer days spill to a second, with rows kept whole. */}
              <td className='border border-black text-center align-middle font-semibold h-[20mm]'>
                {row.order}
              </td>
              <td className='border border-black px-1.5 align-top'>{row.name}</td>
              <td className='border border-black px-1.5 align-top'>
                {row.address}
              </td>
              <td className='border border-black px-1.5 align-top text-center'>
                <span dir='ltr'>{row.phone}</span>
              </td>
              <td className='border border-black px-1.5 align-top'>{row.task}</td>
              {/* תשלום — deliberately blank: the technician writes the amount in the
                  field. Not modelled or persisted. */}
              <td className='border border-black' />
            </tr>
          ))}
        </tbody>
      </table>

      <div className='flex items-end justify-between mt-6 text-[10pt]'>
        <span>טכנאי: {technicianName}</span>
        <span>חתימה: ________________________</span>
      </div>
    </div>
  );
}
