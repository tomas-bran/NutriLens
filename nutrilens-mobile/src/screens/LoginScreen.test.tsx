import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import { useAuth } from '../services/AuthContext';

let mockRequest: unknown = { id: 'request' };
let mockResponse: any = null;
const mockPromptAsync = jest.fn();
const mockSignInWithGoogleIdToken = jest.fn();

jest.mock('../services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: jest.fn(() => [mockRequest, mockResponse, mockPromptAsync]),
}));

describe('LoginScreen', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { id: 'request' };
    mockResponse = null;
    process.env = { ...oldEnv, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client-id' };
    (useAuth as jest.Mock).mockReturnValue({
      signInWithGoogleIdToken: mockSignInWithGoogleIdToken,
    });
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('muestra aviso y deshabilita Google si falta client ID', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = '';

    const { getByText } = await render(<LoginScreen />);

    expect(getByText('Falta configurar el client ID de Google para mobile.')).toBeTruthy();
    fireEvent.press(getByText('Continuar con Google'));
    expect(mockPromptAsync).not.toHaveBeenCalled();
  });

  it('inicia sesion cuando Google devuelve id_token', async () => {
    mockResponse = { type: 'success', params: { id_token: 'google-token' } };
    mockSignInWithGoogleIdToken.mockResolvedValueOnce(undefined);

    await render(<LoginScreen />);

    await waitFor(() => {
      expect(mockSignInWithGoogleIdToken).toHaveBeenCalledWith('google-token');
    });
  });

  it('muestra error si Google no devuelve token', async () => {
    mockResponse = { type: 'success', params: {} };

    const { getByText } = await render(<LoginScreen />);

    await waitFor(() => {
      expect(getByText(/Google no devolvi/)).toBeTruthy();
    });
  });

  it('muestra error si falla el login mobile', async () => {
    mockResponse = { type: 'success', params: { id_token: 'google-token' } };
    mockSignInWithGoogleIdToken.mockRejectedValueOnce(new Error('Login roto'));

    const { getByText } = await render(<LoginScreen />);

    await waitFor(() => {
      expect(getByText('Login roto')).toBeTruthy();
    });
  });
});
