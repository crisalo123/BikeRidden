export type SecondHandListingKind = 'bicicleta_completa' | 'repuesto';

export interface SecondHandListing {
  readonly id: string;
  readonly kind: SecondHandListingKind;
  readonly title: string;
  readonly description: string;
  /** Precio en pesos mexicanos (entero). */
  readonly priceMxn: number;
  /** URL https o imagen en base64 (data URL) subida por el usuario. */
  readonly imageUrl: string;
  readonly listedAt: string;
}
