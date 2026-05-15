import type { WorkOrderStatus } from './work-order.entity';

/** Evento local para métricas / futura API (auditoría de cambios de estado). */
export interface WorkOrderStatusChange {
  readonly orderId: string;
  readonly orderCode: string;
  readonly from: WorkOrderStatus;
  readonly to: WorkOrderStatus;
  /** Mecánico responsable de llevar la orden al estado `to`. */
  readonly mechanicName: string;
  readonly at: string;
}
