import { Injectable, computed, signal } from '@angular/core';
import type { Mechanic, MechanicAppRole } from '@domain/entities';
import { SAMPLE_MECHANICS } from '@features/workshop/data/workshop-mechanics.data';

export interface CreateMechanicDto {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly role: MechanicAppRole;
  readonly phone?: string;
}

export interface UpdateMechanicDto {
  readonly fullName?: string;
  readonly email?: string;
  readonly password?: string;
  readonly role?: MechanicAppRole;
  readonly active?: boolean;
  readonly phone?: string;
}

@Injectable({ providedIn: 'root' })
export class MechanicsStore {
  private readonly _mechanics = signal<Mechanic[]>(SAMPLE_MECHANICS.map((m) => ({ ...m })));

  readonly mechanics = this._mechanics.asReadonly();
  readonly activeMechanics = computed(() => this._mechanics().filter((m) => m.active));
  readonly mechanicsCount = computed(() => this._mechanics().length);

  authenticate(email: string, password: string): Mechanic | undefined {
    const key = email.trim().toLowerCase();
    const pwd = password;
    return this._mechanics().find(
      (m) => m.active && m.email.trim().toLowerCase() === key && m.password === pwd,
    );
  }

  create(dto: CreateMechanicDto): { ok: true; id: string } | { ok: false; error: string } {
    const email = dto.email.trim().toLowerCase();
    if (!email || !dto.fullName.trim() || dto.password.length < 6) {
      return { ok: false, error: 'Completa nombre, correo y contraseña (mín. 6 caracteres).' };
    }
    if (this._mechanics().some((m) => m.email.trim().toLowerCase() === email)) {
      return { ok: false, error: 'Ya existe un usuario con ese correo.' };
    }
    const phone = dto.phone?.trim();
    const mechanic: Mechanic = {
      id: crypto.randomUUID(),
      fullName: dto.fullName.trim(),
      email,
      password: dto.password,
      role: dto.role,
      active: true,
      ...(phone ? { phone } : {}),
    };
    this._mechanics.update((list) => [mechanic, ...list]);
    return { ok: true, id: mechanic.id };
  }

  update(id: string, dto: UpdateMechanicDto): { ok: true } | { ok: false; error: string } {
    let err: string | null = null;
    this._mechanics.update((list) => {
      const i = list.findIndex((m) => m.id === id);
      if (i === -1) {
        err = 'Usuario no encontrado.';
        return list;
      }
      const prev = list[i];
      const email = (dto.email ?? prev.email).trim().toLowerCase();
      if (this._mechanics().some((m) => m.id !== id && m.email.trim().toLowerCase() === email)) {
        err = 'Ese correo ya está en uso.';
        return list;
      }
      const pwd = dto.password !== undefined ? dto.password : prev.password;
      if (pwd.length < 6) {
        err = 'La contraseña debe tener al menos 6 caracteres.';
        return list;
      }
      let phone: string | undefined;
      if (dto.phone !== undefined) {
        const p = dto.phone.trim();
        phone = p.length > 0 ? p : undefined;
      } else {
        phone = prev.phone;
      }
      const next: Mechanic = {
        id: prev.id,
        fullName: (dto.fullName ?? prev.fullName).trim() || prev.fullName,
        email,
        password: pwd,
        role: dto.role ?? prev.role,
        active: dto.active ?? prev.active,
        ...(phone ? { phone } : {}),
      };
      const copy = [...list];
      copy[i] = next;
      return copy;
    });
    if (err) {
      return { ok: false, error: err };
    }
    return { ok: true };
  }

  mechanicName(id: string): string {
    return this._mechanics().find((m) => m.id === id)?.fullName ?? '—';
  }
}
