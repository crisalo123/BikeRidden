/** Canales simulados hasta conectar proveedor real (Twilio, SendGrid, etc.). */
export type CustomerNotificationChannel = 'sms' | 'email' | 'whatsapp';

export type CustomerNotificationKind = 'cambio_estado' | 'cotizacion_repuestos' | 'diagnostico_plan';

export type ClientNotificationDecision = 'pendiente' | 'aceptado' | 'rechazado' | 'no_requerida';

export interface CustomerNotification {
  readonly id: string;
  readonly workOrderId: string;
  readonly workOrderCode: string;
  readonly customerId: string;
  readonly kind: CustomerNotificationKind;
  readonly title: string;
  readonly message: string;
  readonly channels: readonly CustomerNotificationChannel[];
  readonly createdAt: string;
  readonly mechanicName: string;
  /** Si el taller necesita confirmación explícita del cliente antes de seguir (p. ej. cotización). */
  readonly requiresApproval: boolean;
  readonly clientDecision: ClientNotificationDecision;
  readonly decidedAt?: string;
  /** Importe orientativo en pesos COP (sin centavos), solo para cotizaciones. */
  readonly quoteAmountCop?: number;
}
