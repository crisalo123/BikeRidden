import type { Bike, Customer, WorkOrder, WorkOrderStatusChange } from '@domain/entities';

export const SAMPLE_CUSTOMERS: readonly Customer[] = [
  {
    id: 'c1',
    nationalId: '1020304050',
    fullName: 'Laura Méndez',
    phone: '+52 55 1000 2233',
    email: 'laura.m@example.com',
    notes: 'Prefiere avisos por WhatsApp',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'c2',
    nationalId: '8090706050',
    fullName: 'Diego Ríos',
    phone: '+52 55 9000 4411',
    email: 'diego.rios@example.com',
  },
];

export const SAMPLE_BIKES: readonly Bike[] = [
  {
    id: 'b1',
    customerId: 'c1',
    brand: 'Trek',
    model: 'Marlin 7',
    serialNumber: 'WK123456',
    category: 'mtb',
  },
  {
    id: 'b2',
    customerId: 'c2',
    brand: 'Specialized',
    model: 'Sirrus X 3.0',
    category: 'urbana',
  },
  {
    id: 'b3',
    customerId: 'c1',
    brand: 'Cannondale',
    model: 'Topstone 2',
    category: 'ruta',
  },
];

export const SAMPLE_WORK_ORDERS: readonly WorkOrder[] = [
  {
    id: 'wo1',
    code: 'OT-1042',
    customerId: 'c1',
    bikeId: 'b1',
    status: 'en_taller',
    summary: 'Servicio mayor + cambio de cadena',
    receivedByMechanicName: 'María Vega',
    receptionObservations:
      'Ingresa con barro en transmisión. Porta-bidón y bomba en el cuadro. Sin luces delanteras.',
    diagnosticNotes:
      'Cadena alargada (12 eslabones de elongación). Cassette 11-42 con dientes enganchados en piñón 32. ' +
      'Frenos con pastillas al 20% y discos con surcos leves. Se recomienda servicio mayor y sustitución de cadena y cassette.',
    openedAt: '2026-05-10',
    estimatedReadyAt: '2026-05-15',
  },
  {
    id: 'wo2',
    code: 'OT-1043',
    customerId: 'c2',
    bikeId: 'b2',
    status: 'espera_repuesto',
    summary: 'Frenos hidráulicos — kit llega viernes',
    receivedByMechanicName: 'Carlos Ruiz',
    receptionObservations: 'Frenos con ruido al apretar. Pastillas desgastadas visibles. Cuadro sin golpes.',
    openedAt: '2026-05-11',
  },
  {
    id: 'wo3',
    code: 'OT-1044',
    customerId: 'c1',
    bikeId: 'b3',
    status: 'listo',
    summary: 'Alineación y engrase',
    receivedByMechanicName: 'Ana López',
    receptionObservations: 'Bici limpia. Cadena seca. Cliente pide solo engrase y revisión de frenos.',
    openedAt: '2026-05-09',
    estimatedReadyAt: '2026-05-12',
  },
];

/** Historial demo coherente con el estado actual de cada OT (mecánico por paso). */
export const SAMPLE_WORK_ORDER_STATUS_HISTORY: readonly WorkOrderStatusChange[] = [
  {
    orderId: 'wo1',
    orderCode: 'OT-1042',
    from: 'ingreso',
    to: 'diagnostico',
    mechanicName: 'María Vega',
    at: '2026-05-10T10:15:00.000Z',
  },
  {
    orderId: 'wo1',
    orderCode: 'OT-1042',
    from: 'diagnostico',
    to: 'en_taller',
    mechanicName: 'Luis Ortega',
    at: '2026-05-10T11:40:00.000Z',
  },
  {
    orderId: 'wo2',
    orderCode: 'OT-1043',
    from: 'ingreso',
    to: 'diagnostico',
    mechanicName: 'María Vega',
    at: '2026-05-11T09:00:00.000Z',
  },
  {
    orderId: 'wo2',
    orderCode: 'OT-1043',
    from: 'diagnostico',
    to: 'en_taller',
    mechanicName: 'Luis Ortega',
    at: '2026-05-11T10:20:00.000Z',
  },
  {
    orderId: 'wo2',
    orderCode: 'OT-1043',
    from: 'en_taller',
    to: 'espera_repuesto',
    mechanicName: 'Pedro Sánchez',
    at: '2026-05-11T16:00:00.000Z',
  },
  {
    orderId: 'wo3',
    orderCode: 'OT-1044',
    from: 'ingreso',
    to: 'diagnostico',
    mechanicName: 'Carlos Ruiz',
    at: '2026-05-09T09:30:00.000Z',
  },
  {
    orderId: 'wo3',
    orderCode: 'OT-1044',
    from: 'diagnostico',
    to: 'en_taller',
    mechanicName: 'Ana López',
    at: '2026-05-09T10:15:00.000Z',
  },
  {
    orderId: 'wo3',
    orderCode: 'OT-1044',
    from: 'en_taller',
    to: 'listo',
    mechanicName: 'Ana López',
    at: '2026-05-09T14:45:00.000Z',
  },
];
