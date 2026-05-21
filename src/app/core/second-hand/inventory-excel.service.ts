import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import type { InventoryImportRow, SecondHandListingKind } from '@domain/entities';

export interface ParsedInventoryRow {
  readonly rowNumber: number;
  readonly data?: InventoryImportRow;
  readonly errors: readonly string[];
}

const TEMPLATE_HEADERS = [
  'sku',
  'nombre',
  'tipo',
  'descripcion',
  'precio',
  'stock',
  'url_imagen',
  'destacado',
] as const;

const TEMPLATE_EXAMPLE: readonly string[] = [
  'RUEDA-29-001',
  'Rueda trasera 29 boost',
  'repuesto',
  'Llanta y buje en buen estado',
  '2200',
  '3',
  'https://ejemplo.com/foto.jpg',
  'no',
];

@Injectable({ providedIn: 'root' })
export class InventoryExcelService {
  downloadTemplate(): void {
    const wb = XLSX.utils.book_new();
    const instructions = [
      ['Plantilla de inventario — BikeRidden'],
      ['Columnas obligatorias: sku, nombre, tipo (bicicleta_completa o repuesto), precio'],
      ['destacado: si / no — aparece en el carrusel (máx. 12 recomendados)'],
      ['url_imagen: opcional; si falta se usa imagen genérica'],
      [],
      [...TEMPLATE_HEADERS],
      [...TEMPLATE_EXAMPLE],
    ];
    const ws = XLSX.utils.aoa_to_sheet(instructions);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'plantilla-bodega-bikeridden.xlsx');
  }

  async parseFile(file: File): Promise<ParsedInventoryRow[]> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      return [{ rowNumber: 0, errors: ['El archivo no tiene hojas legibles.'] }];
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    if (rows.length === 0) {
      return [{ rowNumber: 0, errors: ['No hay filas de datos (revisa encabezados).'] }];
    }

    const parsed: ParsedInventoryRow[] = [];
    let rowNumber = 1;
    for (const raw of rows) {
      rowNumber += 1;
      const normalized = this.normalizeRowKeys(raw);
      if (this.isInstructionOrEmptyRow(normalized)) {
        continue;
      }
      parsed.push(this.validateRow(rowNumber, normalized));
    }
    return parsed.length > 0 ? parsed : [{ rowNumber: 0, errors: ['No se encontraron filas válidas.'] }];
  }

  private normalizeRowKeys(raw: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const k = this.normKey(key);
      if (!k) {
        continue;
      }
      out[k] = String(value ?? '').trim();
    }
    return out;
  }

  private normKey(key: string): string {
    return key
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, '_');
  }

  private isInstructionOrEmptyRow(row: Record<string, string>): boolean {
    const sku = row['sku'] ?? '';
    const nombre = row['nombre'] ?? row['titulo'] ?? row['title'] ?? '';
    if (!sku && !nombre) {
      return true;
    }
    if (sku.toLowerCase().includes('plantilla') || sku.toLowerCase().includes('columna')) {
      return true;
    }
    return false;
  }

  private validateRow(rowNumber: number, row: Record<string, string>): ParsedInventoryRow {
    const errors: string[] = [];
    const sku = (row['sku'] ?? '').trim();
    const title = (row['nombre'] ?? row['titulo'] ?? row['title'] ?? '').trim();
    const kindRaw = (row['tipo'] ?? row['kind'] ?? '').trim();
    const description = (row['descripcion'] ?? row['description'] ?? '').trim() || '—';
    const priceRaw = (row['precio'] ?? row['price'] ?? '').trim();
    const stockRaw = (row['stock'] ?? row['cantidad'] ?? '1').trim();
    const imageUrl = (row['url_imagen'] ?? row['imagen'] ?? row['image_url'] ?? '').trim();
    const featuredRaw = (row['destacado'] ?? row['featured'] ?? 'no').trim();

    if (!sku) {
      errors.push('SKU obligatorio.');
    }
    if (title.length < 2) {
      errors.push('Nombre muy corto.');
    }

    const kind = this.parseKind(kindRaw);
    if (!kind) {
      errors.push('Tipo inválido (usa bicicleta_completa o repuesto).');
    }

    const priceMxn = Math.round(Number(priceRaw.replace(/[^\d.-]/g, '')));
    if (Number.isNaN(priceMxn) || priceMxn < 0) {
      errors.push('Precio inválido.');
    }

    const stock = Math.round(Number(stockRaw.replace(/[^\d.-]/g, '')));
    if (Number.isNaN(stock) || stock < 0) {
      errors.push('Stock inválido.');
    }

    if (imageUrl.length > 0 && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
      errors.push('URL de imagen debe empezar por https://');
    }

    if (errors.length > 0 || !kind) {
      return { rowNumber, errors };
    }

    return {
      rowNumber,
      errors: [],
      data: {
        sku,
        title,
        kind,
        description,
        priceMxn,
        stock: Number.isNaN(stock) ? 1 : stock,
        imageUrl,
        featured: this.parseFeatured(featuredRaw),
      },
    };
  }

  private parseKind(raw: string): SecondHandListingKind | null {
    const v = raw.toLowerCase().replace(/\s+/g, '_');
    if (['bicicleta_completa', 'bicicleta', 'bici', 'bike', 'completa'].includes(v)) {
      return 'bicicleta_completa';
    }
    if (['repuesto', 'pieza', 'part', 'accesorio'].includes(v)) {
      return 'repuesto';
    }
    return null;
  }

  private parseFeatured(raw: string): boolean {
    const v = raw.toLowerCase();
    return ['si', 'sí', 's', '1', 'true', 'x', 'yes', 'y'].includes(v);
  }
}
