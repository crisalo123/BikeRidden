import { Injectable, signal } from '@angular/core';
import type { SecondHandListing, SecondHandListingKind } from '@domain/entities';
import { SAMPLE_SECOND_HAND_LISTINGS } from '@features/second-hand/second-hand-sample.data';

export interface NewSecondHandListingInput {
  readonly kind: SecondHandListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceMxn: number;
  readonly imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class SecondHandStore {
  private readonly _listings = signal<SecondHandListing[]>(
    SAMPLE_SECOND_HAND_LISTINGS.map((l) => ({ ...l })),
  );

  readonly listings = this._listings.asReadonly();

  addListing(input: NewSecondHandListingInput): void {
    const today = new Date().toISOString().slice(0, 10);
    const item: SecondHandListing = {
      id: crypto.randomUUID(),
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      priceMxn: Math.max(0, Math.round(input.priceMxn)),
      imageUrl: input.imageUrl.trim(),
      listedAt: today,
    };
    this._listings.update((list) => [item, ...list]);
  }

  removeListing(id: string): void {
    this._listings.update((list) => list.filter((l) => l.id !== id));
  }
}
