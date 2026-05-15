import { inject, Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { workOrderStatusLabel } from '@shared/workshop/work-order-status';

const DOC_MARGIN_MM = 18;
const LINE_MM = 5;
const PAGE_BOTTOM_MM = 282;
const MAX_TEXT_WIDTH_MM = 180 - DOC_MARGIN_MM * 2;

@Injectable({ providedIn: 'root' })
export class DiagnosticPdfService {
  private readonly registry = inject(WorkshopRegistryStore);

  /** Genera y descarga un PDF con datos de la OT y el texto de diagnóstico para el cliente. */
  exportWorkOrderDiagnostic(orderId: string): void {
    const order = this.registry.workOrders().find((o) => o.id === orderId);
    if (!order) {
      return;
    }

    const customer = this.registry.customerName(order.customerId);
    const bike = this.registry.bikeSummary(order.bikeId);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = DOC_MARGIN_MM;

    const nextY = (delta: number): number => {
      y += delta;
      if (y > PAGE_BOTTOM_MM) {
        doc.addPage();
        y = DOC_MARGIN_MM;
      }
      return y;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Diagnóstico técnico — orden de trabajo', DOC_MARGIN_MM, y);
    nextY(10);

    doc.setFontSize(10);
    const pairs: [string, string][] = [
      ['Orden', order.code],
      ['Fecha de apertura', order.openedAt],
      ['Recepción (quien recibe)', order.receivedByMechanicName],
      ['Estado actual', workOrderStatusLabel(order.status)],
      ['Cliente', customer],
      ['Bicicleta', bike],
      ['Motivo / recepción', order.summary],
    ];
    if (order.estimatedReadyAt) {
      pairs.push(['Entrega estimada', order.estimatedReadyAt]);
    }

    for (const [label, value] of pairs) {
      doc.setFont('helvetica', 'bold');
      const labelLines = doc.splitTextToSize(`${label}:`, MAX_TEXT_WIDTH_MM);
      doc.text(labelLines, DOC_MARGIN_MM, y);
      nextY(labelLines.length * LINE_MM + 1);

      doc.setFont('helvetica', 'normal');
      const valueLines = doc.splitTextToSize(value, MAX_TEXT_WIDTH_MM);
      for (const line of valueLines) {
        if (y > PAGE_BOTTOM_MM) {
          doc.addPage();
          y = DOC_MARGIN_MM;
        }
        doc.text(line, DOC_MARGIN_MM, y);
        nextY(LINE_MM);
      }
      nextY(2);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Descripción del diagnóstico:', DOC_MARGIN_MM, y);
    nextY(7);

    doc.setFont('helvetica', 'normal');
    const diagnostic =
      order.diagnosticNotes?.trim() ??
      'Sin texto de diagnóstico registrado. Puedes completarlo en el tablero del taller y volver a exportar.';
    const diagLines = doc.splitTextToSize(diagnostic, MAX_TEXT_WIDTH_MM);
    for (const line of diagLines) {
      if (y > PAGE_BOTTOM_MM) {
        doc.addPage();
        y = DOC_MARGIN_MM;
      }
      doc.text(line, DOC_MARGIN_MM, y);
      nextY(LINE_MM);
    }

    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const footer = `Generado el ${new Date().toLocaleString('es')}`;
    const pageH = doc.internal.pageSize.getHeight();
    let footY = pageH - 8;
    if (y + 6 > footY) {
      doc.addPage();
      footY = pageH - 8;
    }
    doc.text(footer, DOC_MARGIN_MM, footY);

    const safe = order.code.replace(/[/\\?%*:|"<>]/g, '-');
    doc.save(`diagnostico-${safe}.pdf`);
  }
}
