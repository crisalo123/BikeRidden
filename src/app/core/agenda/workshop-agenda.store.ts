import { Injectable, signal } from '@angular/core';
import type { AgendaExtraEvent, PotentialLead } from '@domain/entities';

const SAMPLE_LEADS: readonly PotentialLead[] = [
  {
    id: 'lead-1',
    fullName: 'Patricia Gómez',
    phone: '+52 55 2200 8899',
    email: 'patricia.g@example.com',
    notes: 'Interesada en conversión a 1x12 y revisión de frenos.',
    followUpDate: '2026-05-16',
  },
  {
    id: 'lead-2',
    fullName: 'Club Ciclista Norte',
    phone: '+52 55 3300 1100',
    notes: 'Cotización servicio para 8 bicis — enviar propuesta.',
    followUpDate: '2026-05-18',
  },
  {
    id: 'lead-3',
    fullName: 'Roberto Casas',
    phone: '+52 55 4411 0022',
    followUpDate: '2026-05-22',
  },
];

const SAMPLE_EXTRA: readonly AgendaExtraEvent[] = [
  {
    id: 'ex-1',
    kind: 'cita',
    title: 'Proveedor repuestos — visita',
    startAt: '2026-05-15T16:00:00.000Z',
    endAt: '2026-05-15T17:00:00.000Z',
    notes: 'Llegada estimada 16:15',
  },
  {
    id: 'ex-2',
    kind: 'recordatorio',
    title: 'Inventario fin de mes',
    startAt: '2026-05-20T09:00:00.000Z',
    endAt: '2026-05-20T10:30:00.000Z',
  },
];

@Injectable({ providedIn: 'root' })
export class WorkshopAgendaStore {
  private readonly _leads = signal<PotentialLead[]>(SAMPLE_LEADS.map((l) => ({ ...l })));
  private readonly _extras = signal<AgendaExtraEvent[]>(SAMPLE_EXTRA.map((e) => ({ ...e })));

  readonly potentialLeads = this._leads.asReadonly();
  readonly extraEvents = this._extras.asReadonly();

  addLead(lead: Omit<PotentialLead, 'id'>): void {
    const item: PotentialLead = { ...lead, id: crypto.randomUUID() };
    this._leads.update((list) => [item, ...list]);
  }

  addExtraEvent(event: Omit<AgendaExtraEvent, 'id'>): void {
    const item: AgendaExtraEvent = { ...event, id: crypto.randomUUID() };
    this._extras.update((list) => [...list, item].sort((a, b) => a.startAt.localeCompare(b.startAt)));
  }
}
