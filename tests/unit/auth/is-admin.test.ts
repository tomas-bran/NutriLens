import { afterEach, describe, expect, it, vi } from 'vitest';

// is-admin importa la cadena de auth (next-auth) — la stubbeamos.
const getUserId = vi.fn();
const auth = vi.fn();
vi.mock('@/lib/auth/current-user', () => ({ getUserId: () => getUserId() }));
vi.mock('@/lib/auth', () => ({ auth: () => auth() }));

import { adminEmails, isAdminEmail, isCurrentUserAdmin } from '@/lib/auth/is-admin';

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_EMAILS;
});

describe('is-admin (NL-204)', () => {
  it('isAdminEmail matchea el default y es case-insensitive', () => {
    expect(isAdminEmail('federicoamartucci@gmail.com')).toBe(true);
    expect(isAdminEmail('FedericoAMartucci@Gmail.com')).toBe(true);
    expect(isAdminEmail('otro@gmail.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('adminEmails respeta ADMIN_EMAILS (coma-separado, normalizado)', () => {
    process.env.ADMIN_EMAILS = 'A@x.com, B@Y.com ';
    expect(adminEmails()).toEqual(['a@x.com', 'b@y.com']);
  });

  it('isCurrentUserAdmin: sin sesión (getUserId null) => false', async () => {
    getUserId.mockResolvedValue(null);
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(auth).not.toHaveBeenCalled();
  });

  it('isCurrentUserAdmin: sesión con email admin => true', async () => {
    getUserId.mockResolvedValue('uid');
    auth.mockResolvedValue({ user: { email: 'federicoamartucci@gmail.com' } });
    expect(await isCurrentUserAdmin()).toBe(true);
  });

  it('isCurrentUserAdmin: sesión con email no-admin => false', async () => {
    getUserId.mockResolvedValue('uid');
    auth.mockResolvedValue({ user: { email: 'nope@gmail.com' } });
    expect(await isCurrentUserAdmin()).toBe(false);
  });
});
