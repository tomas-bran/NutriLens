/**
 * Tests del helper de identidad (NL-202): getUserId / requireUserId sobre la
 * sesión de Auth.js mockeada, y el bypass de E2E gated por env.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth: authMock }));

import { getUserId, requireUserId, Unauthorized } from '@/lib/auth/current-user';

const ORIG_BYPASS = process.env.E2E_AUTH_BYPASS;

beforeEach(() => {
  authMock.mockReset();
  delete process.env.E2E_AUTH_BYPASS;
});

afterEach(() => {
  if (ORIG_BYPASS === undefined) delete process.env.E2E_AUTH_BYPASS;
  else process.env.E2E_AUTH_BYPASS = ORIG_BYPASS;
});

describe('getUserId', () => {
  it('devuelve el id de la sesión cuando hay usuario', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'google-sub-123' } });
    expect(await getUserId()).toBe('google-sub-123');
  });

  it('devuelve null cuando no hay sesión', async () => {
    authMock.mockResolvedValueOnce(null);
    expect(await getUserId()).toBeNull();
  });

  it('con E2E_AUTH_BYPASS devuelve el usuario de test sin tocar auth()', async () => {
    process.env.E2E_AUTH_BYPASS = 'true';
    expect(await getUserId()).toBe('e2e-test-user');
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe('requireUserId', () => {
  it('devuelve el id cuando hay sesión', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } });
    expect(await requireUserId()).toBe('u1');
  });

  it('lanza Unauthorized cuando no hay sesión', async () => {
    authMock.mockResolvedValueOnce(null);
    await expect(requireUserId()).rejects.toBeInstanceOf(Unauthorized);
  });
});
