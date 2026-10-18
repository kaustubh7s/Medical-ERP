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
}

export function parseCompoundBarcode(rawInput: string): ParsedBarcodePayload {
  if (!rawInput) {
    return { raw: '', tokens: [] };
  }

  const raw = rawInput.trim();

  // Split on common delimiters: pipe |, semicolon ;, comma ,, newline \n, carriage return \r
  const rawTokens = raw
    .split(/[|;,\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let batchCandidate: string | undefined;
  let expiryCandidate: string | undefined;
  let mrpCandidate: number | undefined;
  let gtinCandidate: string | undefined;

  for (const token of rawTokens) {
    const upper = token.toUpperCase();

    // 1. Explicit Expiry Patterns (e.g. EXP:2027-07-31, EXPIRY:07/2027, ED:270731)
    if (
      upper.startsWith('EXP:') ||
      upper.startsWith('EXPIRY:') ||
      upper.startsWith('ED:') ||
      upper.startsWith('EXP.') ||
      upper.startsWith('E:')
    ) {
      expiryCandidate = token.replace(/^(EXP:|EXPIRY:|ED:|EXP\.|E:)\s*/i, '').trim();
      continue;
    }

    // 2. Explicit MRP / Price Patterns (e.g. MRP:204.5, MRP:204.50, RS:195, INR:204.5)
    if (
      upper.startsWith('MRP:') ||
      upper.startsWith('MRP.') ||
      upper.startsWith('RS:') ||
      upper.startsWith('INR:') ||
      upper.startsWith('PRICE:')
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
      upper.startsWith('BATCH:') ||
      upper.startsWith('BNO:') ||
      upper.startsWith('B.NO:') ||
      upper.startsWith('BN:') ||
      upper.startsWith('LOT:')
    ) {
      batchCandidate = token.replace(/^(BATCH:|BNO:|B.NO:|BN:|LOT:)\s*/i, '').trim();
      continue;
    }

    // 4. GTIN / EAN Pattern (13 or 14 digits)
    if (/^\d{13,14}$/.test(token) || upper.startsWith('GTIN:') || upper.startsWith('010890')) {
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
    if (!batchCandidate && token.length >= 2) {
      batchCandidate = token;
    }
  }

  // 8. GS1 Application Identifier (AI) Extraction fallback: (01)...(17)...(10)...
  if (!gtinCandidate) {
    const gtinMatch = raw.match(/(?:01|\(01\))(\d{14})/);
    if (gtinMatch) gtinCandidate = gtinMatch[1];
  }
  if (!batchCandidate) {
    const ai10Match = raw.match(/(?:10|\(10\))([A-Za-z0-9-_]+)/);
    if (ai10Match) batchCandidate = ai10Match[1];
  }
  if (!expiryCandidate) {
    const ai17Match = raw.match(/(?:17|\(17\))(\d{6})/);
    if (ai17Match) {
      const yy = ai17Match[1].substring(0, 2);
      const mm = ai17Match[1].substring(2, 4);
      const dd = ai17Match[1].substring(4, 6);
      expiryCandidate = `20${yy}-${mm}-${dd}`;
    }
  }

  return {
    raw,
    tokens: rawTokens,
    batchCandidate,
    expiryCandidate,
    mrpCandidate,
    gtinCandidate,
  };
}
