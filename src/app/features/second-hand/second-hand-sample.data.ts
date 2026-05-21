import type { SecondHandListing } from '@domain/entities';

/** Fotos de referencia desde internet hasta que cargues tu propio lote. */
export const SAMPLE_SECOND_HAND_LISTINGS: readonly SecondHandListing[] = [
  {
    id: 'sh-demo-1',
    sku: 'MTB-29-ALU',
    kind: 'bicicleta_completa',
    title: 'MTB 29" — cuadro aluminio',
    description:
      'Bicicleta usada en buen estado general. Transmisión revisada, frenos de disco hidráulicos. Ideal para senderos.',
    priceMxn: 11800,
    stock: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=900&q=80',
    listedAt: '2026-05-02',
    featured: true,
  },
  {
    id: 'sh-demo-2',
    sku: 'GRAVEL-ACERO',
    kind: 'bicicleta_completa',
    title: 'Ruta / gravel — acero',
    description:
      'Cuadro acero, horquilla carbono. Rodado 700x38. Incluye portabidón y bolsa de manillar.',
    priceMxn: 15400,
    stock: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1532298226424-cc508ea6f88f?auto=format&fit=crop&w=900&q=80',
    listedAt: '2026-05-08',
    featured: true,
  },
  {
    id: 'sh-demo-3',
    sku: 'RUEDA-700-SHIM',
    kind: 'repuesto',
    title: 'Juego de ruedas 700c — buje shimano',
    description: 'Llantas alineadas, rodamientos ok. Cassette 11-32 incluido. Uso urbano y ruta ligera.',
    priceMxn: 2200,
    stock: 2,
    imageUrl:
      'https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=900&q=80',
    listedAt: '2026-05-10',
    featured: true,
  },
  {
    id: 'sh-demo-4',
    sku: 'GRUPO-1X11',
    kind: 'repuesto',
    title: 'Grupo 1x11 — palanca + derailleur',
    description: 'Extraído de bici de ruta. Desgaste moderado en plato; cadena con vida útil restante.',
    priceMxn: 1850,
    stock: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80',
    listedAt: '2026-05-11',
    featured: false,
  },
  {
    id: 'sh-demo-5',
    sku: 'HORQ-100-AIRE',
    kind: 'repuesto',
    title: 'Horquilla suspensión 100mm — aire',
    description: 'Eje pasante 15mm, recorrido 100mm. Última revisión de sellos hace 4 meses.',
    priceMxn: 3200,
    stock: 1,
    imageUrl:
      'https://images.unsplash.com/photo-1507035895480-2b315f0ce301?auto=format&fit=crop&w=900&q=80',
    listedAt: '2026-05-12',
    featured: false,
  },
];
