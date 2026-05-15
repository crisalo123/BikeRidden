import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { BikeWheelLoaderComponent } from '@shared/ui/bike-wheel-loader/bike-wheel-loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BikeWheelLoaderComponent],
  template: `
    @if (navigating()) {
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/85 backdrop-blur-md"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <app-bike-wheel-loader />
      </div>
    }
    <router-outlet />
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navigating = signal(false);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating.set(true);
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.navigating.set(false);
      }
    });
  }
}
