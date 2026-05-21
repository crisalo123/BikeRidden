export type SecondHandListingKind = 'bicicleta_completa' | 'repuesto';

export interface SecondHandListing {
  readonly id: string;
  /** Código único en bodega (clave para importar Excel). */
  readonly sku: string;
  readonly kind: SecondHandListingKind;
  readonly title: string;
  readonly description: string;
  /** Precio en pesos mexicanos (entero). */
  readonly priceMxn: number;
  readonly stock: number;
  /** URL https o imagen en base64 (data URL) subida por el usuario. */
  readonly imageUrl: string;
  readonly listedAt: string;
  /** Visible en el carrusel de destacados. */
  readonly featured: boolean;
}

export interface InventoryImportRow {
  readonly sku: string;
  readonly title: string;
  readonly kind: SecondHandListingKind;
  readonly description: string;
  readonly priceMxn: number;
  readonly stock: number;
  readonly imageUrl: string;
  readonly featured: boolean;
}
