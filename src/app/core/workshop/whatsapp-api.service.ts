import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { WORKSHOP_WHATSAPP } from '@core/workshop/workshop-contact.config';
import { phoneDigitsForWhatsApp } from '@shared/workshop/whatsapp-notify';
import { Observable, catchError, delay, map, of } from 'rxjs';

export interface WhatsAppSendResult {
  readonly ok: boolean;
  readonly configured?: boolean;
  readonly mocked?: boolean;
  readonly provider?: string;
  readonly messageId?: string | null;
  /** Teléfono destino (solo dígitos, con indicativo). */
  readonly sentTo?: string;
  readonly error?: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppApiService {
  private readonly http = inject(HttpClient);

  send(clientPhone: string, message: string): Observable<WhatsAppSendResult> {
    const to = phoneDigitsForWhatsApp(clientPhone);
    if (!to) {
      return of({ ok: false, error: 'Teléfono del cliente no válido para WhatsApp.' });
    }

    const body = message.trim();
    if (!body) {
      return of({ ok: false, error: 'El mensaje está vacío.' });
    }

    if (environment.whatsappMockSend) {
      return this.mockSend(to, body);
    }

    return this.http
      .post<WhatsAppSendResult>(environment.whatsappApiUrl, {
        to,
        message: body,
        workshopPhone: WORKSHOP_WHATSAPP.phoneE164,
      })
      .pipe(
        map((res) => this.normalizeResult(res)),
        catchError((err: unknown) => of(this.handleHttpError(err))),
      );
  }

  private mockSend(to: string, message: string): Observable<WhatsAppSendResult> {
    if (!environment.production) {
      console.info('[WhatsApp modo prueba]', { to, preview: message.slice(0, 120) });
    }
    return of({
      ok: true,
      mocked: true,
      provider: 'mock',
      messageId: `mock-${Date.now()}`,
    }).pipe(delay(350));
  }

  private normalizeResult(res: WhatsAppSendResult): WhatsAppSendResult {
    return {
      ok: !!res.ok,
      configured: res.configured ?? true,
      provider: res.provider,
      messageId: res.messageId,
      error: res.error,
    };
  }

  private handleHttpError(err: unknown): WhatsAppSendResult {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as WhatsAppSendResult | string | null;
      const parsed: Partial<WhatsAppSendResult> =
        body && typeof body === 'object' ? body : typeof body === 'string' ? { error: body } : {};

      if (!environment.production && (err.status === 0 || err.status === 404)) {
        return {
          ok: false,
          configured: false,
          error:
            'No está corriendo la API de WhatsApp. En una terminal ejecuta: npm run start:api (y deja npm start en otra).',
        };
      }

      if (parsed.configured === false || err.status === 503) {
        return {
          ok: false,
          configured: false,
          error:
            parsed.error ??
            `Configura el WhatsApp del taller (${WORKSHOP_WHATSAPP.phoneDisplay}) en Netlify: variables GREEN_API_INSTANCE_ID y GREEN_API_API_TOKEN desde green-api.com.`,
        };
      }

      if (err.status === 404) {
        return {
          ok: false,
          configured: true,
          error:
            parsed.error ??
            'Error 404: revisa en Netlify GREEN_API_HOST=https://7107.api.greenapi.com (tu apiUrl), además de INSTANCE_ID y TOKEN.',
        };
      }

      return {
        ok: false,
        configured: true,
        error: parsed.error ?? `Error del servidor WhatsApp (${err.status}).`,
      };
    }

    if (!environment.production) {
      return {
        ok: true,
        mocked: true,
        provider: 'mock-offline',
        messageId: `offline-${Date.now()}`,
      };
    }

    return { ok: false, error: 'No se pudo conectar con el servicio de WhatsApp.' };
  }
}
