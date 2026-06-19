import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from './api';

jest.mock('./api', () => ({
  getAuthToken: jest.fn(),
  getProfile: jest.fn(),
  saveAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  loginWithGoogleIdToken: jest.fn(),
}));

const PROFILE = {
  user: { id: 'u1', email: 'a@b.c', name: 'Ana', image: null },
  prefs: { vegano: false, celiaco: false, lactosa: false, avisos: true },
  stats: { analizados: 2, riesgoAlto: 1, sinAlergenos: 0 },
};

function Consumer({ useAuthHook = useAuth }: { useAuthHook?: typeof useAuth }) {
  const { user, isAuthenticated, isLoading, signInWithGoogleIdToken, signOut } = useAuthHook();
  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="auth">{String(isAuthenticated)}</Text>
      <Text testID="user">{user ? user.id : 'none'}</Text>
      <Pressable testID="signin" onPress={() => void signInWithGoogleIdToken('idt')} />
      <Pressable testID="signout" onPress={() => void signOut()} />
    </>
  );
}

const val = (id: string) => String(screen.getByTestId(id).props.children);

beforeEach(() => {
  jest.clearAllMocks();
  (api.getAuthToken as jest.Mock).mockResolvedValue(null);
  (api.getProfile as jest.Mock).mockResolvedValue(PROFILE);
  (api.saveAuthToken as jest.Mock).mockResolvedValue(undefined);
  (api.clearAuthToken as jest.Mock).mockResolvedValue(undefined);
});

describe('AuthProvider — flujo normal (sin bypass)', () => {
  it('sin token guardado queda deslogueado', async () => {
    (api.getAuthToken as jest.Mock).mockResolvedValue(null);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('loading')).toBe('false'));
    expect(val('auth')).toBe('false');
    expect(val('user')).toBe('none');
    expect(api.getProfile).not.toHaveBeenCalled();
  });

  it('con token válido carga el perfil y queda logueado', async () => {
    (api.getAuthToken as jest.Mock).mockResolvedValue('tok');
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('auth')).toBe('true'));
    expect(val('user')).toBe('u1');
  });

  it('si el perfil falla con token, limpia el token y queda deslogueado', async () => {
    (api.getAuthToken as jest.Mock).mockResolvedValue('tok');
    (api.getProfile as jest.Mock).mockRejectedValueOnce(new Error('401'));
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(api.clearAuthToken).toHaveBeenCalled());
    expect(val('auth')).toBe('false');
  });

  it('signInWithGoogleIdToken guarda el token y refresca el perfil', async () => {
    (api.getAuthToken as jest.Mock).mockResolvedValue(null);
    (api.loginWithGoogleIdToken as jest.Mock).mockResolvedValue({ token: 't', user: PROFILE.user });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('loading')).toBe('false'));
    fireEvent.press(screen.getByTestId('signin'));
    await waitFor(() => expect(val('auth')).toBe('true'));
    expect(api.loginWithGoogleIdToken).toHaveBeenCalledWith('idt');
    expect(api.saveAuthToken).toHaveBeenCalledWith('t');
    expect(val('user')).toBe('u1');
  });

  it('signOut limpia el token y desloguea', async () => {
    (api.getAuthToken as jest.Mock).mockResolvedValue('tok');
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('auth')).toBe('true'));
    fireEvent.press(screen.getByTestId('signout'));
    await waitFor(() => expect(val('auth')).toBe('false'));
    expect(api.clearAuthToken).toHaveBeenCalled();
  });
});

describe('AuthProvider — dev bypass', () => {
  const OLD = process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS = 'true';
  });
  afterEach(() => {
    process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS = OLD;
  });

  it('con bypass y perfil disponible usa ese perfil', async () => {
    (api.getProfile as jest.Mock).mockResolvedValue(PROFILE);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('auth')).toBe('true'));
    expect(val('user')).toBe('u1');
    // En bypass no se consulta el token guardado.
    expect(api.getAuthToken).not.toHaveBeenCalled();
  });

  it('con bypass y perfil caído cae al usuario local fijo', async () => {
    (api.getProfile as jest.Mock).mockRejectedValueOnce(new Error('no backend'));
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(val('user')).toBe('e2e-test-user'));
    expect(val('auth')).toBe('true');
  });
});

