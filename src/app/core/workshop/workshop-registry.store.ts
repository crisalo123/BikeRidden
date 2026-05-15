import { Injectable, computed, signal } from '@angular/core';
import type {
  Bike,
  Customer,
  CustomerNotification,
  CustomerNotificationChannel,
  CustomerNotificationKind,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderStatusChange,
} from '@domain/entities';
import type { IntakeRegistrationDto } from '@features/workshop/intake/intake-registration.dto';
import {
  SAMPLE_BIKES,
  SAMPLE_CUSTOMERS,
  SAMPLE_WORK_ORDERS,
  SAMPLE_WORK_ORDER_STATUS_HISTORY,
} from '@features/workshop/data/workshop-sample.data';
import { workOrderStatusLabel } from '@shared/workshop/work-order-status';

const CLIENT_NOTIFY_CHANNELS: readonly CustomerNotificationChannel[] = ['whatsapp', 'email', 'sms'];

function demoQuoteCop(orderId: string): number {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) {
    h = (h * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  return 120_000 + (h % 380_000);
}

function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

@Injectable({ providedIn: 'root' })
export class WorkshopRegistryStore {
  private readonly _customers = signal<Customer[]>(SAMPLE_CUSTOMERS.map((c) => ({ ...c })));
  private readonly _bikes = signal<Bike[]>(SAMPLE_BIKES.map((b) => ({ ...b })));
  private readonly _workOrders = signal<WorkOrder[]>(SAMPLE_WORK_ORDERS.map((o) => ({ ...o })));
  private nextOt = 1045;

  readonly customers = this._customers.asReadonly();
  readonly bikes = this._bikes.asReadonly();
  readonly workOrders = this._workOrders.asReadonly();

  private readonly _statusChanges = signal<WorkOrderStatusChange[]>(
    SAMPLE_WORK_ORDER_STATUS_HISTORY.map((e) => ({ ...e })),
  );
  /** Historial append-only: sirve para estadísticas y para replicar luego en backend. */
  readonly statusChanges = this._statusChanges.asReadonly();

  private readonly _customerNotifications = signal<CustomerNotification[]>([]);
  /** Avisos enviados al cliente (simulación en memoria; luego API + SMS/WhatsApp/correo). */
  readonly customerNotifications = this._customerNotifications.asReadonly();

  readonly pendingClientApprovalCount = computed(
    () =>
      this._customerNotifications().filter((n) => n.requiresApproval && n.clientDecision === 'pendiente').length,
  );

  readonly openOrdersCount = computed(
    () => this._workOrders().filter((o) => o.status !== 'entregado').length,
  );
  readonly readyCount = computed(() => this._workOrders().filter((o) => o.status === 'listo').length);
  readonly customersCount = computed(() => this._customers().length);
  readonly bikesCount = computed(() => this._bikes().length);

  customerName(id: string): string {
    return this._customers().find((c) => c.id === id)?.fullName ?? '—';
  }

  bikeSummary(id: string): string {
    const b = this._bikes().find((x) => x.id === id);
    if (!b) {
      return '—';
    }
    const serial = b.serialNumber ? ` · ${b.serialNumber}` : '';
    return `${b.brand} ${b.model}${serial}`;
  }

  bikesForCustomer(customerId: string): readonly Bike[] {
    return this._bikes().filter((b) => b.customerId === customerId);
  }

  workOrdersForCustomer(customerId: string): readonly WorkOrder[] {
    return this._workOrders().filter((o) => o.customerId === customerId);
  }

  statusChangesForOrder(orderId: string): readonly WorkOrderStatusChange[] {
    return this._statusChanges()
      .filter((e) => e.orderId === orderId)
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  formatWorkshopDateTime(isoOrDate: string): string {
    try {
      return new Date(isoOrDate).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return isoOrDate;
    }
  }

  /** Inicio del trabajo en taller (sale de ingreso) o fecha de apertura si sigue en ingreso. */
  inWorkshopSinceIso(order: WorkOrder): string {
    const leftIngreso = this.statusChangesForOrder(order.id).find((c) => c.from === 'ingreso');
    if (leftIngreso) {
      return leftIngreso.at;
    }
    return `${order.openedAt}T08:00:00.000Z`;
  }

  /** Texto legible del tiempo transcurrido desde que la OT avanzó del ingreso (o desde apertura). */
  maintenanceDurationLabel(order: WorkOrder): string {
    if (order.status === 'entregado') {
      return 'Entregada';
    }
    const startMs = new Date(this.inWorkshopSinceIso(order)).getTime();
    const diff = Date.now() - startMs;
    if (diff < 0) {
      return '—';
    }
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    const hr = h % 24;
    if (d > 0) {
      return `${d}d ${hr}h`;
    }
    if (h > 0) {
      return `${h}h`;
    }
    const m = Math.floor(diff / 60000);
    return `${Math.max(1, m)}min`;
  }

  orderTimeline(order: WorkOrder): readonly { atLabel: string; title: string; mechanic: string }[] {
    const open = `${order.openedAt}T08:00:00.000Z`;
    const rows: { at: string; atLabel: string; title: string; mechanic: string }[] = [
      {
        at: open,
        atLabel: this.formatWorkshopDateTime(open),
        title: 'Recepción (ingreso al taller)',
        mechanic: order.receivedByMechanicName,
      },
    ];
    for (const ch of this.statusChangesForOrder(order.id)) {
      rows.push({
        at: ch.at,
        atLabel: this.formatWorkshopDateTime(ch.at),
        title: `${workOrderStatusLabel(ch.from)} → ${workOrderStatusLabel(ch.to)}`,
        mechanic: ch.mechanicName,
      });
    }
    return rows
      .sort((a, b) => a.at.localeCompare(b.at))
      .map(({ atLabel, title, mechanic }) => ({ atLabel, title, mechanic }));
  }

  updateCustomer(
    id: string,
    patch: { fullName?: string; phone?: string; email?: string; notes?: string; avatarUrl?: string },
  ): void {
    this._customers.update((list) => {
      const i = list.findIndex((c) => c.id === id);
      if (i === -1) {
        return list;
      }
      const prev = list[i];
      const fullName = (patch.fullName ?? prev.fullName).trim() || prev.fullName;
      const phone = (patch.phone ?? prev.phone).trim() || prev.phone;
      const emailInput = (patch.email ?? prev.email).trim();
      const email = emailInput.length > 0 ? emailInput : '(sin correo)';

      let notes: string | undefined;
      if (patch.notes !== undefined) {
        const nt = patch.notes.trim();
        notes = nt.length > 0 ? nt : undefined;
      } else {
        notes = prev.notes;
      }

      let avatarUrl: string | undefined;
      if (patch.avatarUrl !== undefined) {
        const av = patch.avatarUrl.trim();
        avatarUrl = av.length > 0 ? av : undefined;
      } else {
        avatarUrl = prev.avatarUrl;
      }

      const next: Customer = {
        id: prev.id,
        fullName,
        phone,
        email,
        ...(notes ? { notes } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      };
      const copy = [...list];
      copy[i] = next;
      return copy;
    });
  }

  customerNotificationsForOrder(orderId: string): readonly CustomerNotification[] {
    return this._customerNotifications()
      .filter((n) => n.workOrderId === orderId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Simula la respuesta del cliente desde el enlace o app de seguimiento. */
  respondToCustomerNotification(notificationId: string, decision: 'aceptado' | 'rechazado'): void {
    this._customerNotifications.update((list) => {
      const i = list.findIndex((n) => n.id === notificationId);
      if (i === -1) {
        return list;
      }
      const prev = list[i];
      if (!prev.requiresApproval || prev.clientDecision !== 'pendiente') {
        return list;
      }
      const copy = [...list];
      copy[i] = {
        ...prev,
        clientDecision: decision,
        decidedAt: new Date().toISOString(),
      };
      return copy;
    });
  }

  /**
   * Envía al cliente el diagnóstico / plan (desde el tablero). Requiere texto en el diagnóstico.
   * En producción esto dispararía plantillas por canal.
   */
  pushCustomerDiagnosticNotification(orderId: string, mechanicName: string): boolean {
    const mechanic = mechanicName.trim();
    if (!mechanic) {
      return false;
    }
    const order = this._workOrders().find((o) => o.id === orderId);
    const notes = order?.diagnosticNotes?.trim();
    if (!order || !notes) {
      return false;
    }
    const n = this.buildDiagnosticNotification(order, mechanic, notes);
    this._customerNotifications.update((list) => [n, ...list]);
    return true;
  }

  private appendCustomerNotification(n: CustomerNotification): void {
    this._customerNotifications.update((list) => [n, ...list]);
  }

  private buildDiagnosticNotification(order: WorkOrder, mechanicName: string, notes: string): CustomerNotification {
    const title = `Diagnóstico y plan — ${order.code}`;
    const message = [
      `Hola ${this.customerName(order.customerId)},`,
      '',
      `Te compartimos el diagnóstico y el proceso previsto para tu orden ${order.code} (${this.bikeSummary(order.bikeId)}).`,
      '',
      '---',
      notes,
      '---',
      '',
      'Por favor confirma si autorizas este plan de trabajo. Si rechazas, el taller te contactará para ajustar.',
      '',
      `Registrado por: ${mechanicName}`,
    ].join('\n');

    return {
      id: crypto.randomUUID(),
      workOrderId: order.id,
      workOrderCode: order.code,
      customerId: order.customerId,
      kind: 'diagnostico_plan',
      title,
      message,
      channels: CLIENT_NOTIFY_CHANNELS,
      createdAt: new Date().toISOString(),
      mechanicName,
      requiresApproval: true,
      clientDecision: 'pendiente',
    };
  }

  private appendNotificationForStatusChange(
    prev: WorkOrder,
    nextStatus: WorkOrderStatus,
    mechanicName: string,
  ): void {
    const fromLabel = workOrderStatusLabel(prev.status);
    const toLabel = workOrderStatusLabel(nextStatus);
    const customer = this.customerName(prev.customerId);
    const bike = this.bikeSummary(prev.bikeId);

    if (nextStatus === 'espera_repuesto') {
      const quoteCop = demoQuoteCop(prev.id);
      const title = `Cotización de repuestos — ${prev.code}`;
      const message = [
        `Hola ${customer},`,
        '',
        `Tu orden ${prev.code} (${bike}) pasó a espera de repuesto.`,
        `Resumen del taller: ${prev.summary}`,
        '',
        `Importe orientativo (repuestos y montaje estimado): ${formatCop(quoteCop)}.`,
        'Este monto es referencial hasta confirmar disponibilidad con el proveedor.',
        '',
        'Indica si aceptas o rechazas esta cotización para que el taller continúe.',
        '',
        `Avance registrado por: ${mechanicName} (${fromLabel} → ${toLabel}).`,
      ].join('\n');

      const n: CustomerNotification = {
        id: crypto.randomUUID(),
        workOrderId: prev.id,
        workOrderCode: prev.code,
        customerId: prev.customerId,
        kind: 'cotizacion_repuestos',
        title,
        message,
        channels: CLIENT_NOTIFY_CHANNELS,
        createdAt: new Date().toISOString(),
        mechanicName,
        requiresApproval: true,
        clientDecision: 'pendiente',
        quoteAmountCop: quoteCop,
      };
      this.appendCustomerNotification(n);
      return;
    }

    const title = `Actualización de tu orden ${prev.code}`;
    const message = [
      `Hola ${customer},`,
      '',
      `Tu orden ${prev.code} (${bike}) cambió de estado.`,
      '',
      `Estado anterior: ${fromLabel}.`,
      `Estado actual: ${toLabel}.`,
      '',
      `Motivo / trabajo: ${prev.summary}`,
      '',
      `Registrado por: ${mechanicName}.`,
      '',
      'Si tienes dudas, responde por el mismo canal o llama al taller.',
    ].join('\n');

    const kind: CustomerNotificationKind = 'cambio_estado';
    const n: CustomerNotification = {
      id: crypto.randomUUID(),
      workOrderId: prev.id,
      workOrderCode: prev.code,
      customerId: prev.customerId,
      kind,
      title,
      message,
      channels: CLIENT_NOTIFY_CHANNELS,
      createdAt: new Date().toISOString(),
      mechanicName,
      requiresApproval: false,
      clientDecision: 'no_requerida',
    };
    this.appendCustomerNotification(n);
  }

  updateWorkOrderDiagnostic(orderId: string, diagnosticNotes: string): void {
    this._workOrders.update((list) => {
      const i = list.findIndex((o) => o.id === orderId);
      if (i === -1) {
        return list;
      }
      const copy = [...list];
      const prev = copy[i];
      const trimmed = diagnosticNotes.trim();
      copy[i] = {
        ...prev,
        ...(trimmed.length === 0 ? { diagnosticNotes: undefined } : { diagnosticNotes }),
      };
      return copy;
    });
  }

  updateWorkOrderStatus(orderId: string, status: WorkOrderStatus, mechanicName: string): void {
    const mechanic = mechanicName.trim();
    if (!mechanic) {
      return;
    }
    let prevForNotify: WorkOrder | undefined;
    this._workOrders.update((list) => {
      const i = list.findIndex((o) => o.id === orderId);
      if (i === -1) {
        return list;
      }
      const copy = [...list];
      const prev = copy[i];
      if (prev.status === status) {
        prevForNotify = undefined;
        return list;
      }
      prevForNotify = prev;
      const event: WorkOrderStatusChange = {
        orderId: prev.id,
        orderCode: prev.code,
        from: prev.status,
        to: status,
        mechanicName: mechanic,
        at: new Date().toISOString(),
      };
      this._statusChanges.update((h) => [...h, event]);
      copy[i] = { ...prev, status };
      return copy;
    });
    if (prevForNotify && prevForNotify.status !== status) {
      this.appendNotificationForStatusChange(prevForNotify, status, mechanic);
    }
  }

  /** Registra cliente, bicicleta y OT en estado ingreso. Devuelve el código OT generado. */
  registerIntake(dto: IntakeRegistrationDto): string {
    const customerId = crypto.randomUUID();
    const bikeId = crypto.randomUUID();
    const woId = crypto.randomUUID();
    const code = `OT-${this.nextOt++}`;
    const today = new Date().toISOString().slice(0, 10);

    const email = dto.customerEmail.trim();
    const customer: Customer = {
      id: customerId,
      fullName: dto.customerFullName.trim(),
      phone: dto.customerPhone.trim(),
      email: email.length > 0 ? email : '(sin correo)',
      ...(dto.customerNotes.trim() ? { notes: dto.customerNotes.trim() } : {}),
    };

    const serial = dto.bikeSerial.trim();
    const bike: Bike = {
      id: bikeId,
      customerId,
      brand: dto.bikeBrand.trim(),
      model: dto.bikeModel.trim(),
      category: dto.bikeCategory,
      ...(serial ? { serialNumber: serial } : {}),
    };

    const order: WorkOrder = {
      id: woId,
      code,
      customerId,
      bikeId,
      status: 'ingreso',
      summary: dto.processDescription.trim(),
      receivedByMechanicName: dto.receivedByMechanicName.trim(),
      openedAt: today,
    };

    this._customers.update((list) => [customer, ...list]);
    this._bikes.update((list) => [bike, ...list]);
    this._workOrders.update((list) => [order, ...list]);

    return code;
  }
}
