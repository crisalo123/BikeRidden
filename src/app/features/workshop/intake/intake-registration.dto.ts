import type { Bike } from '@domain/entities';

/** Payload del formulario de recepción (hasta que exista API). */
export interface IntakeRegistrationDto {
  readonly customerFullName: string;
  readonly customerPhone: string;
  readonly customerEmail: string;
  readonly customerNotes: string;
  /** Quien recibe la bicicleta en recepción (queda en la OT y en el historial del cliente). */
  readonly receivedByMechanicName: string;
  readonly bikeBrand: string;
  readonly bikeModel: string;
  readonly bikeSerial: string;
  readonly bikeCategory: Bike['category'];
  readonly processDescription: string;
}
