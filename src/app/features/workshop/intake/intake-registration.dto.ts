import type { Bike } from '@domain/entities';

/** Payload del formulario de recepción (hasta que exista API). */
export interface IntakeRegistrationDto {
  readonly customerNationalId: string;
  /** Si se reutiliza un cliente ya registrado (búsqueda por cédula). */
  readonly existingCustomerId?: string;
  readonly customerFullName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  readonly customerNotes: string;
  /** Quien recibe la bicicleta en recepción (queda en la OT y en el historial del cliente). */
  readonly receivedByMechanicName: string;
  /** Estado de la bicicleta al ingresar (rayones, accesorios, presión, etc.). */
  readonly receptionObservations: string;
  /** Bicicleta ya registrada del cliente (solo en recepción de cliente existente). */
  readonly existingBikeId?: string;
  readonly bikeBrand: string;
  readonly bikeModel: string;
  readonly bikeSerial: string;
  readonly bikeCategory: Bike['category'];
  readonly processDescription: string;
}
