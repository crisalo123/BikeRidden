export type UserRole = 'admin' | 'mecanico';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
}
