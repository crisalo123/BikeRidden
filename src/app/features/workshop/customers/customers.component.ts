import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Bike, Customer, WorkOrder } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';

@Component({  selector: 'app-customers',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customers.component.html',
})
export class CustomersComponent {
  readonly registry = inject(WorkshopRegistryStore);
  readonly customers = this.registry.customers;

  readonly expandedId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);

  editFullName = '';
  editPhone = '';
  editEmail = '';
  editNotes = '';

  toggleExpand(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  startEdit(c: Customer, ev: Event): void {
    ev.stopPropagation();
    this.editingId.set(c.id);
    this.editFullName = c.fullName;
    this.editPhone = c.phone;
    this.editEmail = c.email === '(sin correo)' ? '' : c.email;
    this.editNotes = c.notes ?? '';
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: string): void {
    this.registry.updateCustomer(id, {
      fullName: this.editFullName,
      phone: this.editPhone,
      email: this.editEmail,
      notes: this.editNotes,
    });
    this.editingId.set(null);
  }

  bikes(custId: string): readonly Bike[] {
    return this.registry.bikesForCustomer(custId);
  }

  ordersForBike(custId: string, bikeId: string): readonly WorkOrder[] {
    return this.registry.workOrdersForCustomer(custId).filter((o) => o.bikeId === bikeId);
  }
}
