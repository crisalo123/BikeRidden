import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, delay, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { User, UserRole } from '@domain/entities';
import type { LoginCredentials } from './login-credentials';

const STORAGE_KEY = 'br_session_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<User | null>(this.readStoredUser());

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(private readonly router: Router) {}

  login(credentials: LoginCredentials): Observable<User> {
    const user = this.validateCredentials(credentials);
    if (!user) {
      return throwError(() => new Error('Credenciales inválidas'));
    }
    return of(user).pipe(
      delay(850),
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
      const role: UserRole = 'admin';
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
    const email = credentials.email.trim().toLowerCase();
    const pwd = credentials.password;
    if (email === 'demo@bikeridden.app' && pwd === 'demo1234') {
      return {
        id: 'usr_admin',
        email,
        name: 'Administrador',
        role: 'admin',
      };
    }
    return null;
  }
}
