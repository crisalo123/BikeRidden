import { Component, HostListener, computed, inject, signal } from '@angular/core';
import type { AgendaExtraEvent, Customer, PotentialLead, WorkOrder } from '@domain/entities';
import { WorkshopAgendaStore } from '@core/agenda/workshop-agenda.store';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { workOrderStatusLabel } from '@shared/workshop/work-order-status';

export interface AgendaDayChip {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly tone: 'brand' | 'amber' | 'emerald' | 'violet' | 'slate';
}

export type AgendaModalPayload =
  | { kind: 'lead'; lead: PotentialLead }
  | { kind: 'extra'; event: AgendaExtraEvent }
  | { kind: 'order'; order: WorkOrder; customer: Customer | null };

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-workshop-agenda',
  standalone: true,
  templateUrl: './workshop-agenda.component.html',
  styleUrl: './workshop-agenda.component.scss',
})
export class WorkshopAgendaComponent {
  readonly registry = inject(WorkshopRegistryStore);
  private readonly agenda = inject(WorkshopAgendaStore);

  readonly modalPayload = signal<AgendaModalPayload | null>(null);

  readonly viewWeekStart = signal(startOfWeekMonday(new Date()));

  readonly weekDays = computed(() => {
    const start = this.viewWeekStart();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  readonly statusLabel = workOrderStatusLabel;

  readonly leads = this.agenda.potentialLeads;
  readonly extras = this.agenda.extraEvents;

  weekRangeTitle(): string {
    const days = this.weekDays();
    const a = days[0];
    const b = days[6];
    const o = { month: 'long' as const, day: 'numeric' as const };
    return `${a.toLocaleDateString('es', o)} — ${b.toLocaleDateString('es', { ...o, year: 'numeric' })}`;
  }

  prevWeek(): void {
    this.viewWeekStart.update((d) => addDays(d, -7));
  }

  nextWeek(): void {
    this.viewWeekStart.update((d) => addDays(d, 7));
  }

  thisWeek(): void {
    this.viewWeekStart.set(startOfWeekMonday(new Date()));
  }

  dayShort(d: Date): string {
    return d.toLocaleDateString('es', { weekday: 'short' });
  }

  dayNum(d: Date): string {
    return String(d.getDate());
  }

  chipsForDay(day: Date): AgendaDayChip[] {
    const ymd = ymdLocal(day);
    const chips: AgendaDayChip[] = [];

    for (const lead of this.leads()) {
      if (lead.followUpDate === ymd) {
        chips.push({
          id: `lead-${lead.id}`,
          title: `Lead: ${lead.fullName}`,
          subtitle: lead.phone,
          tone: 'violet',
        });
      }
    }

    for (const ex of this.extras()) {
      const s = new Date(ex.startAt);
      if (sameLocalDay(s, day)) {
        chips.push({
          id: `ex-${ex.id}`,
          title: ex.title,
          subtitle: this.registry.formatWorkshopDateTime(ex.startAt),
          tone: ex.kind === 'cita' ? 'brand' : 'amber',
        });
      }
    }

    for (const o of this.registry.workOrders()) {
      if (o.estimatedReadyAt === ymd) {
        chips.push({
          id: `due-${o.id}`,
          title: `Entrega prevista ${o.code}`,
          subtitle: this.registry.customerName(o.customerId),
          tone: 'emerald',
        });
      }
    }

    return chips.sort((a, b) => a.title.localeCompare(b.title));
  }

  activeOrders(): readonly WorkOrder[] {
    return this.registry
      .workOrders()
      .filter((o) => o.status !== 'entregado')
      .slice()
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  }

  upcomingMaintenance(): { order: WorkOrder; when: string }[] {
    const today = ymdLocal(new Date());
    return this.registry
      .workOrders()
      .filter((o) => o.estimatedReadyAt && o.estimatedReadyAt >= today && o.status !== 'entregado')
      .map((o) => ({ order: o, when: o.estimatedReadyAt! }))
      .sort((a, b) => a.when.localeCompare(b.when))
      .slice(0, 12);
  }

  chipToneClass(tone: AgendaDayChip['tone']): string {
    const base =
      'agenda-chip w-full cursor-pointer text-left rounded-lg border px-2 py-1.5 text-[11px] leading-snug ';
    const tones: Record<AgendaDayChip['tone'], string> = {
      brand: 'border-brand-500/35 bg-brand-950/40 ',
      amber: 'border-amber-500/35 bg-amber-950/30 ',
      emerald: 'border-emerald-500/35 bg-emerald-950/30 ',
      violet: 'border-violet-500/35 bg-violet-950/35 ',
      slate: 'border-surface-600 bg-surface-950/60 ',
    };
    return base + tones[tone];
  }

  openChip(chip: AgendaDayChip): void {
    if (chip.id.startsWith('lead-')) {
      const id = chip.id.slice('lead-'.length);
      const lead = this.leads().find((l) => l.id === id);
      if (lead) {
        this.modalPayload.set({ kind: 'lead', lead });
      }
      return;
    }
    if (chip.id.startsWith('ex-')) {
      const id = chip.id.slice('ex-'.length);
      const event = this.extras().find((e) => e.id === id);
      if (event) {
        this.modalPayload.set({ kind: 'extra', event });
      }
      return;
    }
    if (chip.id.startsWith('due-')) {
      const id = chip.id.slice('due-'.length);
      const order = this.registry.workOrders().find((o) => o.id === id);
      if (order) {
        const customer = this.registry.customers().find((c) => c.id === order.customerId) ?? null;
        this.modalPayload.set({ kind: 'order', order, customer });
      }
    }
  }

  closeModal(): void {
    this.modalPayload.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscapeClose(): void {
    if (this.modalPayload()) {
      this.closeModal();
    }
  }

  formatLongYmd(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) {
      return ymd;
    }
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  deliverySummary(order: WorkOrder): string {
    if (order.estimatedReadyAt) {
      return this.formatLongYmd(order.estimatedReadyAt);
    }
    return 'Aún sin fecha de entrega estimada. Coordina con el taller.';
  }

  /** Texto corto de lo hecho / hallazgos para el modal. */
  bikeWorkBlurb(order: WorkOrder): string {
    const diag = order.diagnosticNotes?.trim();
    if (diag) {
      return diag.length > 220 ? `${diag.slice(0, 220)}…` : diag;
    }
    return order.summary;
  }

  extraKindLabel(kind: AgendaExtraEvent['kind']): string {
    const labels: Record<AgendaExtraEvent['kind'], string> = {
      cita: 'Cita',
      recordatorio: 'Recordatorio',
      bloqueo: 'Bloqueo de agenda',
    };
    return labels[kind];
  }
}
