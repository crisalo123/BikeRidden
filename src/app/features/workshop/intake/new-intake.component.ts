import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { Bike } from '@domain/entities';
import { WorkshopRegistryStore } from '@core/workshop/workshop-registry.store';

export type IntakeClientMode = 'nuevo' | 'existente';
export type IntakeBikeMode = 'nueva' | 'registrada';

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

  readonly clientMode = signal<IntakeClientMode>('nuevo');
  readonly bikeMode = signal<IntakeBikeMode>('nueva');
  readonly loadedExistingCustomerId = signal<string | null>(null);
  readonly selectedBikeId = signal<string | null>(null);
  readonly lookupMessage = signal<{ type: 'ok' | 'err'; text: string } | null>(null);
  readonly bikeSelectionError = signal<string | null>(null);

  readonly customerBikes = computed(() => {
    const customerId = this.loadedExistingCustomerId();
    if (!customerId) {
      return [] as readonly Bike[];
    }
    return this.registry.bikesForCustomer(customerId);
  });

  readonly selectedBike = computed(() => {
    const bikeId = this.selectedBikeId();
    if (!bikeId) {
      return null;
    }
    return this.customerBikes().find((b) => b.id === bikeId) ?? null;
  });

  readonly form = this.fb.group({
    customerNationalId: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
    customerFullName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.minLength(8)]],
    customerEmail: ['', [Validators.email]],
    customerNotes: [''],
    receivedByMechanicName: ['', [Validators.required, Validators.minLength(2)]],
    receptionObservations: ['', [Validators.required, Validators.minLength(8)]],
    bikeBrand: ['', [Validators.required, Validators.minLength(2)]],
    bikeModel: ['', [Validators.required, Validators.minLength(1)]],
    bikeSerial: [''],
    bikeCategory: this.fb.control<Bike['category']>('urbana', { validators: [Validators.required] }),
    processDescription: ['', [Validators.required, Validators.minLength(8)]],
  });

  submitting = false;
  errorMessage: string | null = null;

  setClientMode(mode: IntakeClientMode): void {
    if (this.clientMode() === mode) {
      return;
    }
    this.clientMode.set(mode);
    this.clearExistingLookup();
    this.syncCustomerFieldValidators();
  }

  setBikeMode(mode: IntakeBikeMode): void {
    if (this.bikeMode() === mode) {
      return;
    }
    this.bikeMode.set(mode);
    this.bikeSelectionError.set(null);
    if (mode === 'nueva') {
      this.selectedBikeId.set(null);
      this.clearBikeFields();
    } else {
      const bikes = this.customerBikes();
      if (bikes.length === 1) {
        this.selectExistingBike(bikes[0].id);
      } else {
        this.selectedBikeId.set(null);
        this.clearBikeFields();
      }
    }
    this.syncBikeFieldValidators();
  }

  lookupByNationalId(): void {
    this.lookupMessage.set(null);
    this.bikeSelectionError.set(null);
    this.errorMessage = null;
    const ctrl = this.form.controls.customerNationalId;
    ctrl.markAsTouched();
    if (ctrl.invalid) {
      return;
    }
    const found = this.registry.findCustomerByNationalId(ctrl.value);
    if (!found) {
      this.loadedExistingCustomerId.set(null);
      this.resetBikeIntakeState();
      this.clearCustomerContactFields();
      this.lookupMessage.set({
        type: 'err',
        text: 'No encontramos un cliente con esa cédula. Verifica el número o regístralo como cliente nuevo.',
      });
      return;
    }
    this.loadedExistingCustomerId.set(found.id);
    this.form.patchValue({
      customerFullName: found.fullName,
      customerPhone: found.phone,
      customerEmail: found.email === '(sin correo)' ? '' : found.email,
      customerNotes: found.notes ?? '',
    });

    const bikes = this.registry.bikesForCustomer(found.id);
    if (bikes.length > 0) {
      this.bikeMode.set('registrada');
      this.selectExistingBike(bikes[0].id);
      this.lookupMessage.set({
        type: 'ok',
        text: `Cliente encontrado: ${found.fullName}. Elige una bicicleta registrada o registra una nueva.`,
      });
    } else {
      this.bikeMode.set('nueva');
      this.resetBikeIntakeState();
      this.lookupMessage.set({
        type: 'ok',
        text: `Cliente encontrado: ${found.fullName}. Aún no tiene bicicletas; completa los datos de la nueva unidad.`,
      });
    }
    this.syncBikeFieldValidators();
  }

  selectExistingBike(bikeId: string): void {
    const bike = this.customerBikes().find((b) => b.id === bikeId);
    if (!bike) {
      return;
    }
    this.selectedBikeId.set(bikeId);
    this.bikeSelectionError.set(null);
    this.form.patchValue({
      bikeBrand: bike.brand,
      bikeModel: bike.model,
      bikeSerial: bike.serialNumber ?? '',
      bikeCategory: bike.category,
    });
    this.syncBikeFieldValidators();
  }

  clearExistingLookup(): void {
    this.loadedExistingCustomerId.set(null);
    this.lookupMessage.set(null);
    this.bikeSelectionError.set(null);
    this.resetBikeIntakeState();
    if (this.clientMode() === 'existente') {
      this.clearCustomerContactFields();
    }
    this.syncBikeFieldValidators();
  }

  isExistingCustomerLoaded(): boolean {
    return this.clientMode() === 'existente' && this.loadedExistingCustomerId() !== null;
  }

  canPickRegisteredBike(): boolean {
    return this.isExistingCustomerLoaded() && this.customerBikes().length > 0;
  }

  customerFieldsReadonly(): boolean {
    return this.clientMode() === 'existente';
  }

  categoryLabel(value: Bike['category']): string {
    return this.categories.find((c) => c.value === value)?.label ?? value;
  }

  submit(): void {
    this.errorMessage = null;
    this.bikeSelectionError.set(null);
    this.syncCustomerFieldValidators();
    this.syncBikeFieldValidators();

    if (this.clientMode() === 'existente' && !this.loadedExistingCustomerId()) {
      this.lookupMessage.set({
        type: 'err',
        text: 'Busca al cliente por cédula antes de registrar la entrada.',
      });
      this.form.controls.customerNationalId.markAsTouched();
      return;
    }

    if (this.bikeMode() === 'registrada' && this.isExistingCustomerLoaded() && !this.selectedBikeId()) {
      this.bikeSelectionError.set('Selecciona una bicicleta del listado o elige «Bicicleta nueva».');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const v = this.form.getRawValue();
      const existingCustomerId = this.loadedExistingCustomerId();
      const existingBikeId =
        this.bikeMode() === 'registrada' && existingCustomerId ? this.selectedBikeId() : null;

      const code = this.registry.registerIntake({
        customerNationalId: v.customerNationalId,
        ...(existingCustomerId ? { existingCustomerId } : {}),
        ...(existingBikeId ? { existingBikeId } : {}),
        customerFullName: v.customerFullName,
        customerPhone: v.customerPhone,
        customerEmail: v.customerEmail,
        customerNotes: v.customerNotes,
        receivedByMechanicName: v.receivedByMechanicName,
        receptionObservations: v.receptionObservations,
        bikeBrand: v.bikeBrand,
        bikeModel: v.bikeModel,
        bikeSerial: v.bikeSerial,
        bikeCategory: v.bikeCategory,
        processDescription: v.processDescription,
      });
      void this.router.navigate(['/app/ordenes'], { queryParams: { creada: code } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('cédula')) {
        this.errorMessage =
          'Ya hay un cliente registrado con esa cédula. Usa «Cliente existente» y búscalo por documento.';
      } else if (msg.includes('Bicicleta')) {
        this.errorMessage = 'La bicicleta seleccionada no es válida. Vuelve a elegirla en el formulario.';
      } else {
        this.errorMessage = 'No se pudo guardar el registro. Intenta de nuevo.';
      }
    } finally {
      this.submitting = false;
    }
  }

  private clearCustomerContactFields(): void {
    this.form.patchValue({
      customerFullName: '',
      customerPhone: '',
      customerEmail: '',
      customerNotes: '',
    });
  }

  private clearBikeFields(): void {
    this.form.patchValue({
      bikeBrand: '',
      bikeModel: '',
      bikeSerial: '',
      bikeCategory: 'urbana',
    });
  }

  private resetBikeIntakeState(): void {
    this.bikeMode.set('nueva');
    this.selectedBikeId.set(null);
    this.clearBikeFields();
  }

  private syncCustomerFieldValidators(): void {
    const mode = this.clientMode();
    const name = this.form.controls.customerFullName;
    const phone = this.form.controls.customerPhone;
    const email = this.form.controls.customerEmail;

    if (mode === 'nuevo') {
      name.setValidators([Validators.required, Validators.minLength(2)]);
      phone.setValidators([Validators.required, Validators.minLength(8)]);
      email.setValidators([Validators.email]);
    } else {
      name.clearValidators();
      phone.clearValidators();
      email.clearValidators();
    }
    name.updateValueAndValidity({ emitEvent: false });
    phone.updateValueAndValidity({ emitEvent: false });
    email.updateValueAndValidity({ emitEvent: false });
  }

  private syncBikeFieldValidators(): void {
    const useRegistered =
      this.bikeMode() === 'registrada' && this.isExistingCustomerLoaded() && this.selectedBikeId() !== null;
    const brand = this.form.controls.bikeBrand;
    const model = this.form.controls.bikeModel;
    const category = this.form.controls.bikeCategory;

    if (useRegistered) {
      brand.clearValidators();
      model.clearValidators();
      category.clearValidators();
    } else {
      brand.setValidators([Validators.required, Validators.minLength(2)]);
      model.setValidators([Validators.required, Validators.minLength(1)]);
      category.setValidators([Validators.required]);
    }
    brand.updateValueAndValidity({ emitEvent: false });
    model.updateValueAndValidity({ emitEvent: false });
    category.updateValueAndValidity({ emitEvent: false });
  }
}
