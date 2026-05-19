export interface Customer {
  readonly id: string;
  /** Número de cédula o documento de identidad (único en el taller). */
  readonly nationalId: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly notes?: string;
  /** Foto de perfil (URL o data URL). */
  readonly avatarUrl?: string;
}
