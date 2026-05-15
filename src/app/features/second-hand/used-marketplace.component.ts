import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SecondHandListing, SecondHandListingKind } from '@domain/entities';
import { SecondHandStore } from '@core/second-hand/second-hand.store';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=60';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-used-marketplace',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './used-marketplace.component.html',
})
export class UsedMarketplaceComponent {
  private readonly store = inject(SecondHandStore);

  readonly listings = this.store.listings;
  readonly filterKind = signal<'todos' | SecondHandListingKind>('todos');

  readonly formKind = signal<SecondHandListingKind>('repuesto');
  formTitle = '';
  formDescription = '';
  formPriceMxn: number | null = null;
  formImageUrl = '';
  readonly formFileName = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly formBusy = signal(false);

  private readonly brokenImageIds = signal<ReadonlySet<string>>(new Set());

  filteredList(): readonly SecondHandListing[] {
    const f = this.filterKind();
    const all = this.listings();
    if (f === 'todos') {
      return all;
    }
    return all.filter((l) => l.kind === f);
  }

  setFilter(v: 'todos' | SecondHandListingKind): void {
    this.filterKind.set(v);
  }

  /** Evita `/` en bindings `[class.*]` (parser de Angular). */
  filterPillClass(kind: 'todos' | SecondHandListingKind): string {
    const base = 'rounded-full px-3 py-1.5 text-xs font-medium transition ';
    const on = 'bg-brand-500/25 text-brand-100 ring-1 ring-brand-500/50 ';
    const off = 'bg-surface-800 text-slate-300 ';
    return base + (this.filterKind() === kind ? on : off);
  }

  kindLabel(kind: SecondHandListingKind): string {
    return kind === 'bicicleta_completa' ? 'Bicicleta completa' : 'Repuesto';
  }

  onImageError(id: string): void {
    this.brokenImageIds.update((prev) => new Set([...prev, id]));
  }

  imageSrc(listing: SecondHandListing): string {
    return this.brokenImageIds().has(listing.id) ? PLACEHOLDER_IMG : listing.imageUrl;
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
    if (imageUrl.length < 10) {
      this.formError.set('Pega una URL de imagen o sube un archivo.');
      return;
    }
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
      this.formError.set('La imagen debe ser una URL (https…) o un archivo subido.');
      return;
    }

    this.store.addListing({
      kind: this.formKind(),
      title,
      description,
      priceMxn: price,
      imageUrl,
    });

    this.formTitle = '';
    this.formDescription = '';
    this.formPriceMxn = null;
    this.formImageUrl = '';
    this.formFileName.set(null);
  }

  remove(id: string): void {
    if (globalThis.confirm('¿Quitar esta publicación del catálogo?')) {
      this.store.removeListing(id);
    }
  }
}
