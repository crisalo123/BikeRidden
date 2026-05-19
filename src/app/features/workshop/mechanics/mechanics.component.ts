import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Mechanic, MechanicAppRole } from '@domain/entities';
import { AuthService } from '@core/auth/auth.service';
import { MechanicsStore } from '@core/workshop/mechanics.store';

@Component({
  selector: 'app-mechanics',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mechanics.component.html',
})
export class MechanicsComponent {
  readonly store = inject(MechanicsStore);
  readonly auth = inject(AuthService);
  readonly mechanics = this.store.mechanics;

  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formSuccess = signal<string | null>(null);

  fullName = '';
  email = '';
  password = '';
  phone = '';
  role: MechanicAppRole = 'mecanico';
  active = true;

  roleLabel(role: MechanicAppRole): string {
    return role === 'admin' ? 'Administrador' : 'Mecánico';
  }

  isCurrentUser(id: string): boolean {
    return this.auth.user()?.id === id;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.resetForm();
    this.showForm.set(true);
    this.clearMessages();
  }

  startEdit(m: Mechanic): void {
    this.editingId.set(m.id);
    this.fullName = m.fullName;
    this.email = m.email;
    this.password = '';
    this.phone = m.phone ?? '';
    this.role = m.role;
    this.active = m.active;
    this.showForm.set(true);
    this.clearMessages();
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.resetForm();
    this.clearMessages();
  }

  save(): void {
    this.clearMessages();
    const id = this.editingId();
    if (id) {
      const dto = {
        fullName: this.fullName,
        email: this.email,
        role: this.role,
        active: this.active,
        phone: this.phone,
        ...(this.password.trim().length > 0 ? { password: this.password } : {}),
      };
      const result = this.store.update(id, dto);
      if (!result.ok) {
        this.formError.set(result.error);
        return;
      }
      this.formSuccess.set('Usuario actualizado.');
      this.cancelForm();
      return;
    }

    const result = this.store.create({
      fullName: this.fullName,
      email: this.email,
      password: this.password,
      role: this.role,
      phone: this.phone,
    });
    if (!result.ok) {
      this.formError.set(result.error);
      return;
    }
    this.formSuccess.set('Mecánico creado. Ya puede iniciar sesión con su correo y contraseña.');
    this.cancelForm();
  }

  toggleActive(m: Mechanic): void {
    if (this.isCurrentUser(m.id)) {
      this.formError.set('No puedes desactivar tu propia sesión.');
      return;
    }
    this.clearMessages();
    const result = this.store.update(m.id, { active: !m.active });
    if (!result.ok) {
      this.formError.set(result.error);
    }
  }

  private resetForm(): void {
    this.fullName = '';
    this.email = '';
    this.password = '';
    this.phone = '';
    this.role = 'mecanico';
    this.active = true;
  }

  private clearMessages(): void {
    this.formError.set(null);
    this.formSuccess.set(null);
  }
}
