import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { WorkOrder, WorkOrderStatus } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly diagnosticPdf = inject(DiagnosticPdfService);

  readonly mechanicDraftByOrderId = signal<Record<string, string>>({});
  readonly moveErrorOrderId = signal<string | null>(null);
  readonly diagnosticSendErrorOrderId = signal<string | null>(null);
  readonly customerNotifyFlash = signal<string | null>(null);
  private customerNotifyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Por debajo del breakpoint md el arrastre HTML5 no es fiable con el dedo: usamos selector en la tarjeta. */
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

  /** Columna que recibe el arrastre (feedback visual). */
  hoverDropColumn: WorkOrderStatus | null = null;

  ordersFor(status: WorkOrderStatus): readonly WorkOrder[] {
    return this.registry.workOrders().filter((o) => o.status === status);
  }

  mechanicDraft(orderId: string): string {
    return this.mechanicDraftByOrderId()[orderId] ?? '';
  }

  setMechanicDraft(orderId: string, value: string): void {
    this.moveErrorOrderId.set(null);
    this.mechanicDraftByOrderId.update((m) => ({ ...m, [orderId]: value }));
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
    this.registry.updateWorkOrderStatus(orderId, next, name);
    this.mechanicDraftByOrderId.update((m) => {
      const { [orderId]: _removed, ...rest } = m;
      return rest;
    });
    this.moveErrorOrderId.set(null);
    this.flashCustomerNotify('Notificación enviada al cliente (WhatsApp, correo y SMS simulados).');
    return true;
  }

  private flashCustomerNotify(message: string): void {
    if (this.customerNotifyTimer) {
      clearTimeout(this.customerNotifyTimer);
    }
    this.customerNotifyFlash.set(message);
    this.customerNotifyTimer = setTimeout(() => {
      this.customerNotifyFlash.set(null);
      this.customerNotifyTimer = null;
    }, 4500);
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
    if (!this.tryChangeStatus(id, targetStatus)) {
      return;
    }
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
    this.flashCustomerNotify('Diagnóstico / plan enviado al cliente. Revisa en Órdenes para simular su respuesta.');
  }

  exportDiagnosticPdf(orderId: string): void {
    this.diagnosticPdf.exportWorkOrderDiagnostic(orderId);
  }
}
