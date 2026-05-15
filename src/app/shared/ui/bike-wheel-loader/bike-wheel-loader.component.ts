import { Component } from '@angular/core';

@Component({
  selector: 'app-bike-wheel-loader',
  standalone: true,
  template: `
    <div class="flex flex-col items-center gap-6">
      <div class="relative h-28 w-28" aria-hidden="true">
        <svg class="wheel" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22c55e" />
              <stop offset="100%" stop-color="#0ea5e9" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" class="tire" />
          <circle cx="50" cy="50" r="38" class="rim-outer" />
          <g class="spokes">
            @for (deg of spokeAngles; track deg) {
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="12"
                class="spoke"
                [attr.transform]="'rotate(' + deg + ' 50 50)'"
              />
            }
          </g>
          <circle cx="50" cy="50" r="9" class="hub" />
        </svg>
      </div>
      <div class="text-center">
        <p class="font-display text-lg font-semibold tracking-wide text-slate-100">BikeRidden</p>
        <p class="mt-1 text-sm text-slate-400">Preparando tu taller…</p>
      </div>
    </div>
  `,
  styleUrl: './bike-wheel-loader.component.scss',
})
export class BikeWheelLoaderComponent {
  readonly spokeAngles = [0, 45, 90, 135, 180, 225, 270, 315];
}
