import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import AnalyzeScreen from '../../src/screens/AnalyzeScreen';
import { useCameraPermissions } from 'expo-camera';

// Mocks
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../src/services/api', () => ({
  analyzeProduct: jest.fn().mockResolvedValue({}),
  ApiError: class ApiError extends Error {},
}));

describe('AnalyzeScreen', () => {
  const mockRequestPermission = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('muestra la pantalla de permisos si no tiene acceso a la cámara', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      mockRequestPermission,
    ]);

    const { getByText } = await render(<AnalyzeScreen />);
    expect(getByText('Acceso a la cámara')).toBeTruthy();
  });

  it('renderiza la cámara si tiene los permisos', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, mockRequestPermission]);
    const { getByText } = await render(<AnalyzeScreen />);
    expect(getByText('Capturá los ingredientes')).toBeTruthy();
  });
});

describe('AnalyzeScreen — código de barras (opcional)', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (useCameraPermissions as jest.Mock).mockReturnValue([{ granted: true }, jest.fn()]);
    // Un pending expirado (createdAt truthy pero viejo) deja la pantalla en
    // preview sin disparar análisis.
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        photoUri: 'file:///tmp/producto.jpg',
        createdAt: Date.now() - 16 * 60 * 1000,
        attempts: 0,
      }),
    );
  });

  it('en preview ofrece sumar el código de barras y refleja cuando se agrega', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/ean.jpg' }],
    });

    await render(<AnalyzeScreen />);
    await waitFor(() => expect(screen.getByText(/Agregar código de barras/i)).toBeTruthy());

    fireEvent.press(screen.getByText(/Agregar código de barras/i));
    await waitFor(() => expect(screen.getByText(/Código de barras agregado/i)).toBeTruthy());
  });
});
