/** Cliente potencial / seguimiento comercial (no es aún cliente registrado). */
export interface PotentialLead {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email?: string;
  readonly notes?: string;
  /** Día sugerido para llamar o enviar propuesta (YYYY-MM-DD). */
  readonly followUpDate: string;
}

export type AgendaExtraEventKind = 'cita' | 'recordatorio' | 'bloqueo';

/** Evento manual en la agenda (además de OT y leads). */
export interface AgendaExtraEvent {
  readonly id: string;
  readonly kind: AgendaExtraEventKind;
  readonly title: string;
  /** ISO inicio */
  readonly startAt: string;
  /** ISO fin */
  readonly endAt: string;
  readonly notes?: string;
}
