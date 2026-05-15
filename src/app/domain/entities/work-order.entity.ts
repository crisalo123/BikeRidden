export type WorkOrderStatus =
  | 'ingreso'
  | 'diagnostico'
  | 'en_taller'
  | 'espera_repuesto'
  | 'listo'
  | 'entregado';

export interface WorkOrder {
  readonly id: string;
  readonly code: string;
  readonly customerId: string;
  readonly bikeId: string;
  readonly status: WorkOrderStatus;
  readonly summary: string;
  /** Mecánico o recepcionista que recibió la bicicleta en el alta (recepción). */
  readonly receivedByMechanicName: string;
  /** Texto del diagnóstico técnico para entregar al cliente (exportable a PDF). */
  readonly diagnosticNotes?: string;
  readonly openedAt: string;
  readonly estimatedReadyAt?: string;
}
