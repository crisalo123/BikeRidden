import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: 'panel' | 'agenda' | 'recepcion' | 'orden' | 'taller' | 'cliente' | 'bici' | 'mecanico' | 'bodega';
}

const BASE_NAV: readonly NavItem[] = [
  { label: 'Panel', path: '/app/panel', icon: 'panel' },
  { label: 'Agenda', path: '/app/agenda', icon: 'agenda' },
  { label: 'Recepción', path: '/app/recepcion', icon: 'recepcion' },
  { label: 'Órdenes', path: '/app/ordenes', icon: 'orden' },
  { label: 'Taller en vivo', path: '/app/taller', icon: 'taller' },
  { label: 'Clientes', path: '/app/clientes', icon: 'cliente' },
  { label: 'Bicicletas', path: '/app/bicicletas', icon: 'bici' },
  { label: 'Artículos en bodega', path: '/app/bodega', icon: 'bodega' },
];

const ADMIN_NAV_ITEM: NavItem = { label: 'Mecánicos', path: '/app/mecanicos', icon: 'mecanico' };

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {
  private readonly workshop = inject(WorkshopRegistryStore);

  readonly mobileMenuOpen = signal(false);

  readonly pendingClientApprovals = this.workshop.pendingClientApprovalCount;

  constructor(readonly auth: AuthService) {}

  readonly nav = computed(() => {
    if (!this.auth.isAdmin()) {
      return [...BASE_NAV];
    }
    const items = [...BASE_NAV];
    const bodegaIdx = items.findIndex((i) => i.path === '/app/bodega');
    items.splice(bodegaIdx, 0, ADMIN_NAV_ITEM);
    return items;
  });

  navIcon(item: NavItem): string {
    const glyphs: Record<NavItem['icon'], string> = {
      panel: '▣',
      agenda: '▦',
      recepcion: '＋',
      orden: '◎',
      taller: '⚙',
      cliente: '👤',
      bici: '⬡',
      mecanico: '🔧',
      bodega: '▤',
    };
    return glyphs[item.icon];
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.closeMobileMenu();
    this.auth.logout();
  }
}
