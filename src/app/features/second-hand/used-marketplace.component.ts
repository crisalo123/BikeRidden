import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SecondHandListing, SecondHandListingKind } from '@domain/entities';
import { InventoryExcelService, type ParsedInventoryRow } from '@core/second-hand/inventory-excel.service';
import { SecondHandStore } from '@core/second-hand/second-hand.store';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=60';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-used-marketplace',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './used-marketplace.component.html',
  styleUrl: './used-marketplace.component.scss',
})
export class UsedMarketplaceComponent {
  readonly store = inject(SecondHandStore);
  private readonly excel = inject(InventoryExcelService);

  readonly carouselRef = viewChild<ElementRef<HTMLElement>>('carousel');

  readonly listings = this.store.listings;
  readonly featuredListings = this.store.featuredListings;
  readonly paginatedListings = this.store.paginatedListings;
  readonly stats = this.store.stats;
  readonly totalFiltered = this.store.totalFiltered;
  readonly totalPages = this.store.totalPages;
  readonly pageIndex = this.store.pageIndex;
  readonly pageSize = this.store.pageSize;
  readonly filterKind = this.store.filterKind;

  readonly showImport = signal(false);
  readonly importBusy = signal(false);
  readonly importPreview = signal<readonly ParsedInventoryRow[] | null>(null);
  readonly importMessage = signal<string | null>(null);

  readonly formKind = signal<SecondHandListingKind>('repuesto');
  formSku = '';
  formTitle = '';
  formDescription = '';
  formPriceMxn: number | null = null;
  formStock = 1;
  formImageUrl = '';
  formFeatured = false;
  readonly formFileName = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formBusy = signal(false);

  private readonly brokenImageIds = signal<ReadonlySet<string>>(new Set());

  searchQuery = '';

  syncSearch(): void {
    this.store.setSearchQuery(this.searchQuery);
  }

  setFilter(v: 'todos' | SecondHandListingKind): void {
    this.store.setFilterKind(v);
  }

  filterPillClass(kind: 'todos' | SecondHandListingKind): string {
    const base = 'rounded-full px-3 py-1.5 text-xs font-medium transition ';
    const on = 'bg-brand-500/25 text-brand-100 ring-1 ring-brand-500/50 ';
    const off = 'bg-surface-800 text-slate-300 ';
    return base + (this.filterKind() === kind ? on : off);
  }

  kindLabel(kind: SecondHandListingKind): string {
    return kind === 'bicicleta_completa' ? 'Bicicleta completa' : 'Repuesto';
  }

  pageLabel(): string {
    return `Página ${this.pageIndex() + 1} de ${this.totalPages()}`;
  }

  onImageError(id: string): void {
    this.brokenImageIds.update((prev) => new Set([...prev, id]));
  }

  imageSrc(listing: SecondHandListing): string {
    return this.brokenImageIds().has(listing.id) ? PLACEHOLDER_IMG : listing.imageUrl;
  }

  scrollCarousel(dir: -1 | 1): void {
    const el = this.carouselRef()?.nativeElement;
    if (!el) {
      return;
    }
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.85), behavior: 'smooth' });
  }

  downloadTemplate(): void {
    this.excel.downloadTemplate();
  }

  openImport(): void {
    this.showImport.set(true);
    this.importPreview.set(null);
    this.importMessage.set(null);
  }

  closeImport(): void {
    this.showImport.set(false);
    this.importPreview.set(null);
    this.importBusy.set(false);
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.importBusy.set(true);
    this.importMessage.set(null);
    try {
      const rows = await this.excel.parseFile(file);
      this.importPreview.set(rows);
      const valid = rows.filter((r) => r.data).length;
      const invalid = rows.filter((r) => r.errors.length > 0 && !r.data).length;
      this.importMessage.set(
        `${valid} fila(s) lista(s) para importar` + (invalid > 0 ? ` · ${invalid} con errores` : ''),
      );
    } catch {
      this.importMessage.set('No se pudo leer el archivo.');
      this.importPreview.set(null);
    } finally {
      this.importBusy.set(false);
    }
  }

  confirmImport(): void {
    const preview = this.importPreview();
    if (!preview) {
      return;
    }
    const rows = preview.filter((r) => r.data).map((r) => r.data!);
    if (rows.length === 0) {
      this.importMessage.set('No hay filas válidas para importar.');
      return;
    }
    const result = this.store.importRows(rows);
    this.importMessage.set(
      `Importación lista: ${result.added} nuevos, ${result.updated} actualizados. Datos guardados en este navegador.`,
    );
    this.importPreview.set(null);
    this.showImport.set(false);
  }

  previewValidCount(): number {
    return (this.importPreview() ?? []).filter((r) => r.data).length;
  }

  onPickImage(event: Event): void {
    this.formError.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.formError.set('El archivo debe ser una imagen (JPG, PNG, WebP…).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.formError.set('La imagen supera 2 MB. Comprime el archivo o usa una URL.');
      return;
    }
    this.formBusy.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        this.formImageUrl = result;
        this.formFileName.set(file.name);
      }
      this.formBusy.set(false);
    };
    reader.onerror = () => {
      this.formError.set('No se pudo leer el archivo.');
      this.formBusy.set(false);
    };
    reader.readAsDataURL(file);
  }

  clearPickedFile(): void {
    this.formFileName.set(null);
    if (this.formImageUrl.startsWith('data:')) {
      this.formImageUrl = '';
    }
  }

  submitListing(): void {
    this.formError.set(null);
    const title = this.formTitle.trim();
    const description = this.formDescription.trim();
    const price = this.formPriceMxn;
    const imageUrl = this.formImageUrl.trim();

    if (title.length < 3) {
      this.formError.set('Escribe un título más descriptivo (mín. 3 caracteres).');
      return;
    }
    if (description.length < 8) {
      this.formError.set('Añade una descripción breve (mín. 8 caracteres).');
      return;
    }
    if (price === null || Number.isNaN(price) || price < 0) {
      this.formError.set('Indica un precio válido en MXN.');
      return;
    }
    if (imageUrl.length > 10 && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
      this.formError.set('La imagen debe ser una URL (https…) o un archivo subido.');
      return;
    }

    const result = this.store.addListing({
      kind: this.formKind(),
      sku: this.formSku,
      title,
      description,
      priceMxn: price,
      stock: Math.max(0, Math.round(this.formStock || 1)),
      imageUrl: imageUrl.length >= 10 ? imageUrl : PLACEHOLDER_IMG,
      featured: this.formFeatured,
    });

    if (!result.ok) {
      this.formError.set(result.error);
      return;
    }

    this.formSku = '';
    this.formTitle = '';
    this.formDescription = '';
    this.formPriceMxn = null;
    this.formStock = 1;
    this.formImageUrl = '';
    this.formFeatured = false;
    this.formFileName.set(null);
  }

  remove(id: string): void {
    if (globalThis.confirm('¿Quitar este artículo del inventario?')) {
      this.store.removeListing(id);
    }
  }

  toggleFeatured(id: string): void {
    this.store.toggleFeatured(id);
  }
}
