/**
 * Envío de WhatsApp desde el servidor (sin abrir WhatsApp Web).
 *
 * Proveedor recomendado — Green API (vinculas el WhatsApp del taller, ej. 3213622399):
 *   GREEN_API_INSTANCE_ID, GREEN_API_API_TOKEN
 *   Obligatorio: GREEN_API_HOST = tu apiUrl (ej. https://7107.api.greenapi.com)
 *
 * Alternativa — Meta WhatsApp Cloud API:
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */
const GRAPH_VERSION = 'v21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toWhatsAppChatId(digits) {
  return `${digits}@c.us`;
}

async function sendViaGreenApi(toRaw, message) {
  const idInstance = process.env.GREEN_API_INSTANCE_ID;
  const apiToken = process.env.GREEN_API_API_TOKEN;
  if (!idInstance || !apiToken) {
    return null;
  }

  const apiHost = process.env.GREEN_API_HOST?.replace(/\/$/, '');
  if (!apiHost) {
    return {
      ok: false,
      provider: 'green-api',
      httpStatus: 503,
      error:
        'Falta GREEN_API_HOST en Netlify. Copia tu apiUrl de Green API (ej. https://7107.api.greenapi.com) — debe coincidir con la instancia autorizada.',
    };
  }

  const url = `${apiHost}/waInstance${idInstance}/sendMessage/${apiToken}`;
  const chatId = toWhatsAppChatId(toRaw);

  const apiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      message,
    }),
  });

  let data = {};
  try {
    data = await apiRes.json();
  } catch {
    data = {};
  }

  if (!apiRes.ok || data?.idMessage == null) {
    let errMsg =
      data?.message ??
      data?.describe ??
      data?.error ??
      (typeof data === 'object' && Object.keys(data).length ? JSON.stringify(data) : 'Error Green API');

    if (apiRes.status === 404) {
      errMsg = `Instancia no encontrada en ${apiHost}. Revisa GREEN_API_HOST (debe ser tu apiUrl, ej. https://7107.api.greenapi.com), GREEN_API_INSTANCE_ID y el token.`;
    }

    return {
      ok: false,
      provider: 'green-api',
      error: errMsg,
      details: data,
      httpStatus: apiRes.status,
    };
  }

  return {
    ok: true,
    provider: 'green-api',
    messageId: data.idMessage,
    sentTo: toRaw,
    chatId,
  };
}

async function sendViaMetaCloud(toRaw, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return null;
  }

  const apiRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toRaw,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  });

  const data = await apiRes.json();

  if (!apiRes.ok) {
    const errMsg =
      data?.error?.message ??
      data?.error?.error_user_msg ??
      'Error al enviar con WhatsApp Cloud API (Meta)';
    return {
      ok: false,
      provider: 'meta',
      error: errMsg,
      details: data?.error,
      httpStatus: apiRes.status,
    };
  }

  return {
    ok: true,
    provider: 'meta',
    messageId: data?.messages?.[0]?.id ?? null,
  };
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Método no permitido' });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'JSON inválido' });
  }

  const toRaw = String(payload?.to ?? '').replace(/\D/g, '');
  const message = String(payload?.message ?? '').trim();
  const workshopPhone = String(payload?.workshopPhone ?? '').replace(/\D/g, '');

  if (!toRaw || toRaw.length < 10) {
    return jsonResponse(400, { ok: false, error: 'Teléfono del cliente inválido' });
  }
  if (!message) {
    return jsonResponse(400, { ok: false, error: 'Mensaje vacío' });
  }

  const hasGreen = !!(process.env.GREEN_API_INSTANCE_ID && process.env.GREEN_API_API_TOKEN);
  const hasMeta = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (!hasGreen && !hasMeta) {
    return jsonResponse(503, {
      ok: false,
      configured: false,
      error:
        'WhatsApp del taller sin configurar en el servidor. Usa Green API (recomendado): crea una instancia en green-api.com, escanea el QR con el WhatsApp del taller y añade GREEN_API_INSTANCE_ID y GREEN_API_API_TOKEN en Netlify.',
      workshopPhoneHint: workshopPhone || null,
    });
  }

  try {
    let result = null;

    if (hasGreen) {
      result = await sendViaGreenApi(toRaw, message);
    }
    if ((result == null || result.ok === false) && hasMeta) {
      const metaResult = await sendViaMetaCloud(toRaw, message);
      if (metaResult) {
        result = metaResult;
      }
    }

    if (result == null) {
      return jsonResponse(503, {
        ok: false,
        configured: false,
        error: 'Ningún proveedor de WhatsApp disponible.',
      });
    }

    if (!result.ok) {
      return jsonResponse(result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 502, {
        ok: false,
        configured: true,
        provider: result.provider,
        error: result.error,
        details: result.details,
      });
    }

    return jsonResponse(200, {
      ok: true,
      configured: true,
      provider: result.provider,
      messageId: result.messageId,
      sentTo: result.sentTo ?? toRaw,
    });
  } catch (err) {
    return jsonResponse(502, {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Error de red al enviar WhatsApp',
    });
  }
};
