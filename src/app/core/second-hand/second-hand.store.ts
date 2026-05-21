import { Injectable, computed, signal } from '@angular/core';
import type { InventoryImportRow, SecondHandListing, SecondHandListingKind } from '@domain/entities';
import { SAMPLE_SECOND_HAND_LISTINGS } from '@features/second-hand/second-hand-sample.data';

const STORAGE_KEY = 'br_inventory_listings';
const PAGE_SIZE = 20;

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=60';

export interface NewSecondHandListingInput {
  readonly kind: SecondHandListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceMxn: number;
  readonly imageUrl: string;
  readonly sku?: string;
  readonly stock?: number;
  readonly featured?: boolean;
}

export interface InventoryImportResult {
  readonly added: number;
  readonly updated: number;
  readonly skipped: number;
}

@Injectable({ providedIn: 'root' })
export class SecondHandStore {
  private readonly _listings = signal<SecondHandListing[]>(this.loadInitial());

  readonly listings = this._listings.asReadonly();
  readonly pageSize = PAGE_SIZE;

  readonly searchQuery = signal('');
  readonly filterKind = signal<'todos' | SecondHandListingKind>('todos');
  readonly pageIndex = signal(0);

  readonly filteredListings = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const kind = this.filterKind();
    let list = this._listings();
    if (kind !== 'todos') {
      list = list.filter((l) => l.kind === kind);
    }
    if (q) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
  });

  readonly totalFiltered = computed(() => this.filteredListings().length);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredListings().length / PAGE_SIZE)),
  );

  readonly paginatedListings = computed(() => {
    const pages = this.totalPages();
    const page = Math.min(Math.max(0, this.pageIndex()), pages - 1);
    const start = page * PAGE_SIZE;
    return this.filteredListings().slice(start, start + PAGE_SIZE);
  });

  readonly featuredListings = computed(() =>
    this._listings().filter((l) => l.featured).slice(0, 12),
  );

  readonly stats = computed(() => {
    const list = this._listings();
    const stockUnits = list.reduce((s, l) => s + l.stock, 0);
    const valueMxn = list.reduce((s, l) => s + l.priceMxn * l.stock, 0);
    return {
      totalItems: list.length,
      stockUnits,
      valueMxn,
      featured: list.filter((l) => l.featured).length,
    };
  });

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.pageIndex.set(0);
  }

  setFilterKind(kind: 'todos' | SecondHandListingKind): void {
    this.filterKind.set(kind);
    this.pageIndex.set(0);
  }

  setPage(index: number): void {
    const max = this.totalPages() - 1;
    this.pageIndex.set(Math.min(Math.max(0, index), max));
  }

  nextPage(): void {
    this.setPage(this.pageIndex() + 1);
  }

  prevPage(): void {
    this.setPage(this.pageIndex() - 1);
  }

  toggleFeatured(id: string): void {
    this._listings.update((list) => {
      const copy = list.map((l) => (l.id === id ? { ...l, featured: !l.featured } : l));
      this.persist(copy);
      return copy;
    });
  }

  addListing(input: NewSecondHandListingInput): { ok: true } | { ok: false; error: string } {
    const sku = (input.sku?.trim() || this.suggestSku(input.title)).toUpperCase();
    if (this._listings().some((l) => l.sku.toLowerCase() === sku.toLowerCase())) {
      return { ok: false, error: `Ya existe el SKU ${sku}.` };
    }
    const item = this.buildListing({
      sku,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      priceMxn: input.priceMxn,
      stock: input.stock ?? 1,
      imageUrl: input.imageUrl.trim() || DEFAULT_IMAGE,
      featured: input.featured ?? false,
    });
    this._listings.update((list) => {
      const copy = [item, ...list];
      this.persist(copy);
      return copy;
    });
    return { ok: true };
  }

  importRows(rows: readonly InventoryImportRow[]): InventoryImportResult {
    let added = 0;
    let updated = 0;
    const skipped = 0;
    this._listings.update((list) => {
      const bySku = new Map(list.map((l) => [l.sku.toLowerCase(), l]));
      for (const row of rows) {
        const key = row.sku.toLowerCase();
        const existing = bySku.get(key);
        const imageUrl = row.imageUrl.trim() || existing?.imageUrl || DEFAULT_IMAGE;
        if (existing) {
          const next: SecondHandListing = {
            ...existing,
            title: row.title,
            kind: row.kind,
            description: row.description,
            priceMxn: row.priceMxn,
            stock: row.stock,
            imageUrl,
            featured: row.featured,
          };
          bySku.set(key, next);
          updated += 1;
        } else {
          const item = this.buildListing({
            sku: row.sku,
            kind: row.kind,
            title: row.title,
            description: row.description,
            priceMxn: row.priceMxn,
            stock: row.stock,
            imageUrl,
            featured: row.featured,
          });
          bySku.set(key, item);
          added += 1;
        }
      }
      const copy = [...bySku.values()].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
      this.persist(copy);
      return copy;
    });
    this.pageIndex.set(0);
    return { added, updated, skipped };
  }

  removeListing(id: string): void {
    this._listings.update((list) => {
      const copy = list.filter((l) => l.id !== id);
      this.persist(copy);
      return copy;
    });
  }

  private buildListing(input: {
    sku: string;
    kind: SecondHandListingKind;
    title: string;
    description: string;
    priceMxn: number;
    stock: number;
    imageUrl: string;
    featured: boolean;
  }): SecondHandListing {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: crypto.randomUUID(),
      sku: input.sku.trim().toUpperCase(),
      kind: input.kind,
      title: input.title,
      description: input.description,
      priceMxn: Math.max(0, Math.round(input.priceMxn)),
      stock: Math.max(0, Math.round(input.stock)),
      imageUrl: input.imageUrl,
      listedAt: today,
      featured: input.featured,
    };
  }

  private suggestSku(title: string): string {
    const base = title
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    return `${base || 'ITEM'}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  private loadInitial(): SecondHandListing[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SecondHandListing[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((l) => this.migrateListing(l));
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    const seed = SAMPLE_SECOND_HAND_LISTINGS.map((l) => ({ ...l }));
    this.persist(seed);
    return seed;
  }

  private migrateListing(l: SecondHandListing): SecondHandListing {
    return {
      id: l.id,
      sku: l.sku ?? `LEGACY-${l.id.slice(0, 8).toUpperCase()}`,
      kind: l.kind,
      title: l.title,
      description: l.description,
      priceMxn: l.priceMxn,
      stock: typeof l.stock === 'number' ? l.stock : 1,
      imageUrl: l.imageUrl || DEFAULT_IMAGE,
      listedAt: l.listedAt,
      featured: l.featured ?? false,
    };
  }

  private persist(list: readonly SecondHandListing[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* quota exceeded — datos siguen en memoria esta sesión */
    }
  }
}
