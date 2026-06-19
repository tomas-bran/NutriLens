import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider, shouldBypassAuth, useAuth } from './AuthContext';
import {
  clearAuthToken,
  getAuthToken,
  getProfile,
  loginWithGoogleIdToken,
  saveAuthToken,
} from './api';

jest.mock('./api', () => ({
  clearAuthToken: jest.fn(),
  getAuthToken: jest.fn(),
  getProfile: jest.fn(),
  loginWithGoogleIdToken: jest.fn(),
  saveAuthToken: jest.fn(),
}));

const profile = {
  user: { id: 'user-1', email: 'fede@nutrilens.local', name: 'Fede', image: null },
  prefs: { vegano: false, celiaco: false, lactosa: false, avisos: true },
  stats: { analizados: 4, riesgoAlto: 1, sinAlergenos: 2 },
};

function Consumer() {
  const auth = useAuth();
  return (
    <>
      <Text>{auth.isLoading ? 'loading' : 'ready'}</Text>
      <Text>{auth.isAuthenticated ? auth.user?.email : 'anon'}</Text>
      <Text>{auth.prefs?.avisos ? 'avisos-on' : 'avisos-off'}</Text>
      <TouchableOpacity onPress={() => auth.signInWithGoogleIdToken('id-token')}>
        <Text>login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={auth.signOut}>
        <Text>logout</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => auth.setLocalPrefs({ ...profile.prefs, vegano: true })}>
        <Text>set prefs</Text>
      </TouchableOpacity>
    </>
  );
}

describe('AuthContext', () => {
  const originalBypassFlag = process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS = 'false';
    (getAuthToken as jest.Mock).mockResolvedValue(null);
    (getProfile as jest.Mock).mockResolvedValue(profile);
    (loginWithGoogleIdToken as jest.Mock).mockResolvedValue({ token: 'mobile-token' });
    (saveAuthToken as jest.Mock).mockResolvedValue(undefined);
    (clearAuthToken as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS = originalBypassFlag;
  });

  it('habilita bypass de login para web, android e ios', () => {
    delete process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS;

    expect(shouldBypassAuth('web')).toBe(true);
    expect(shouldBypassAuth('android')).toBe(true);
    expect(shouldBypassAuth('ios')).toBe(true);
  });

  it('permite apagar el bypass de login por env', () => {
    process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS = 'false';

    expect(shouldBypassAuth('web')).toBe(false);
    expect(shouldBypassAuth('android')).toBe(false);
    expect(shouldBypassAuth('ios')).toBe(false);
  });

  it('arranca anonimo si no hay token guardado', async () => {
    const { getByText } = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText('ready')).toBeTruthy());
    expect(getByText('anon')).toBeTruthy();
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('carga perfil cuando existe token guardado', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('stored-token');

    const { getByText } = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText('fede@nutrilens.local')).toBeTruthy());
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('inicia sesion, guarda token y refresca perfil', async () => {
    const { getByText } = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText('ready')).toBeTruthy());
    fireEvent.press(getByText('login'));

    await waitFor(() => {
      expect(loginWithGoogleIdToken).toHaveBeenCalledWith('id-token');
      expect(saveAuthToken).toHaveBeenCalledWith('mobile-token');
      expect(getByText('fede@nutrilens.local')).toBeTruthy();
    });
  });

  it('cierra sesion y limpia estado local', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('stored-token');

    const { getByText } = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText('fede@nutrilens.local')).toBeTruthy());
    fireEvent.press(getByText('logout'));

    await waitFor(() => {
      expect(clearAuthToken).toHaveBeenCalled();
      expect(getByText('anon')).toBeTruthy();
    });
  });

  it('limpia token si falla la carga de perfil', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('stored-token');
    (getProfile as jest.Mock).mockRejectedValueOnce(new Error('perfil roto'));

    const { getByText } = await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText('ready')).toBeTruthy());
    expect(clearAuthToken).toHaveBeenCalled();
    expect(getByText('anon')).toBeTruthy();
  });
});
