// Tasas de depreciación DIAN (Colombia) por categoría InventIA.
// Basado en decreto tributario: equipo de computación/comunicación 20% (5 años),
// muebles y enseres, vehículos terrestres, maquinaria y equipo eléctrico 10% (10 años).
export const DEPRECIATION_RATES: Record<string, { annualRate: number; usefulLifeYears: number }> = {
  'Tecnología': { annualRate: 0.20, usefulLifeYears: 5 },
  'Mobiliario': { annualRate: 0.10, usefulLifeYears: 10 },
  'Vehículos': { annualRate: 0.10, usefulLifeYears: 10 },
  'Electrodomésticos': { annualRate: 0.10, usefulLifeYears: 10 },
};

const DEFAULT_RATE = { annualRate: 0.10, usefulLifeYears: 10 };

export interface DepreciationResult {
  annualRate: number;
  usefulLifeYears: number;
  yearsElapsed: number;
  accumulated: number;
  bookValue: number;
  isFullyDepreciated: boolean;
}

export function calculateDepreciation(
  categoryName: string | null | undefined,
  commercialValue: number,
  purchaseDate: string | null | undefined,
  referenceDate: Date = new Date()
): DepreciationResult {
  const cfg = (categoryName ? DEPRECIATION_RATES[categoryName] : undefined) ?? DEFAULT_RATE;
  if (!purchaseDate || commercialValue <= 0) {
    return {
      annualRate: cfg.annualRate,
      usefulLifeYears: cfg.usefulLifeYears,
      yearsElapsed: 0,
      accumulated: 0,
      bookValue: commercialValue,
      isFullyDepreciated: false,
    };
  }
  const purchase = new Date(purchaseDate);
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const yearsElapsed = Math.max(0, (referenceDate.getTime() - purchase.getTime()) / msPerYear);
  const cappedYears = Math.min(yearsElapsed, cfg.usefulLifeYears);
  const accumulated = commercialValue * cfg.annualRate * cappedYears;
  const bookValue = Math.max(0, commercialValue - accumulated);
  return {
    annualRate: cfg.annualRate,
    usefulLifeYears: cfg.usefulLifeYears,
    yearsElapsed,
    accumulated,
    bookValue,
    isFullyDepreciated: yearsElapsed >= cfg.usefulLifeYears,
  };
}

export function formatYears(years: number): string {
  if (years < 1) {
    const months = Math.floor(years * 12);
    return `${months} mes${months === 1 ? '' : 'es'}`;
  }
  const whole = Math.floor(years);
  const months = Math.floor((years - whole) * 12);
  if (months === 0) return `${whole} año${whole === 1 ? '' : 's'}`;
  return `${whole} año${whole === 1 ? '' : 's'} y ${months} mes${months === 1 ? '' : 'es'}`;
}
