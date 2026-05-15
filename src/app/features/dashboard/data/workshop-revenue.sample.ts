import type { MonthlyWorkshopRevenue } from '@domain/entities/monthly-workshop-revenue.entity';

/** Datos ficticios — sustituir por respuesta HTTP en tu adaptador. */
export const WORKSHOP_REVENUE_LAST_6_MONTHS: readonly MonthlyWorkshopRevenue[] = [
  { monthKey: '2025-12', label: 'Dic 2025', amount: 118_400 },
  { monthKey: '2026-01', label: 'Ene 2026', amount: 132_750 },
  { monthKey: '2026-02', label: 'Feb 2026', amount: 124_200 },
  { monthKey: '2026-03', label: 'Mar 2026', amount: 147_900 },
  { monthKey: '2026-04', label: 'Abr 2026', amount: 139_500 },
  { monthKey: '2026-05', label: 'May 2026', amount: 156_800 },
];
