import * as XLSX from 'xlsx';
import { HttpError } from './http';

const NA = 'N/A';

export interface ParsedArDetail {
  /** Trip / shipment date from the invoice detail sheet DATE column. */
  entry_date: string;
  /** Billing date from the SI sheet (same for all lines in the workbook). */
  billing_date: string | null;
  reference: string;
  origin: string;
  destination: string;
  amount: number;
}

export interface ParsedArImport {
  invoiceNo: string;
  invoiceDate: string | null;
  clientName: string;
  clientTin: string | null;
  clientAddress: string | null;
  billingReference: string | null;
  tripType: 'IIS' | 'LUZON' | 'CROSSDOCK' | null;
  tripClassification: 'FORWARD HAUL' | 'BACK HAUL' | null;
  fleetType: '10W' | '6W' | null;
  serviceType: 'ON-CALL' | 'WETLEASE' | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  details: ParsedArDetail[];
  siVatInc: number | null;
}

interface DetailColMap {
  date: number;
  reference: number | null;
  origin: number | null;
  destination: number | null;
  amount: number;
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return dateToLocalIso(v);
  return String(v).trim();
}

/** Text fields expected on billing lines — missing/blank → N/A. */
function textOrNA(v: unknown): string {
  const s = cellStr(v);
  return s || NA;
}

function parseMoney(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function dateToLocalIso(d: Date): string {
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function excelDateToIso(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return dateToLocalIso(v);
  if (typeof v === 'number' && Number.isFinite(v)) {
    const parseDateCode = XLSX.SSF?.parse_date_code;
    if (typeof parseDateCode === 'function') {
      const parsed = parseDateCode(v);
      if (!parsed) return null;
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
    // Excel serial date fallback (days since 1899-12-30)
    const epoch = Date.UTC(1899, 11, 30) + Math.round(v) * 86400000;
    return dateToLocalIso(new Date(epoch));
  }
  const s = cellStr(v);
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  // 11/03/26 or 11/03/2026
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    const mm = String(Number(slash[1])).padStart(2, '0');
    const dd = String(Number(slash[2])).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return dateToLocalIso(d);
  return null;
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function monthDayYear(monthName: string, day: string, year: string): string | null {
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  return `${Number(year)}-${String(month).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
}

/** Parse coverage strings like "SEPTEMBER 16-30, 2026" or "AUGUST 01, 2026 TO AUGUST 15, 2026". */
export function parseCoverage(raw: string): { start: string | null; end: string | null } {
  const s = raw.trim().replace(/\s+/g, ' ');

  const cross = s.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})\s+(?:TO|–|-)\s+([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/i,
  );
  if (cross) {
    const start = monthDayYear(cross[1]!, cross[2]!, cross[3]!);
    const end = monthDayYear(cross[4]!, cross[5]!, cross[6]!);
    return { start, end };
  }

  const range = s.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})$/);
  if (range) {
    const start = monthDayYear(range[1]!, range[2]!, range[4]!);
    const end = monthDayYear(range[1]!, range[3]!, range[4]!);
    return { start, end };
  }

  const single = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (single) {
    const day = monthDayYear(single[1]!, single[2]!, single[3]!);
    return { start: day, end: day };
  }

  return { start: null, end: null };
}

function detectTripType(text: string): 'IIS' | 'LUZON' | 'CROSSDOCK' | null {
  const u = text.toUpperCase();
  if (u.includes('CROSSDOCK') || u.includes('CROSS DOCK')) return 'CROSSDOCK';
  if (u.includes('LUZON')) return 'LUZON';
  if (u.includes('IIS')) return 'IIS';
  return null;
}

function detectTripClassification(text: string): 'FORWARD HAUL' | 'BACK HAUL' | null {
  const u = text.toUpperCase();
  if (u.includes('BACK HAUL') || u.includes('BACKHAUL') || u.includes('BACKLOAD')) return 'BACK HAUL';
  if (u.includes('FORWARD HAUL') || u.includes('FORWARDHAUL')) return 'FORWARD HAUL';
  return null;
}

function detectFleet(text: string): '10W' | '6W' | null {
  const u = text.toUpperCase();
  if (/\b10W(?:H)?\b/.test(u)) return '10W';
  if (/\b6W(?:H)?\b/.test(u)) return '6W';
  return null;
}

function detectService(text: string): 'ON-CALL' | 'WETLEASE' | null {
  const u = text.toUpperCase().replace(/\s+/g, ' ');
  if (u.includes('ON-CALL') || u.includes('ON CALL') || u.includes('ONCALL')) return 'ON-CALL';
  if (u.includes('WETLEASE') || u.includes('WET LEASE')) return 'WETLEASE';
  return null;
}

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const sh = wb.Sheets[name];
  if (!sh) throw new HttpError(400, `Missing sheet "${name}"`);
  return XLSX.utils.sheet_to_json(sh, { header: 1, defval: null, raw: true }) as unknown[][];
}

function normalizeHeader(v: unknown): string {
  return cellStr(v)
    .toUpperCase()
    .replace(/[#:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMetaSheetName(name: string): boolean {
  const n = name.trim().toUpperCase();
  return (
    n === 'SI' ||
    n === 'NEW SI' ||
    n === 'OLD SI' ||
    n.startsWith('BILLING') ||
    n === 'PASSWAY'
  );
}

/** Prefer pure invoice-number sheets; skip SI / summary / old copies. */
function pickDetailSheetName(wb: XLSX.WorkBook): string {
  const candidates = wb.SheetNames.filter((n) => !isMetaSheetName(n));
  if (!candidates.length) {
    throw new HttpError(400, 'Workbook must include an invoice detail sheet');
  }

  const withHeader = (names: string[]) => {
    for (const name of names) {
      if (findDetailHeader(sheetRows(wb, name))) return name;
    }
    return names[names.length - 1] ?? null;
  };

  const pureNumeric = candidates.filter((n) => /^\d+$/.test(n.trim()));
  if (pureNumeric.length) {
    return withHeader(pureNumeric) ?? pureNumeric[pureNumeric.length - 1]!;
  }

  const digitPrefixed = candidates.filter(
    (n) => /^\d+/.test(n.trim()) && !/\bold\b/i.test(n),
  );
  if (digitPrefixed.length) {
    return withHeader(digitPrefixed) ?? digitPrefixed[digitPrefixed.length - 1]!;
  }

  for (const name of candidates) {
    if (findDetailHeader(sheetRows(wb, name))) return name;
  }

  return candidates[0]!;
}

function findHeaderIndex(labels: string[], ...aliases: string[]): number {
  for (const alias of aliases) {
    const i = labels.findIndex(
      (h) => h === alias || h.startsWith(`${alias} `) || h.endsWith(` ${alias}`),
    );
    if (i >= 0) return i;
  }
  return -1;
}

function findDetailHeader(rows: unknown[][]): { idx: number; cols: DetailColMap } | null {
  for (let i = 0; i < rows.length; i++) {
    const labels = (rows[i] ?? []).map(normalizeHeader);
    // DATE / DATE OF TRIPS / SHIPMENT DATE
    const dateIdx = findHeaderIndex(labels, 'DATE OF TRIPS', 'SHIPMENT DATE', 'DATE');
    // AMOUNT / TOTAL AMOUNT (Decoarts)
    const amountIdx = findHeaderIndex(labels, 'TOTAL AMOUNT', 'AMOUNT');
    if (dateIdx < 0 || amountIdx < 0) continue;

    // Prefer REFERENCE, then waybill / SLPS / plate / LH trip stand-ins.
    let reference = findHeaderIndex(labels, 'REFERENCE');
    if (reference < 0) reference = findHeaderIndex(labels, 'WAYBILL');
    if (reference < 0) reference = findHeaderIndex(labels, 'LH TRIP');
    if (reference < 0) reference = findHeaderIndex(labels, 'SLPS');
    if (reference < 0) reference = findHeaderIndex(labels, 'PLATE NO', 'PLATE');

    const origin = findHeaderIndex(labels, 'ORIGIN');
    const destination = findHeaderIndex(labels, 'DESTINATION');

    return {
      idx: i,
      cols: {
        date: dateIdx,
        reference: reference >= 0 ? reference : null,
        origin: origin >= 0 ? origin : null,
        destination: destination >= 0 ? destination : null,
        amount: amountIdx,
      },
    };
  }
  return null;
}

function extractDetailLines(
  rows: unknown[][],
  billingDate: string | null,
): ParsedArDetail[] {
  const header = findDetailHeader(rows);
  if (!header) return [];
  const { cols } = header;
  const details: ParsedArDetail[] = [];
  for (let i = header.idx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const date = excelDateToIso(row[cols.date]);
    const amount = parseMoney(row[cols.amount]);
    const ref = cols.reference != null ? cellStr(row[cols.reference]) : '';
    const origin = cols.origin != null ? cellStr(row[cols.origin]) : '';
    const destination = cols.destination != null ? cellStr(row[cols.destination]) : '';

    if (!date && amount == null && !ref && !origin && !destination) continue;
    const firstText = cellStr(row[cols.date]).toUpperCase();
    if (/^TOTAL\b/.test(firstText) || firstText.includes('VAT') || firstText.includes('EWT')) break;
    if (!date || amount == null || amount <= 0) continue;

    details.push({
      entry_date: date,
      billing_date: billingDate,
      reference: textOrNA(cols.reference != null ? row[cols.reference] : null),
      origin: textOrNA(cols.origin != null ? row[cols.origin] : null),
      destination: textOrNA(cols.destination != null ? row[cols.destination] : null),
      amount,
    });
  }
  return details;
}

function looksLikeClientName(s: string): boolean {
  if (!s || s.length < 3) return false;
  if (/jpa\s*freight/i.test(s)) return false;
  if (/^hauling/i.test(s)) return false;
  if (/^\d[\d\-.\s]*$/.test(s)) return false; // TIN-like
  if (/^(name|street|address|tin|phone|date|invoice|origin|destination)/i.test(s)) return false;
  if (/^(mm intra|february|march|april|may|june|july|august|september|october|november|december)/i.test(s)) {
    return false;
  }
  return /\b(INC\.?|INCORPORATED|CORPORATION|CORP\.?|CO\.?|LTD\.?)\b/i.test(s);
}

/** e.g. "1769. SHOPEE PHILIPPINES, INC. (09-22-2026) ….xlsx" */
export function clientNameFromFileName(fileName: string | null | undefined): string | null {
  if (!fileName) return null;
  const base = fileName.replace(/^.*[/\\]/, '').replace(/\.(xlsx|xls)$/i, '');
  const m = base.match(/^\d+\.\s*(.+?)\s*\(/);
  if (m?.[1]?.trim()) return m[1]!.trim();
  return null;
}

function extractClientFromInvoiceSheet(rows: unknown[][]): {
  name: string | null;
  tin: string | null;
  address: string | null;
} {
  let name: string | null = null;
  let tin: string | null = null;
  let address: string | null = null;

  for (const row of rows.slice(0, 35)) {
    for (let c = 0; c < (row?.length ?? 0); c++) {
      const v = cellStr(row![c]);
      const nextRaw = cellStr(row![c + 1]);
      const next = nextRaw.replace(/^:\s*/, '');
      if (/^name\b/i.test(v) && next && !name) name = next;
      if (/^tin\b/i.test(v) && next && !tin) tin = next;
      if (/street\s*address/i.test(v) && next && !address) address = next;
      // "Name           ", ": CLIENT" (same or next cell)
      if (/^name\b/i.test(v)) {
        const same = v.replace(/^name\s*:?\s*/i, '').trim();
        if (same && !name) name = same.replace(/^:\s*/, '');
      }
      if (v.startsWith(':') && looksLikeClientName(v.slice(1).trim()) && !name) {
        name = v.replace(/^:\s*/, '');
      }
      if (!name && looksLikeClientName(v)) name = v;
      if (!name && looksLikeClientName(next)) name = next;
    }
  }
  return { name, tin, address };
}

export function parseArExcelBuffer(
  buf: Buffer,
  opts?: { fileName?: string | null },
): ParsedArImport {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  if (!wb.SheetNames.includes('SI')) {
    throw new HttpError(400, 'Workbook must include a sheet named SI');
  }

  const invoiceSheetName = pickDetailSheetName(wb);
  const detailRows = sheetRows(wb, invoiceSheetName);
  // Prefer NEW SI over SI when both exist (NEW SI is usually the current face of the invoice).
  const metaSheets = ['SI', 'NEW SI'].filter((n) => wb.SheetNames.includes(n));

  let clientName = '';
  let clientTin: string | null = null;
  let clientAddress: string | null = null;
  let billingReference: string | null = null;
  let tripType: ParsedArImport['tripType'] = null;
  let tripClassification: ParsedArImport['tripClassification'] = null;
  let fleetType: ParsedArImport['fleetType'] = null;
  let serviceType: ParsedArImport['serviceType'] = null;
  let coverageStart: string | null = null;
  let coverageEnd: string | null = null;
  let invoiceDate: string | null = null;
  let siVatInc: number | null = null;

  for (const metaName of metaSheets) {
    const si = sheetRows(wb, metaName);
    const overwrite = metaName === 'NEW SI';

    for (let i = 0; i < si.length; i++) {
      const row = si[i] ?? [];
      const cells = (row ?? [])
        .map((c) => cellStr(c))
        .filter(Boolean);

      for (let col = 0; col < (row?.length ?? 0); col++) {
        const text = cellStr(row![col]);
        if ((!clientName || overwrite) && looksLikeClientName(text)) {
          clientName = text;
          const tinCand = cellStr((si[i + 1] ?? [])[col]);
          const addrCand = cellStr((si[i + 2] ?? [])[col]);
          if (tinCand && /\d/.test(tinCand) && /[\d-]{7,}/.test(tinCand)) {
            clientTin = tinCand;
            if (addrCand) clientAddress = addrCand;
          }
        }
      }

      const b = cellStr(row[1]);
      const c2 = cellStr(row[2]);
      const f = cellStr(row[5]);
      const g = parseMoney(row[6]);
      // Trip/meta text lives in the SI description columns (B/C), not every sheet cell.
      const metaTexts = [b, c2, ...cells.filter((t) => t === b || t === c2 || /^MSPX|^JPA-|\bSOA\b/i.test(t))];

      for (const text of metaTexts) {
        if (!text) continue;
        if (/^MSPX/i.test(text) || /^JPA-/i.test(text)) {
          billingReference = overwrite ? text : billingReference ?? text;
        }
        const soa = text.match(/\bSOA\s*0*(\d+)\b/i);
        if (soa) {
          const ref = `SOA ${soa[1]}`;
          billingReference = overwrite ? ref : billingReference ?? ref;
        }
      }

      for (const text of [b, c2]) {
        if (!text) continue;
        tripType = tripType ?? detectTripType(text);
        tripClassification = tripClassification ?? detectTripClassification(text);
        fleetType = fleetType ?? detectFleet(text);
        serviceType = serviceType ?? detectService(text);

        if (/20\d{2}/.test(text) && /[A-Za-z]+/.test(text) && /\d/.test(text)) {
          const cov = parseCoverage(text.replace(/\s*-\s*TRIP$/i, '').trim());
          if (cov.start && (!coverageStart || overwrite)) {
            coverageStart = cov.start;
            coverageEnd = cov.end;
          }
        }
      }
      // NEW SI description lines should win for coverage / service tags when present.
      if (overwrite) {
        for (const text of [b, c2]) {
          if (!text) continue;
          tripType = detectTripType(text) ?? tripType;
          tripClassification = detectTripClassification(text) ?? tripClassification;
          fleetType = detectFleet(text) ?? fleetType;
          serviceType = detectService(text) ?? serviceType;
        }
      }

      if (f) {
        const d = excelDateToIso(row[5]);
        if (d && (!invoiceDate || overwrite)) invoiceDate = d;
      }
      if (!invoiceDate || overwrite) {
        const d = excelDateToIso(row[3]);
        if (d && /20\d{2}|[A-Za-z]+/.test(cellStr(row[3]))) invoiceDate = d;
      }

      const label = cellStr(row[5]).toUpperCase();
      if (label.includes('TOTAL SALES') && label.includes('VAT') && g != null) siVatInc = g;
      const hauling =
        cellStr(row[1]).toUpperCase().includes('HAULING') ||
        cellStr(row[2]).toUpperCase().includes('HAULING');
      if (hauling && (siVatInc == null || overwrite)) {
        siVatInc =
          parseMoney(row[6]) ??
          parseMoney(row[5]) ??
          parseMoney(row[4]) ??
          g ??
          siVatInc;
      }
    }
  }

  const fromInvoice = extractClientFromInvoiceSheet(detailRows);
  if (!clientName && fromInvoice.name) clientName = fromInvoice.name;
  if (!clientTin && fromInvoice.tin) clientTin = fromInvoice.tin;
  if (!clientAddress && fromInvoice.address) clientAddress = fromInvoice.address;

  // Invoice sheet meta — Date: on the detail sheet wins over SI face date.
  let invoiceNoFromCell: string | null = null;
  for (const row of detailRows.slice(0, 25)) {
    for (let c = 0; c < (row?.length ?? 0); c++) {
      const v = cellStr(row![c]);
      if (/invoice\s*no/i.test(v)) {
        invoiceNoFromCell = cellStr(row![c + 1]) || invoiceNoFromCell;
      }
      if (/^date:?$/i.test(v)) {
        invoiceDate = excelDateToIso(row![c + 1]) ?? invoiceDate;
      }
    }
  }

  const sheetInvoiceNo = cellStr(invoiceSheetName).match(/^\d+/)?.[0] ?? cellStr(invoiceSheetName);
  const invoiceNo = (invoiceNoFromCell && /^\d+/.test(invoiceNoFromCell)
    ? invoiceNoFromCell.match(/^\d+/)?.[0]
    : null) || sheetInvoiceNo;
  if (!invoiceNo) throw new HttpError(400, 'Could not determine invoice number');

  // Only enforce match when both are plain invoice numbers
  if (
    invoiceNoFromCell &&
    /^\d+$/.test(invoiceNoFromCell.trim()) &&
    /^\d+$/.test(sheetInvoiceNo) &&
    invoiceNoFromCell.trim() !== sheetInvoiceNo
  ) {
    throw new HttpError(
      400,
      `Invoice sheet name (${sheetInvoiceNo}) does not match Invoice No. cell (${invoiceNoFromCell})`,
    );
  }
  if (!clientName) {
    clientName = clientNameFromFileName(opts?.fileName) ?? '';
  }
  if (!clientName) {
    throw new HttpError(
      400,
      'Could not determine client name from SI / invoice sheet (or file name)',
    );
  }

  // Try preferred invoice sheet first, then any other non-SI sheet with DATE+AMOUNT rows.
  let details = extractDetailLines(detailRows, invoiceDate);
  if (!details.length) {
    for (const name of wb.SheetNames) {
      if (name === invoiceSheetName || name.trim().toUpperCase() === 'SI') continue;
      if (name.trim().toUpperCase() === 'NEW SI' || name.trim().toUpperCase() === 'OLD SI') continue;
      if (/^BILLING/i.test(name.trim())) continue;
      details = extractDetailLines(sheetRows(wb, name), invoiceDate);
      if (details.length) break;
    }
  }
  if (!details.length) {
    throw new HttpError(
      400,
      'No detail lines found. Expected a sheet with DATE + AMOUNT columns (REFERENCE / ORIGIN / DESTINATION optional → N/A). Supported layouts: classic trip lines, SLPS/WAYBILL, PLATE/REFERENCE, or PLATE NO# / KILO / AMOUNT.',
    );
  }

  return {
    invoiceNo,
    invoiceDate,
    clientName,
    clientTin,
    clientAddress,
    billingReference,
    tripType,
    tripClassification,
    fleetType,
    serviceType,
    coverageStart,
    coverageEnd,
    details,
    siVatInc,
  };
}
