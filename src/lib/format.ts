/**
 * Convierte un texto a Title Case (primera letra de cada palabra mayúscula,
 * el resto minúscula). Pensado para nombres de personas, cargos y áreas
 * que vienen del CSV en MAYÚSCULAS o "todo en minúscula".
 *
 * - Respeta acrónimos comunes (TI, IA, IT, QA, RH, etc.).
 * - Soporta caracteres Unicode (acentos, ñ).
 * - Considera espacios, guiones y guiones bajos como separadores de palabra.
 *
 *   "ALEJANDRO MOLINA TORO"  → "Alejandro Molina Toro"
 *   "lider de innovacion"    → "Lider De Innovacion"
 *   "GROWTH"                 → "Growth"
 *   "TI"                     → "TI"
 *   "AREA TI"                → "Area TI"
 */
const ACRONYMS = new Set([
  'TI', 'IA', 'IT', 'QA', 'RH', 'RRHH', 'TIC', 'HR',
  'PM', 'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'PR',
  'UX', 'UI', 'API', 'SQL', 'CRM', 'ERP',
  'CC', 'CE', 'NIT', 'TI', 'SAS', 'SA', 'LTDA',
]);

export function titleCase(input: string | null | undefined): string {
  if (!input) return '';
  // Normaliza espacios múltiples.
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\p{L}\p{N}]+/gu, (word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return upper.charAt(0) + word.slice(1).toLowerCase();
    });
}
