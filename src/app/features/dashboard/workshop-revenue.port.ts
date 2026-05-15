import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MonthlyWorkshopRevenue } from '@domain/entities/monthly-workshop-revenue.entity';

export interface WorkshopRevenuePort {
  getLastSixMonths(): Observable<readonly MonthlyWorkshopRevenue[]>;
}

export const WORKSHOP_REVENUE_PORT = new InjectionToken<WorkshopRevenuePort>('WORKSHOP_REVENUE_PORT');
