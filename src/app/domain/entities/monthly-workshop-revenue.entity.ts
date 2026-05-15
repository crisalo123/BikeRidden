/** Ingresos consolidados del taller por mes (moneda local; ajusta según tu API). */
export interface MonthlyWorkshopRevenue {
  readonly monthKey: string;
  /** Etiqueta corta para ejes (ej. "Dic 2025"). */
  readonly label: string;
  /** Monto en la unidad que use tu backend (aquí pesos MXN como número). */
  readonly amount: number;
}
