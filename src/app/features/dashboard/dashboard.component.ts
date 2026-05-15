import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';
import { WorkshopRevenueChartsComponent } from './workshop-revenue-charts/workshop-revenue-charts.component';
import { WORKSHOP_REVENUE_PORT } from './workshop-revenue.port';
import { WorkshopRevenueSampleAdapter } from './workshop-revenue-sample.adapter';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [WorkshopRevenueChartsComponent],
  templateUrl: './dashboard.component.html',
  providers: [{ provide: WORKSHOP_REVENUE_PORT, useClass: WorkshopRevenueSampleAdapter }],
})
export class DashboardComponent {
  private readonly revenuePort = inject(WORKSHOP_REVENUE_PORT);
  private readonly registry = inject(WorkshopRegistryStore);

  readonly revenue = toSignal(this.revenuePort.getLastSixMonths(), { initialValue: [] });

  readonly openOrders = this.registry.openOrdersCount;
  readonly readyToday = this.registry.readyCount;
  readonly customers = this.registry.customersCount;
  readonly fleet = this.registry.bikesCount;
}
