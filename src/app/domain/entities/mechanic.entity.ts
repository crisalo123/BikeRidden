/** Rol de acceso a la aplicación. */
export type MechanicAppRole = 'admin' | 'mecanico';

export interface Mechanic {
  readonly id: string;
  readonly fullName: string;
  /** Correo para iniciar sesión (único en el taller). */
  readonly email: string;
  /** Contraseña en memoria (demo). En producción usar hash en backend. */
  readonly password: string;
  readonly role: MechanicAppRole;
  readonly active: boolean;
  readonly phone?: string;
}
