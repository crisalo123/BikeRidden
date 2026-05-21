import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from './auth.service';

export const adminRoleMatch: CanMatchFn = () => inject(AuthService).isAdmin();

export const mechanicRoleMatch: CanMatchFn = () => !inject(AuthService).isAdmin();
