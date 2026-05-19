export const environment = {
  production: false,
  whatsappApiUrl: '/.netlify/functions/send-whatsapp',
  /** false = envío real vía `npm run start:api` + proxy (lee .env / Green API). */
  whatsappMockSend: false,
};
