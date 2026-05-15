export interface Bike {
  readonly id: string;
  readonly customerId: string;
  readonly brand: string;
  readonly model: string;
  readonly serialNumber?: string;
  readonly category: 'urbana' | 'mtb' | 'ruta' | 'e-bike' | 'otra';
}
