import type { CustomerNotificationKind } from '@domain/entities';

export function customerNotificationKindLabel(kind: CustomerNotificationKind): string {
  const labels: Record<CustomerNotificationKind, string> = {
    cambio_estado: 'Cambio de estado',
    cotizacion_repuestos: 'Cotización de repuestos',
    diagnostico_plan: 'Diagnóstico / plan de trabajo',
  };
  return labels[kind];
}

export function customerNotificationChannelsLabel(
  channels: readonly ('sms' | 'email' | 'whatsapp')[],
): string {
  const map = { sms: 'SMS', email: 'Correo', whatsapp: 'WhatsApp' };
  return channels.map((c) => map[c]).join(' · ');
}
