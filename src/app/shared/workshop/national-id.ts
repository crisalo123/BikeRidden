/** Normaliza cédula/documento para comparar y buscar (solo dígitos y letras). */
export function normalizeNationalId(value: string): string {
  return value.replace(/\s+/g, '').replace(/[.\-]/g, '').toUpperCase();
}
