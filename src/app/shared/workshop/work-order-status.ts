import type { WorkOrderStatus } from '@domain/entities';

export const WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  'ingreso',
  'diagnostico',
  'en_taller',
  'espera_repuesto',
  'listo',
  'entregado',
] as const;

export function workOrderStatusLabel(status: WorkOrderStatus): string {
  const map: Record<WorkOrderStatus, string> = {
    ingreso: 'Ingreso',
    diagnostico: 'Diagnóstico',
    en_taller: 'En taller',
    espera_repuesto: 'Espera repuesto',
    listo: 'Listo',
    entregado: 'Entregado',
  };
  return map[status];
}
