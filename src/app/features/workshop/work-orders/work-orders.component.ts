import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import type { CustomerNotification, WorkOrder, WorkOrderStatus } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { WORKSHOP_WHATSAPP } from '@core/workshop/workshop-contact.config';
import { WhatsAppApiService } from '@core/workshop/whatsapp-api.service';
import { DiagnosticPdfService } from '@features/workshop/diagnostic-pdf.service';
import {
  customerNotificationChannelsLabel,
  customerNotificationKindLabel,
} from '@shared/workshop/customer-notifications';
import { workOrderStatusLabel } from '@shared/workshop/work-order-status';

const ORDERS_PAGE_SIZE = 10;

@Component({
  selector: 'app-work-orders',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './work-orders.component.html',
})
export class WorkOrdersComponent {
  private readonly registry = inject(WorkshopRegistryStore);
  private readonly whatsappApi = inject(WhatsAppApiService);
  private readonly diagnosticPdf = inject(DiagnosticPdfService);
  private readonly route = inject(ActivatedRoute);

  readonly whatsappSendingNotificationId = signal<string | null>(null);

  readonly orders = this.registry.workOrders;
  readonly statusLabel = workOrderStatusLabel;
  readonly ordersPageSize = ORDERS_PAGE_SIZE;

  readonly searchQuery = signal('');

  private readonly ordersNewestFirst = computed(() =>
    [...this.registry.workOrders()].sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
  );

  readonly filteredOrders = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return this.ordersNewestFirst();
    }
    return this.ordersNewestFirst().filter((o) => this.orderMatchesSearch(o, q));
  });

  readonly visibleOrders = computed(() => this.filteredOrders().slice(0, ORDERS_PAGE_SIZE));

  readonly filteredOrdersCount = computed(() => this.filteredOrders().length);
  readonly totalOrdersCount = computed(() => this.ordersNewestFirst().length);

  readonly ordersListCaption = computed(() => {
    const visible = this.visibleOrders().length;
    const filtered = this.filteredOrdersCount();
    const total = this.totalOrdersCount();
    const q = this.searchQuery().trim();

    if (total === 0) {
      return 'Sin órdenes registradas';
    }
    if (q) {
      if (filtered === 0) {
        return `Sin resultados para «${q}»`;
      }
      if (filtered <= ORDERS_PAGE_SIZE) {
        return `${filtered} coincidencia(s) de ${total} órdenes`;
      }
      return `Mostrando ${visible} de ${filtered} coincidencias (${total} órdenes en total)`;
    }
    if (total <= ORDERS_PAGE_SIZE) {
      return `${total} orden(es) en total`;
    }
    return `Mostrando las ${visible} más recientes de ${total} órdenes`;
  });
  readonly pendingClientApprovalCount = this.registry.pendingClientApprovalCount;
  readonly notificationsNewestFirst = computed(() =>
    [...this.registry.customerNotifications()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly kindLabel = customerNotificationKindLabel;
  readonly channelsLabel = customerNotificationChannelsLabel;
  readonly workshopWhatsApp = WORKSHOP_WHATSAPP;

  readonly ordenCreada = toSignal(
    this.route.queryParamMap.pipe(map((m) => m.get('creada'))),
    { initialValue: null },
  );

  customerName(id: string): string {
    return this.registry.customerName(id);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  private orderMatchesSearch(order: WorkOrder, q: string): boolean {
    const parts = [
      order.code,
      this.registry.customerName(order.customerId),
      order.summary,
      workOrderStatusLabel(order.status),
      this.registry.bikeSummary(order.bikeId),
      order.receivedByMechanicName,
      order.receptionObservations ?? '',
    ];
    return parts.some((p) => p.toLowerCase().includes(q));
  }

  statusClass(status: WorkOrderStatus): string {
    const map: Record<WorkOrderStatus, string> = {
      ingreso: 'bg-slate-600/40 text-slate-200',
      diagnostico: 'bg-accent-500/15 text-accent-300',
      en_taller: 'bg-brand-500/20 text-brand-200',
      espera_repuesto: 'bg-amber-500/15 text-amber-200',
      listo: 'bg-emerald-500/20 text-emerald-200',
      entregado: 'bg-surface-700 text-slate-400',
    };
    return map[status];
  }

  exportDiagnosticPdf(orderId: string): void {
    this.diagnosticPdf.exportWorkOrderDiagnostic(orderId);
  }

  formatWhen(iso: string): string {
    return this.registry.formatWorkshopDateTime(iso);
  }

  decisionUiLabel(n: CustomerNotification): string {
    if (n.requiresApproval) {
      if (n.clientDecision === 'pendiente') {
        return n.whatsappSentAt ? 'WhatsApp enviado — esperando cliente' : 'Pendiente — enviar WhatsApp';
      }
      if (n.clientDecision === 'aceptado') {
        return n.approvedByWorkshopAt
          ? 'Aprobado por el cliente (registrado en taller)'
          : 'Cliente aceptó';
      }
      return 'Cliente no aprueba';
    }
    return 'Aviso informativo (sin confirmación requerida)';
  }

  formatQuoteCop(n: CustomerNotification): string {
    if (n.quoteAmountCop == null) {
      return '';
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n.quoteAmountCop);
  }

  respond(id: string, decision: 'aceptado' | 'rechazado'): void {
    this.registry.respondToCustomerNotification(id, decision);
  }

  approveInWorkshop(id: string): void {
    this.registry.markClientApprovedByWorkshop(id);
  }

  isSendingWhatsApp(notificationId: string): boolean {
    return this.whatsappSendingNotificationId() === notificationId;
  }

  sendWhatsApp(notificationId: string): void {
    const n = this.registry.getCustomerNotification(notificationId);
    if (!n) {
      return;
    }
    const phone = this.registry.customerPhone(n.customerId);
    this.whatsappSendingNotificationId.set(notificationId);
    this.whatsappApi.send(phone, n.message).subscribe({
      next: (result) => {
        this.whatsappSendingNotificationId.set(null);
        if (result.ok) {
          this.registry.markWhatsAppSent(notificationId);
        }
      },
      error: () => this.whatsappSendingNotificationId.set(null),
    });
  }
}
