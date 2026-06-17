import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
