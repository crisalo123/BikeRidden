import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import type { CustomerNotification, WorkOrderStatus } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { DiagnosticPdfService } from '@features/workshop/diagnostic-pdf.service';
import {
  customerNotificationChannelsLabel,
  customerNotificationKindLabel,
} from '@shared/workshop/customer-notifications';
import { workOrderStatusLabel } from '@shared/workshop/work-order-status';

@Component({
  selector: 'app-work-orders',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './work-orders.component.html',
})
export class WorkOrdersComponent {
  private readonly registry = inject(WorkshopRegistryStore);
  private readonly diagnosticPdf = inject(DiagnosticPdfService);
  private readonly route = inject(ActivatedRoute);

  readonly orders = this.registry.workOrders;
  readonly statusLabel = workOrderStatusLabel;
  readonly pendingClientApprovalCount = this.registry.pendingClientApprovalCount;
  readonly notificationsNewestFirst = computed(() =>
    [...this.registry.customerNotifications()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly kindLabel = customerNotificationKindLabel;
  readonly channelsLabel = customerNotificationChannelsLabel;

  readonly ordenCreada = toSignal(
    this.route.queryParamMap.pipe(map((m) => m.get('creada'))),
    { initialValue: null },
  );

  customerName(id: string): string {
    return this.registry.customerName(id);
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
        return 'Pendiente de respuesta del cliente';
      }
      if (n.clientDecision === 'aceptado') {
        return 'Cliente aceptó';
      }
      return 'Cliente rechazó';
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
}
