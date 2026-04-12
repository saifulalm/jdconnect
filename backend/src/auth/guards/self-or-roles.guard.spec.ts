import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SelfOrRolesGuard } from './self-or-roles.guard';
import { Role } from '../roles/role.enum';

function mockContext(user: any, idParam?: string, roles?: string[]): ExecutionContext {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  const guard = new SelfOrRolesGuard(reflector);
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user, params: { id: idParam } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
  return { guard, ctx } as any;
}

describe('SelfOrRolesGuard', () => {
  it('allows superaccess', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new SelfOrRolesGuard(reflector);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u', role: Role.SUPERACCESS }, params: { id: 'x' } }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows self', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new SelfOrRolesGuard(reflector);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', role: Role.CUSTOMER }, params: { id: 'u1' } }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows role match when not self', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new SelfOrRolesGuard(reflector);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', role: Role.ADMIN }, params: { id: 'u2' } }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when neither self nor allowed roles', () => {
    const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
    const guard = new SelfOrRolesGuard(reflector);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', role: Role.CUSTOMER }, params: { id: 'u2' } }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});

