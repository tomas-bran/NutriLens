import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../services/AuthContext';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useIdTokenAuthRequest: jest.fn() }));
jest.mock('../services/AuthContext', () => ({ useAuth: jest.fn() }));

const signInWithGoogleIdToken = jest.fn().mockResolvedValue(undefined);
const promptAsync = jest.fn();

const WEB_ID_KEY = 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';

function mockGoogle(response: unknown, request: unknown = {}) {
  (Google.useIdTokenAuthRequest as jest.Mock).mockReturnValue([request, response, promptAsync]);
}

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ signInWithGoogleIdToken });
  delete process.env[WEB_ID_KEY];
  mockGoogle(null);
});

it('sin client IDs configurados avisa y deshabilita el botón', async () => {
  mockGoogle(null, null); // request null → botón deshabilitado
  await render(<LoginScreen />);
  expect(screen.getByText(/Falta configurar el client ID/i)).toBeTruthy();
});

it('con client ID, al tocar el botón dispara el prompt de Google', async () => {
  process.env[WEB_ID_KEY] = 'web-client-id.apps.googleusercontent.com';
  mockGoogle(null, { type: 'request' });
  await render(<LoginScreen />);
  fireEvent.press(screen.getByText('Continuar con Google'));
  expect(promptAsync).toHaveBeenCalled();
});

it('ante una respuesta exitosa intercambia el id_token por sesión', async () => {
  process.env[WEB_ID_KEY] = 'web-client-id.apps.googleusercontent.com';
  mockGoogle({ type: 'success', params: { id_token: 'google-token' } });
  await render(<LoginScreen />);
  await waitFor(() => expect(signInWithGoogleIdToken).toHaveBeenCalledWith('google-token'));
});

it('si Google no devuelve id_token muestra un error', async () => {
  process.env[WEB_ID_KEY] = 'web-client-id.apps.googleusercontent.com';
  mockGoogle({ type: 'success', params: {} });
  await render(<LoginScreen />);
  await waitFor(() => expect(screen.getByText(/no devolvió una sesión válida/i)).toBeTruthy());
  expect(signInWithGoogleIdToken).not.toHaveBeenCalled();
});
