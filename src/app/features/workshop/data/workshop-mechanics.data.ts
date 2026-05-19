import type { Mechanic } from '@domain/entities';

export const SAMPLE_MECHANICS: readonly Mechanic[] = [
  {
    id: 'm-admin',
    fullName: 'Administrador',
    email: 'demo@bikeridden.app',
    password: 'demo1234',
    role: 'admin',
    active: true,
  },
  {
    id: 'm1',
    fullName: 'María Vega',
    email: 'maria.vega@johanbikes.local',
    password: 'maria1234',
    role: 'mecanico',
    active: true,
    phone: '+57 300 111 2233',
  },
  {
    id: 'm2',
    fullName: 'Carlos Ruiz',
    email: 'carlos.ruiz@johanbikes.local',
    password: 'carlos1234',
    role: 'mecanico',
    active: true,
    phone: '+57 300 444 5566',
  },
  {
    id: 'm3',
    fullName: 'Ana López',
    email: 'ana.lopez@johanbikes.local',
    password: 'ana1234',
    role: 'mecanico',
    active: true,
  },
];
