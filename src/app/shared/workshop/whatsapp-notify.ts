import { WORKSHOP_WHATSAPP } from '@core/workshop/workshop-contact.config';

/** Convierte teléfono del cliente a dígitos E.164 para wa.me (prioriza Colombia +57). */
export function phoneDigitsForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('57') && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  if (digits.startsWith('52') && digits.length >= 12) {
    return digits;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }
  return null;
}

export function buildWhatsAppSendUrl(clientPhone: string, message: string): string | null {
  const to = phoneDigitsForWhatsApp(clientPhone);
  if (!to) {
    return null;
  }
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export function workshopWhatsAppContactLine(): string {
  return `${WORKSHOP_WHATSAPP.businessName} — WhatsApp ${WORKSHOP_WHATSAPP.phoneDisplay}`;
}

/** Pie de mensaje: aprobar o contactar al taller si no está de acuerdo. */
export function workshopApprovalFooter(): string {
  return [
    '',
    '✅ Si estás de acuerdo, responde *APROBADO* o confirma en recepción.',
    `❌ Si *NO* deseas aprobar este avance, comunícate con ${WORKSHOP_WHATSAPP.businessName} al WhatsApp ${WORKSHOP_WHATSAPP.phoneDisplay}.`,
  ].join('\n');
}

/** Enlace para que el cliente escriba al taller (mismo número del negocio). */
export function workshopWhatsAppInboxUrl(prefill?: string): string {
  const base = `https://wa.me/${WORKSHOP_WHATSAPP.phoneE164}`;
  if (!prefill?.trim()) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(prefill.trim())}`;
}
