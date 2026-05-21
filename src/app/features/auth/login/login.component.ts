import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['demo@bikeridden.app', [Validators.required, Validators.email]],
    password: ['demo1234', [Validators.required, Validators.minLength(6)]],
  });

  submitting = false;
  errorMessage: string | null = null;
  readonly demoEmail = 'demo@bikeridden.app';

  submit(): void {
    this.errorMessage = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.submitting = false;
        const next = this.route.snapshot.queryParamMap.get('next');
        const home = this.auth.appHomePath();
        let safe = next && next.startsWith('/') && !next.startsWith('//') ? next : home;
        if (!this.auth.isAdmin() && (safe === '/app/panel' || safe.startsWith('/app/panel/'))) {
          safe = home;
        }
        void this.router.navigateByUrl(safe);
      },
      error: () => {
        this.submitting = false;
        this.errorMessage = 'Correo o contraseña incorrectos.';
      },
    });
  }
}
