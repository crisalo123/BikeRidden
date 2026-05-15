import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { Bike } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';

@Component({
  selector: 'app-new-intake',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-intake.component.html',
})
export class NewIntakeComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly registry = inject(WorkshopRegistryStore);
  private readonly router = inject(Router);

  readonly categories: { value: Bike['category']; label: string }[] = [
    { value: 'urbana', label: 'Urbana / ciudad' },
    { value: 'mtb', label: 'MTB' },
    { value: 'ruta', label: 'Ruta / carretera' },
    { value: 'e-bike', label: 'E-bike' },
    { value: 'otra', label: 'Otra' },
  ];

  readonly form = this.fb.group({
    customerFullName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.minLength(8)]],
    customerEmail: ['', [Validators.email]],
    customerNotes: [''],
    receivedByMechanicName: ['', [Validators.required, Validators.minLength(2)]],
    bikeBrand: ['', [Validators.required, Validators.minLength(2)]],
    bikeModel: ['', [Validators.required, Validators.minLength(1)]],
    bikeSerial: [''],
    bikeCategory: this.fb.control<Bike['category']>('urbana', { validators: [Validators.required] }),
    processDescription: ['', [Validators.required, Validators.minLength(8)]],
  });

  submitting = false;
  errorMessage: string | null = null;

  submit(): void {
    this.errorMessage = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    try {
      const v = this.form.getRawValue();
      const code = this.registry.registerIntake({
        customerFullName: v.customerFullName,
        customerPhone: v.customerPhone,
        customerEmail: v.customerEmail,
        customerNotes: v.customerNotes,
        receivedByMechanicName: v.receivedByMechanicName,
        bikeBrand: v.bikeBrand,
        bikeModel: v.bikeModel,
        bikeSerial: v.bikeSerial,
        bikeCategory: v.bikeCategory,
        processDescription: v.processDescription,
      });
      void this.router.navigate(['/app/ordenes'], { queryParams: { creada: code } });
    } catch {
      this.errorMessage = 'No se pudo guardar el registro. Intenta de nuevo.';
    } finally {
      this.submitting = false;
    }
  }
}
