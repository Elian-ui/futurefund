import { SetMetadata } from '@nestjs/common';

export type UserRole = 'investor' | 'support' | 'admin' | 'superadmin';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
