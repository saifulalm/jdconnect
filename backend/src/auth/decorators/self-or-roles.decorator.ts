import { SetMetadata } from '@nestjs/common';

export const SELF_OR_ROLES_KEY = 'self_or_roles';

export const SelfOrRoles = (...roles: string[]) => SetMetadata(SELF_OR_ROLES_KEY, roles);

