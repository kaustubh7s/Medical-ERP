/**
 * Advanced Barcode & 2D QR Code Payload Parser
 * Handles Indian pharma manufacturer 2D barcodes, pipe/semicolon/comma-separated QR codes,
 * GS1 DataMatrix strings, and standard EAN/GTIN barcodes.
 *
 * Example scanned payload: "UG-7721|EXP:2027-07-31|MRP:204.5"
 */

export interface ParsedBarcodePayload {
  raw: string;
  tokens: string[];
  batchCandidate?: string;
  expiryCandidate?: string;
  mrpCandidate?: number;
  gtinCandidate?: string;
  serialCandidate?: string;
}

export function parseCompoundBarcode(rawInput: string): ParsedBarcodePayload {
  if (!rawInput) {
    return { raw: '', tokens: [] };
  }

  const raw = rawInput.trim();

  // 0. Detect GS1 Digital Link URLs or Manufacturer Verification QR URLs
  // Example: https://verify.emcure.com/validate/01 /08902319015572/10/E16GQ25017 /21/GOLABWISC57F
  // or https://id.gs1.org/01/08902319015572/10/E16GQ25017/21/GOLABWISC57F
  const isUrlLike =
    /^https?:\/\//i.test(raw) ||
    /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(raw) ||
    raw.includes('verify.') ||
    raw.includes('validate/');

  if (isUrlLike) {
    const cleanUrl = raw.replace(/\s+/g, '');
    let gtinCandidate: string | undefined;
    let batchCandidate: string | undefined;
    let serialCandidate: string | undefined;
    let expiryCandidate: string | undefined;

    // AI 01 (GTIN-14 / GTIN-13)
    const gtinMatch = cleanUrl.match(/(?:[/?&]01[/=]|\(01\))(\d{13,14})/i);
    if (gtinMatch) {
      gtinCandidate = gtinMatch[1];
    }

    // AI 10 (Batch Number)
    const batchMatch = cleanUrl.match(/(?:[/?&]10[/=]|\(10\))([A-Za-z0-9_-]+)/i);
    if (batchMatch) {
      batchCandidate = batchMatch[1];
    }

    // AI 21 (Serial Number)
    const serialMatch = cleanUrl.match(/(?:[/?&]21[/=]|\(21\))([A-Za-z0-9_-]+)/i);
    if (serialMatch) {
      serialCandidate = serialMatch[1];
    }

    // AI 17 (Expiry Date: YYMMDD)
    const expMatch = cleanUrl.match(/(?:[/?&]17[/=]|\(17\))(\d{6})/i);
    if (expMatch) {
      const yy = expMatch[1].substring(0, 2);
      const mm = expMatch[1].substring(2, 4);
      const dd = expMatch[1].substring(4, 6);
      expiryCandidate = `20${yy}-${mm}-${dd}`;
    }

    const tokens: string[] = [raw];
    if (cleanUrl !== raw) {
      tokens.push(cleanUrl);
    }
    if (gtinCandidate) {
      tokens.push(gtinCandidate);
      // Also add EAN-13 (strip leading zero if 14 digits starting with 0)
      if (gtinCandidate.length === 14 && gtinCandidate.startsWith('0')) {
        tokens.push(gtinCandidate.substring(1));
      }
    }
    if (batchCandidate) {
      tokens.push(batchCandidate);
    }
    if (serialCandidate) {
      tokens.push(serialCandidate);
    }

    return {
      raw,
      tokens,
      gtinCandidate,
      batchCandidate,
      serialCandidate,
      expiryCandidate,
    };
  }

  // 1. Raw GS1-128 / DataMatrix Stream (e.g. "01089023190155721729043010E16GQ25017" or "(01)08902319015572(17)290430(10)E16GQ25017")
  const rawClean = raw.replace(/\s+/g, '');
  let gs1Gtin: string | undefined;
  let gs1Batch: string | undefined;
  let gs1Expiry: string | undefined;
  let gs1Serial: string | undefined;

  // 1a. Parenthesized GS1: (01)...(17)...(10)...(21)...
  if (raw.includes('(01)')) {
    const m01 = raw.match(/\(01\)(\d{13,14})/);
    if (m01) gs1Gtin = m01[1];
    const m17 = raw.match(/\(17\)(\d{6})/);
    if (m17) {
      const yy = m17[1].substring(0, 2);
      const mm = m17[1].substring(2, 4);
      const dd = m17[1].substring(4, 6);
      gs1Expiry = `20${yy}-${mm}-${dd}`;
    }
    const m10 = raw.match(/\(10\)([A-Za-z0-9_-]+)/);
    if (m10) gs1Batch = m10[1];
    const m21 = raw.match(/\(21\)([A-Za-z0-9_-]+)/);
    if (m21) gs1Serial = m21[1];
  } else if (/^01\d{14}/.test(rawClean)) {
    // 1b. Raw concatenated GS1-128 stream (fixed-length AI 01 = 14 digits, fixed-length AI 17/11 = 6 digits)
    gs1Gtin = rawClean.substring(2, 16);
    let rest = rawClean.substring(16);

    while (rest.length > 0) {
      if (rest.startsWith('\x1d')) rest = rest.substring(1);

      if (rest.startsWith('17') && rest.length >= 8 && /^\d{6}/.test(rest.substring(2, 8))) {
        // AI 17: Expiration Date YYMMDD (fixed 6 digits)
        const yy = rest.substring(2, 4);
        const mm = rest.substring(4, 6);
        const dd = rest.substring(6, 8);
        gs1Expiry = `20${yy}-${mm}-${dd}`;
        rest = rest.substring(8);
      } else if (rest.startsWith('11') && rest.length >= 8 && /^\d{6}/.test(rest.substring(2, 8))) {
        // AI 11: Production Date YYMMDD (fixed 6 digits)
        rest = rest.substring(8);
      } else if (rest.startsWith('10')) {
        // AI 10: Batch / Lot Number (variable up to 20 chars, ending before next AI 17/21 or separator or end)
        const m = rest.substring(2).match(/^([A-Za-z0-9_-]+?)(?:(?=17\d{6})|(?=21[A-Za-z0-9])|\x1d|$)/);
        if (m) {
          gs1Batch = m[1];
          rest = rest.substring(2 + m[1].length);
        } else {
          gs1Batch = rest.substring(2);
          rest = '';
        }
      } else if (rest.startsWith('21')) {
        // AI 21: Serial Number (variable up to 20 chars)
        const m = rest.substring(2).match(/^([A-Za-z0-9_-]+?)(?:(?=17\d{6})|(?=10[A-Za-z0-9])|\x1d|$)/);
        if (m) {
          gs1Serial = m[1];
          rest = rest.substring(2 + m[1].length);
        } else {
          gs1Serial = rest.substring(2);
          rest = '';
        }
      } else {
        break;
      }
    }
  }

  // 2. Direct Blister Pack / Carton Label Text (e.g. "B.No. E16GQ25017 MFD. MAY 2025 EXP. APR. 2029 M.R.P. Rs. 198.03")
  let blisterBatch: string | undefined;
  let blisterExpiry: string | undefined;
  let blisterMrp: number | undefined;

  const bMatch = raw.match(/(?:B\.?\s*NO\.?|BATCH|LOT|BNO\.?)\s*[:.]?\s*([A-Za-z0-9_-]+)/i);
  if (bMatch) blisterBatch = bMatch[1].trim();

  const expMatch = raw.match(/(?:EXP\.?|EXPIRY|ED)\s*[:.]?\s*([A-Za-z]{3}\.?\s*\d{4}|\d{2}[-/.]\d{2,4}|\d{4}[-/.]\d{2})/i);
  if (expMatch) blisterExpiry = expMatch[1].trim();

  const mrpMatch = raw.match(/(?:M\.?R\.?P\.?|PRICE|RS\.?)\s*(?:RS\.?|₹)?\s*[:.]?\s*(\d+(?:\.\d{1,2})?)/i);
  if (mrpMatch) {
    const parsedNum = parseFloat(mrpMatch[1]);
    if (!isNaN(parsedNum)) blisterMrp = parsedNum;
  }

  // Split on common delimiters: pipe |, semicolon ;, comma ,, newline \n, carriage return \r
  const rawTokens = raw
    .split(/[|;,\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let batchCandidate: string | undefined = gs1Batch || blisterBatch;
  let expiryCandidate: string | undefined = gs1Expiry || blisterExpiry;
  let mrpCandidate: number | undefined = blisterMrp;
  let gtinCandidate: string | undefined = gs1Gtin;
  let serialCandidate: string | undefined = gs1Serial;

  for (const token of rawTokens) {
    const upper = token.toUpperCase();

    // 1. Explicit Expiry Patterns (e.g. EXP:2027-07-31, EXPIRY:07/2027, ED:270731)
    if (
      !expiryCandidate &&
      (upper.startsWith('EXP:') ||
        upper.startsWith('EXPIRY:') ||
        upper.startsWith('ED:') ||
        upper.startsWith('EXP.') ||
        upper.startsWith('E:'))
    ) {
      expiryCandidate = token.replace(/^(EXP:|EXPIRY:|ED:|EXP\.|E:)\s*/i, '').trim();
      continue;
    }

    // 2. Explicit MRP / Price Patterns (e.g. MRP:204.5, MRP:204.50, RS:195, INR:204.5)
    if (
      mrpCandidate === undefined &&
      (upper.startsWith('MRP:') ||
        upper.startsWith('MRP.') ||
        upper.startsWith('RS:') ||
        upper.startsWith('INR:') ||
        upper.startsWith('PRICE:'))
    ) {
      const numStr = token.replace(/^(MRP:|MRP\.|RS:|INR:|PRICE:|\s*RS\.?|\s*₹)\s*/i, '').replace(/[^\d.]/g, '');
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed)) {
        mrpCandidate = parsed;
      }
      continue;
    }

    // 3. Explicit Batch Patterns (e.g. BATCH:UG-7721, BNO:UG-7721, B.NO:UG-7721, BN:UG-7721, LOT:UG-7721)
    if (
      !batchCandidate &&
      (upper.startsWith('BATCH:') ||
        upper.startsWith('BNO:') ||
        upper.startsWith('B.NO:') ||
        upper.startsWith('BN:') ||
        upper.startsWith('LOT:'))
    ) {
      batchCandidate = token.replace(/^(BATCH:|BNO:|B.NO:|BN:|LOT:)\s*/i, '').trim();
      continue;
    }

    // 4. GTIN / EAN Pattern (13 or 14 digits)
    if (!gtinCandidate && (/^\d{13,14}$/.test(token) || upper.startsWith('GTIN:'))) {
      gtinCandidate = token.replace(/^GTIN:\s*/i, '').trim();
      continue;
    }

    // 5. Implicit Date Pattern (e.g. 2027-07-31, 31-07-2027, 07/2027, 07/27)
    if (
      !expiryCandidate &&
      (/^\d{4}[-/.]\d{2}[-/.]\d{2}$/.test(token) ||
        /^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(token) ||
        /^\d{2}[-/.]\d{2,4}$/.test(token))
    ) {
      expiryCandidate = token;
      continue;
    }

    // 6. Implicit Numeric Price (e.g. 204.5 or 204.50)
    if (mrpCandidate === undefined && /^\d+(\.\d{1,2})?$/.test(token) && !/^\d{5,}$/.test(token)) {
      const parsed = parseFloat(token);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        mrpCandidate = parsed;
        continue;
      }
    }

    // 7. Otherwise, candidate batch code (alphanumeric, dashes, etc.)
    if (!batchCandidate && token.length >= 2 && !token.includes(' ') && /^[A-Za-z0-9_-]+$/.test(token)) {
      batchCandidate = token;
    }
  }

  // Tokens collection
  const finalTokens = new Set<string>(rawTokens);
  finalTokens.add(raw);
  if (rawClean !== raw) finalTokens.add(rawClean);

  if (gtinCandidate) {
    finalTokens.add(gtinCandidate);
    // If GTIN is 14 digits starting with 0, also make sure tokens contain 13-digit EAN
    if (gtinCandidate.length === 14 && gtinCandidate.startsWith('0')) {
      finalTokens.add(gtinCandidate.substring(1));
    }
  }
  if (batchCandidate) {
    finalTokens.add(batchCandidate);
  }
  if (serialCandidate) {
    finalTokens.add(serialCandidate);
  }

  return {
    raw,
    tokens: Array.from(finalTokens),
    batchCandidate,
    expiryCandidate,
    mrpCandidate,
    gtinCandidate,
    serialCandidate,
  };
}
