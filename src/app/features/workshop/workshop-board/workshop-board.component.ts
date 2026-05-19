import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CustomerNotification, WorkOrder, WorkOrderStatus } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { WORKSHOP_WHATSAPP } from '@core/workshop/workshop-contact.config';
import { WhatsAppApiService } from '@core/workshop/whatsapp-api.service';
import { DiagnosticPdfService } from '@features/workshop/diagnostic-pdf.service';
import { WORK_ORDER_STATUSES, workOrderStatusLabel } from '@shared/workshop/work-order-status';

const ORDER_DRAG_MIME = 'application/x-bikeridden-order-id';
const DRAG_DROP_MEDIA = '(min-width: 768px)';

@Component({
  selector: 'app-workshop-board',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './workshop-board.component.html',
  styleUrl: './workshop-board.component.scss',
})
export class WorkshopBoardComponent {
  private readonly registry = inject(WorkshopRegistryStore);
  private readonly whatsappApi = inject(WhatsAppApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly diagnosticPdf = inject(DiagnosticPdfService);

  readonly workshopWhatsApp = WORKSHOP_WHATSAPP;

  readonly mechanicDraftByOrderId = signal<Record<string, string>>({});
  readonly moveErrorOrderId = signal<string | null>(null);
  readonly diagnosticSendErrorOrderId = signal<string | null>(null);
  readonly customerNotifyFlash = signal<string | null>(null);
  readonly whatsappSendingNotificationId = signal<string | null>(null);
  private customerNotifyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly dragDropEnabled = signal(
    typeof globalThis !== 'undefined' &&
      'matchMedia' in globalThis &&
      globalThis.matchMedia(DRAG_DROP_MEDIA).matches,
  );

  readonly allStatuses = WORK_ORDER_STATUSES;

  constructor() {
    if (typeof globalThis === 'undefined' || !('matchMedia' in globalThis)) {
      return;
    }
    const mq = globalThis.matchMedia(DRAG_DROP_MEDIA);
    const sync = () => this.dragDropEnabled.set(mq.matches);
    mq.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => {
      mq.removeEventListener('change', sync);
      if (this.customerNotifyTimer) {
        clearTimeout(this.customerNotifyTimer);
      }
    });
  }

  readonly columns: { status: WorkOrderStatus; title: string }[] = [
    { status: 'ingreso', title: 'Ingreso / recepción' },
    { status: 'diagnostico', title: 'Diagnóstico' },
    { status: 'en_taller', title: 'En taller' },
    { status: 'espera_repuesto', title: 'Repuestos' },
    { status: 'listo', title: 'Listo' },
    { status: 'entregado', title: 'Entregado' },
  ];

  readonly statusLabel = workOrderStatusLabel;

  hoverDropColumn: WorkOrderStatus | null = null;

  ordersFor(status: WorkOrderStatus): readonly WorkOrder[] {
    return this.registry.workOrders().filter((o) => o.status === status);
  }

  customerName(customerId: string): string {
    return this.registry.customerName(customerId);
  }

  bikeSummary(bikeId: string): string {
    return this.registry.bikeSummary(bikeId);
  }

  pendingClientNotify(orderId: string): CustomerNotification | undefined {
    return this.registry.pendingClientNotificationForOrder(orderId);
  }

  isSendingWhatsApp(notificationId: string): boolean {
    return this.whatsappSendingNotificationId() === notificationId;
  }

  mechanicDraft(orderId: string): string {
    return this.mechanicDraftByOrderId()[orderId] ?? '';
  }

  setMechanicDraft(orderId: string, value: string): void {
    this.moveErrorOrderId.set(null);
    this.mechanicDraftByOrderId.update((m) => ({ ...m, [orderId]: value }));
  }

  onDeliveryDateChange(orderId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.registry.updateWorkOrderEstimatedReadyAt(orderId, value);
  }

  private tryChangeStatus(orderId: string, next: WorkOrderStatus): boolean {
    const order = this.registry.workOrders().find((o) => o.id === orderId);
    if (!order || order.status === next) {
      return true;
    }
    const name = this.mechanicDraft(orderId).trim();
    if (!name) {
      this.moveErrorOrderId.set(orderId);
      return false;
    }
    const notificationId = this.registry.updateWorkOrderStatus(orderId, next, name);
    this.mechanicDraftByOrderId.update((m) => {
      const { [orderId]: _removed, ...rest } = m;
      return rest;
    });
    this.moveErrorOrderId.set(null);
    if (notificationId) {
      this.sendNotificationWhatsApp(notificationId);
    } else {
      this.flashCustomerNotify('Estado actualizado.');
    }
    return true;
  }

  sendNotificationWhatsApp(notificationId: string): void {
    const notification = this.registry.getCustomerNotification(notificationId);
    if (!notification) {
      return;
    }
    const phone = this.registry.customerPhone(notification.customerId);
    this.whatsappSendingNotificationId.set(notificationId);

    this.whatsappApi.send(phone, notification.message).subscribe({
      next: (result) => {
        this.whatsappSendingNotificationId.set(null);
        if (result.ok) {
          this.registry.markWhatsAppSent(notificationId);
          if (result.mocked) {
            this.flashCustomerNotify(
              `Modo prueba: mensaje listo para ${this.workshopWhatsApp.phoneDisplay}. En Netlify con Green API se envía solo al cliente.`,
            );
          } else {
            const dest = result.sentTo ? this.formatPhoneDigits(result.sentTo) : 'el cliente';
            this.flashCustomerNotify(
              `WhatsApp enviado al número ${dest} (desde el taller ${this.workshopWhatsApp.phoneDisplay}). El mensaje llega al WhatsApp del cliente, no al del taller. Marca «OK — Aprobado por el cliente» cuando confirme.`,
            );
          }
          return;
        }
        this.flashCustomerNotify(
          result.error ??
            `No se pudo enviar WhatsApp. Configura Green API en Netlify con el número ${this.workshopWhatsApp.phoneDisplay}.`,
        );
      },
      error: () => {
        this.whatsappSendingNotificationId.set(null);
        this.flashCustomerNotify('Error de red al enviar WhatsApp.');
      },
    });
  }

  approveByClient(notificationId: string): void {
    this.registry.markClientApprovedByWorkshop(notificationId);
    this.flashCustomerNotify('Aprobación del cliente registrada en el taller.');
  }

  private flashCustomerNotify(message: string): void {
    if (this.customerNotifyTimer) {
      clearTimeout(this.customerNotifyTimer);
    }
    this.customerNotifyFlash.set(message);
    this.customerNotifyTimer = setTimeout(() => {
      this.customerNotifyFlash.set(null);
      this.customerNotifyTimer = null;
    }, 7000);
  }

  onDragStart(event: DragEvent, order: WorkOrder): void {
    event.dataTransfer?.setData(ORDER_DRAG_MIME, order.id);
    event.dataTransfer?.setData('text/plain', order.code);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.hoverDropColumn = null;
  }

  onColumnDragOver(event: DragEvent, status: WorkOrderStatus): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.hoverDropColumn = status;
  }

  onColumnDragLeave(event: DragEvent, status: WorkOrderStatus): void {
    const el = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;
    if (related && el.contains(related)) {
      return;
    }
    if (this.hoverDropColumn === status) {
      this.hoverDropColumn = null;
    }
  }

  onDrop(event: DragEvent, targetStatus: WorkOrderStatus): void {
    event.preventDefault();
    this.hoverDropColumn = null;
    const id = event.dataTransfer?.getData(ORDER_DRAG_MIME);
    if (!id) {
      return;
    }
    const order = this.registry.workOrders().find((o) => o.id === id);
    if (!order || order.status === targetStatus) {
      return;
    }
    this.tryChangeStatus(id, targetStatus);
  }

  onMobileStatusChange(orderId: string, event: Event): void {
    const el = event.target as HTMLSelectElement;
    const next = el.value as WorkOrderStatus;
    const order = this.registry.workOrders().find((o) => o.id === orderId);
    if (!order) {
      return;
    }
    if (order.status === next) {
      return;
    }
    if (!this.tryChangeStatus(orderId, next)) {
      el.value = order.status;
    }
  }

  onDiagnosticNotesChange(orderId: string, value: string): void {
    this.registry.updateWorkOrderDiagnostic(orderId, value);
    this.diagnosticSendErrorOrderId.update((id) => (id === orderId ? null : id));
  }

  sendDiagnosticToCustomer(orderId: string): void {
    const name = this.mechanicDraft(orderId).trim();
    if (!name) {
      this.moveErrorOrderId.set(orderId);
      return;
    }
    const ok = this.registry.pushCustomerDiagnosticNotification(orderId, name);
    if (!ok) {
      this.diagnosticSendErrorOrderId.set(orderId);
      this.flashCustomerNotify('Escribe primero el diagnóstico en el cuadro de texto antes de enviarlo al cliente.');
      return;
    }
    this.diagnosticSendErrorOrderId.set(null);
    const pending = this.registry.pendingClientNotificationForOrder(orderId);
    if (pending) {
      this.sendNotificationWhatsApp(pending.id);
    }
  }

  exportDiagnosticPdf(orderId: string): void {
    this.diagnosticPdf.exportWorkOrderDiagnostic(orderId);
  }

  private formatPhoneDigits(digits: string): string {
    if (digits.startsWith('57') && digits.length === 12) {
      return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    return `+${digits}`;
  }
}
