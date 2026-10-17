/**
 * Pharmacy Unit Conversion & Cut-Strip / Loose Tablet Calculations Engine
 */

export function parseUnitsPerPack(
  packSize?: string,
  dosageForm?: string,
  explicitUnitsPerPack?: number
): number {
  if (explicitUnitsPerPack && explicitUnitsPerPack > 0) {
    return explicitUnitsPerPack;
  }

  const form = (dosageForm || '').toUpperCase();
  const isLiquidOrSingle = ['SYRUP', 'DROPS', 'INHALER', 'OINTMENT', 'INJECTION', 'POWDER', 'LOTION'].includes(form);

  if (isLiquidOrSingle) {
    return 1;
  }

  if (packSize) {
    const lower = packSize.toLowerCase();
    if (lower.includes('15 tab') || lower.includes('15 cap') || lower.includes('15') || lower.includes("15's")) {
      return 15;
    }
    if (lower.includes('10 tab') || lower.includes('10 cap') || lower.includes('10') || lower.includes("10's")) {
      return 10;
    }
    if (lower.includes('6 tab') || lower.includes('6 cap') || lower.includes('6')) {
      return 6;
    }
    if (lower.includes('4 tab') || lower.includes('4 cap') || lower.includes('4')) {
      return 4;
    }
    if (lower.includes('20 tab') || lower.includes('20 cap') || lower.includes('20')) {
      return 20;
    }

    const match = packSize.match(/\b(\d+)\b/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 2 && num <= 100 && !lower.includes('ml') && !lower.includes('mg') && !lower.includes('gm')) {
        return num;
      }
    }
  }

  // Standard Indian retail blister strip default
  return 10;
}

export function getPerUnitRate(stripRate: number, unitsPerPack: number): number {
  if (unitsPerPack <= 1) return stripRate;
  return Math.round((stripRate / unitsPerPack) * 100) / 100;
}

export function formatStockDisplay(
  stockInStrips: number,
  unitsPerPack: number = 10,
  dosageForm: string = 'TABLET'
): { fullStrips: number; looseUnits: number; totalUnits: number; displayText: string } {
  if (unitsPerPack <= 1) {
    return {
      fullStrips: stockInStrips,
      looseUnits: 0,
      totalUnits: stockInStrips,
      displayText: `${stockInStrips} Units`,
    };
  }

  const totalUnits = Math.round(stockInStrips * unitsPerPack);
  const fullStrips = Math.floor(totalUnits / unitsPerPack);
  const looseUnits = totalUnits % unitsPerPack;

  let displayText = '';
  if (looseUnits > 0) {
    displayText = `${fullStrips} Strips + ${looseUnits} Loose (${totalUnits} Tabs)`;
  } else {
    displayText = `${fullStrips} Strips (${totalUnits} Tabs)`;
  }

  return {
    fullStrips,
    looseUnits,
    totalUnits,
    displayText,
  };
}
