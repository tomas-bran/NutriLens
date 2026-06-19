import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rawAuth = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    auth: rawAuth,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => 'google-provider'),
}));

const ORIG_BYPASS = process.env.E2E_AUTH_BYPASS;
const ORIG_WEBSITE_HOSTNAME = process.env.WEBSITE_HOSTNAME;

describe('auth web bypass', () => {
  beforeEach(() => {
    vi.resetModules();
    rawAuth.mockReset();
    delete process.env.E2E_AUTH_BYPASS;
    delete process.env.WEBSITE_HOSTNAME;
  });

  afterEach(() => {
    if (ORIG_BYPASS === undefined) delete process.env.E2E_AUTH_BYPASS;
    else process.env.E2E_AUTH_BYPASS = ORIG_BYPASS;

    if (ORIG_WEBSITE_HOSTNAME === undefined) delete process.env.WEBSITE_HOSTNAME;
    else process.env.WEBSITE_HOSTNAME = ORIG_WEBSITE_HOSTNAME;
  });

  it('auth() devuelve usuario E2E cuando el bypass local esta activo', async () => {
    process.env.E2E_AUTH_BYPASS = 'true';
    const { auth } = await import('@/lib/auth');

    await expect(auth()).resolves.toMatchObject({
      user: {
        id: 'e2e-test-user',
        email: 'e2e@nutrilens.local',
      },
    });
    expect(rawAuth).not.toHaveBeenCalled();
  });

  it('auth() delega en Auth.js si el bypass esta desactivado', async () => {
    rawAuth.mockResolvedValueOnce({ user: { id: 'real-user' } });
    const { auth } = await import('@/lib/auth');

    await expect(auth()).resolves.toEqual({ user: { id: 'real-user' } });
    expect(rawAuth).toHaveBeenCalledTimes(1);
  });

  it('auth() no hace bypass en Azure aunque el flag exista', async () => {
    process.env.E2E_AUTH_BYPASS = 'true';
    process.env.WEBSITE_HOSTNAME = 'nutrilens.azurewebsites.net';
    rawAuth.mockResolvedValueOnce(null);
    const { auth } = await import('@/lib/auth');

    await expect(auth()).resolves.toBeNull();
    expect(rawAuth).toHaveBeenCalledTimes(1);
  });
});
