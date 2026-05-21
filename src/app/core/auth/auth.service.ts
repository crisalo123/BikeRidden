import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, delay, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { User, UserRole } from '@domain/entities';
import { MechanicsStore } from '@core/workshop/mechanics.store';
import type { LoginCredentials } from './login-credentials';

const STORAGE_KEY = 'br_session_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly mechanics = inject(MechanicsStore);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(this.readStoredUser());

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  /** Ruta de inicio según rol (mecánicos no usan el panel). */
  readonly appHomePath = computed(() => (this.isAdmin() ? '/app/panel' : '/app/taller'));

  login(credentials: LoginCredentials): Observable<User> {
    const user = this.validateCredentials(credentials);
    if (!user) {
      return throwError(() => new Error('Credenciales inválidas'));
    }
    return of(user).pipe(
      delay(650),
      tap((u) => {
        this.userSignal.set(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      }),
    );
  }

  logout(): void {
    this.userSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
    void this.router.navigate(['/login']);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<User>;
      if (!parsed || typeof parsed.email !== 'string' || typeof parsed.name !== 'string' || typeof parsed.id !== 'string') {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      const role: UserRole = parsed.role === 'mecanico' ? 'mecanico' : 'admin';
      return {
        id: parsed.id,
        email: parsed.email,
        name: parsed.name,
        role,
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private validateCredentials(credentials: LoginCredentials): User | null {
    const mechanic = this.mechanics.authenticate(credentials.email, credentials.password);
    if (!mechanic) {
      return null;
    }
    return {
      id: mechanic.id,
      email: mechanic.email.trim().toLowerCase(),
      name: mechanic.fullName,
      role: mechanic.role,
    };
  }
}
