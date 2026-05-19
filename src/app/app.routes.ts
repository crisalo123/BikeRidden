import { Routes } from '@angular/router';
import { adminGuard } from '@core/auth/admin.guard';
import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@core/layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      {
        path: 'panel',
        loadComponent: () =>
          import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('@features/agenda/workshop-agenda.component').then((m) => m.WorkshopAgendaComponent),
      },
      {
        path: 'recepcion',
        loadComponent: () =>
          import('@features/workshop/intake/new-intake.component').then((m) => m.NewIntakeComponent),
      },
      {
        path: 'ordenes',
        loadComponent: () =>
          import('@features/workshop/work-orders/work-orders.component').then(
            (m) => m.WorkOrdersComponent,
          ),
      },
      {
        path: 'taller',
        loadComponent: () =>
          import('@features/workshop/workshop-board/workshop-board.component').then(
            (m) => m.WorkshopBoardComponent,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('@features/workshop/customers/customers.component').then(
            (m) => m.CustomersComponent,
          ),
      },
      {
        path: 'bicicletas',
        loadComponent: () =>
          import('@features/workshop/bikes/bikes.component').then((m) => m.BikesComponent),
      },
      {
        path: 'mecanicos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/workshop/mechanics/mechanics.component').then((m) => m.MechanicsComponent),
      },
      { path: 'segunda-mano', redirectTo: 'bodega', pathMatch: 'full' },
      {
        path: 'bodega',
        loadComponent: () =>
          import('@features/second-hand/used-marketplace.component').then((m) => m.UsedMarketplaceComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
