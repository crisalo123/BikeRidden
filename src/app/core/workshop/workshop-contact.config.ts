/**
 * WhatsApp y nombre del taller que envía los avisos.
 * Cuando cambies de taller/número, actualiza aquí y vuelve a vincular la instancia en Green API.
 */
export interface WorkshopWhatsAppConfig {
  readonly phoneLocal: string;
  readonly phoneE164: string;
  readonly phoneDisplay: string;
  readonly businessName: string;
}

/** Configuración actual del taller (editable; luego puede venir de base de datos). */
export const WORKSHOP_WHATSAPP: WorkshopWhatsAppConfig = {
  phoneLocal: '3213622399',
  phoneE164: '573213622399',
  phoneDisplay: '321 362 2399',
  businessName: 'Johan Bikes — Bicicletaria',
};
