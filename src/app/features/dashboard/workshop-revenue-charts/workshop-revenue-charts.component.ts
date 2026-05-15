import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { MonthlyWorkshopRevenue } from '@domain/entities/monthly-workshop-revenue.entity';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
  Filler,
);

@Component({
  selector: 'app-workshop-revenue-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workshop-revenue-charts.component.html',
})
export class WorkshopRevenueChartsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) data!: readonly MonthlyWorkshopRevenue[];

  @ViewChild('barCanvas') barCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineCanvas?: ElementRef<HTMLCanvasElement>;

  private barChart?: Chart;
  private lineChart?: Chart;

  private readonly money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });

  ngAfterViewInit(): void {
    this.syncCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.syncCharts();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  totalFormatted(): string {
    if (!this.data?.length) {
      return this.money.format(0);
    }
    const sum = this.data.reduce((acc, row) => acc + row.amount, 0);
    return this.money.format(sum);
  }

  private destroyCharts(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
    this.barChart = undefined;
    this.lineChart = undefined;
  }

  private syncCharts(): void {
    this.destroyCharts();
    if (!this.data?.length) {
      return;
    }
    const barEl = this.barCanvas?.nativeElement;
    const lineEl = this.lineCanvas?.nativeElement;
    if (!barEl || !lineEl) {
      return;
    }

    const labels = this.data.map((r) => r.label);
    const values = this.data.map((r) => r.amount);
    const grid = 'rgba(51, 65, 85, 0.45)';
    const ticks = '#94a3b8';

    const tooltipLabel = (raw: unknown) => this.money.format(Number(raw));

    this.barChart = new Chart(barEl, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: values,
            backgroundColor: 'rgba(34, 197, 94, 0.42)',
            borderColor: 'rgba(34, 197, 94, 0.95)',
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => tooltipLabel(ctx.raw),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: ticks },
            grid: { color: grid },
          },
          y: {
            ticks: {
              color: ticks,
              callback: (v) => this.money.format(Number(v)),
            },
            grid: { color: grid },
          },
        },
      },
    });

    this.lineChart = new Chart(lineEl, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: values,
            borderColor: 'rgb(14, 165, 233)',
            backgroundColor: 'rgba(14, 165, 233, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => tooltipLabel(ctx.raw),
            },
          },
        },
        scales: {
          x: {
            ticks: { color: ticks },
            grid: { color: grid },
          },
          y: {
            ticks: {
              color: ticks,
              callback: (v) => this.money.format(Number(v)),
            },
            grid: { color: grid },
          },
        },
      },
    });
  }
}
