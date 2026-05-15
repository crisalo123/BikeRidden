import { Component, inject } from '@angular/core';
import type { Bike } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';

@Component({
  selector: 'app-bikes',
  standalone: true,
  templateUrl: './bikes.component.html',
})
export class BikesComponent {
  readonly registry = inject(WorkshopRegistryStore);
  readonly bikes = this.registry.bikes;

  ownerName(customerId: string): string {
    return this.registry.customerName(customerId);
  }

  categoryLabel(cat: Bike['category']): string {
    const map = {
      urbana: 'Urbana',
      mtb: 'MTB',
      ruta: 'Ruta',
      'e-bike': 'E-bike',
      otra: 'Otra',
    } as const;
    return map[cat];
  }
}
