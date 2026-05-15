export interface Customer {
  readonly id: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly notes?: string;
  /** Foto de perfil (URL o data URL). */
  readonly avatarUrl?: string;
}
