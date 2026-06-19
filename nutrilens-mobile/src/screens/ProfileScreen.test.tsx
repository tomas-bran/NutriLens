import React from 'react';
import { Alert } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from './ProfileScreen';
import { updatePrefs } from '../services/api';
import { useAuth } from '../services/AuthContext';

jest.mock('../services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/api', () => ({ updatePrefs: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const mockNavigation = { navigate: jest.fn() };
const mockUseAuth = useAuth as jest.Mock;
const mockUpdatePrefs = updatePrefs as jest.Mock;

function makeAuth() {
  return {
    user: {
      id: 'user-1',
      name: 'Fede Pucci',
      email: 'fede@nutrilens.local',
      image: null,
    },
    prefs: { vegano: false, celiaco: true, lactosa: false, avisos: true },
    stats: {
      catalogoTotal: 12,
      analizados: 3,
      riesgoAlto: 1,
      sinAlergenos: 2,
      ultimoAnalizado: {
        id: 'prod-1',
        nombre: 'Galletitas',
        riesgo: 'alto',
        analyzedAt: '2026-06-17T20:00:00.000Z',
      },
    },
    signOut: jest.fn(),
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    setLocalPrefs: jest.fn(),
  };
}

describe('ProfileScreen', () => {
  let auth: ReturnType<typeof makeAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = makeAuth();
    mockUseAuth.mockReturnValue(auth);
    mockUpdatePrefs.mockResolvedValue(auth.prefs);
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra el perfil, estadisticas y accesos al catalogo', async () => {
    const { getByText } = await render(<ProfileScreen navigation={mockNavigation} />);

    expect(getByText('Fede Pucci')).toBeTruthy();
    expect(getByText('fede@nutrilens.local')).toBeTruthy();
    expect(getByText('Tus analisis')).toBeTruthy();
    expect(getByText('12 productos en el catalogo')).toBeTruthy();
    expect(getByText('Galletitas')).toBeTruthy();

    await fireEvent.press(getByText('Ver mis analisis'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Catálogo', { onlyMine: true });

    await fireEvent.press(getByText('Ver catalogo completo'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Catálogo', { onlyMine: false });
  });

  it('guarda preferencias con actualizacion optimista', async () => {
    const savedPrefs = { ...auth.prefs, vegano: true };
    mockUpdatePrefs.mockResolvedValueOnce(savedPrefs);

    const { getByText } = await render(<ProfileScreen navigation={mockNavigation} />);
    await fireEvent.press(getByText('Dieta vegana'));

    await waitFor(() => {
      expect(mockUpdatePrefs).toHaveBeenCalledWith(savedPrefs);
      expect(auth.setLocalPrefs).toHaveBeenCalledWith(savedPrefs);
    });
  });

  it('revierte preferencias y avisa si falla el guardado', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUpdatePrefs.mockRejectedValueOnce(new Error('Sin conexion'));

    const { getByText } = await render(<ProfileScreen navigation={mockNavigation} />);
    await fireEvent.press(getByText('Sin lactosa'));

    await waitFor(() => {
      expect(auth.setLocalPrefs).toHaveBeenCalledWith({ ...auth.prefs, lactosa: true });
      expect(auth.setLocalPrefs).toHaveBeenCalledWith(auth.prefs);
      expect(Alert.alert).toHaveBeenCalledWith('No pudimos guardar', 'Sin conexion');
    });
  });

  it('muestra loader cuando todavia no hay perfil cargado', async () => {
    mockUseAuth.mockReturnValue({ ...auth, user: null, prefs: null, stats: null });

    const { queryByText } = await render(<ProfileScreen navigation={mockNavigation} />);

    expect(queryByText('Mi cuenta')).toBeNull();
  });
});
