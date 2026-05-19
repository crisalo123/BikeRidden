export const environment = {
  production: true,
  /** Endpoint serverless (Netlify). */
  whatsappApiUrl: '/.netlify/functions/send-whatsapp',
  /** En local con `ng serve`, simula envío sin API (no abre WhatsApp Web). */
  whatsappMockSend: false,
};
