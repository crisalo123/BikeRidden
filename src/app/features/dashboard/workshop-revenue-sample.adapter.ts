import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { MonthlyWorkshopRevenue } from '@domain/entities/monthly-workshop-revenue.entity';
import { WORKSHOP_REVENUE_LAST_6_MONTHS } from '@features/dashboard/data/workshop-revenue.sample';
import type { WorkshopRevenuePort } from './workshop-revenue.port';

/**
 * Implementación temporal: datos estáticos con una latencia mínima simulada.
 * Después: un adaptador HTTP que implemente `WorkshopRevenuePort` y mapee tu JSON.
 */
@Injectable()
export class WorkshopRevenueSampleAdapter implements WorkshopRevenuePort {
  getLastSixMonths(): Observable<readonly MonthlyWorkshopRevenue[]> {
    return of(WORKSHOP_REVENUE_LAST_6_MONTHS).pipe(delay(120));
  }
}
