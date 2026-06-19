import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from './ProfileScreen';
import { useAuth } from '../services/AuthContext';
import { updatePrefs } from '../services/api';
import { DOCS_URL } from '../constants';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/api', () => ({ updatePrefs: jest.fn() }));

const PREFS = { vegano: false, celiaco: false, lactosa: false, avisos: true };
const baseAuth = () => ({
  user: { id: 'u1', email: 'ana@nutri.app', name: 'Ana Test', image: null },
  prefs: { ...PREFS },
  stats: { analizados: 5, riesgoAlto: 2, sinAlergenos: 1 },
  signOut: jest.fn(),
  refreshProfile: jest.fn().mockResolvedValue(undefined),
  setLocalPrefs: jest.fn(),
});

const nav = { navigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue(baseAuth());
  (updatePrefs as jest.Mock).mockResolvedValue({ ...PREFS });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

it('muestra nombre, email, stats y preferencias', async () => {
  await render(<ProfileScreen navigation={nav} />);
  expect(screen.getByText('Ana Test')).toBeTruthy();
  expect(screen.getByText('ana@nutri.app')).toBeTruthy();
  expect(screen.getByText('5')).toBeTruthy();
  expect(screen.getByText('Dieta vegana')).toBeTruthy();
  expect(screen.getByText('Sin gluten')).toBeTruthy();
});

it('el link de Documentación abre el sitio de docs', async () => {
  await render(<ProfileScreen navigation={nav} />);
  fireEvent.press(screen.getByRole('link'));
  expect(Linking.openURL).toHaveBeenCalledWith(DOCS_URL);
});

it('"Ver catálogo" navega al catálogo', async () => {
  await render(<ProfileScreen navigation={nav} />);
  fireEvent.press(screen.getByText('Ver catálogo'));
  expect(nav.navigate).toHaveBeenCalledWith('Catálogo');
});

it('"Cerrar sesión" llama a signOut', async () => {
  const auth = baseAuth();
  (useAuth as jest.Mock).mockReturnValue(auth);
  await render(<ProfileScreen navigation={nav} />);
  fireEvent.press(screen.getByText('Cerrar sesión'));
  expect(auth.signOut).toHaveBeenCalled();
});

it('togglear una preferencia la guarda en el backend', async () => {
  const auth = baseAuth();
  (useAuth as jest.Mock).mockReturnValue(auth);
  await render(<ProfileScreen navigation={nav} />);
  const veganoSwitch = screen.getAllByRole('switch')[0];
  fireEvent(veganoSwitch, 'valueChange', true);
  expect(auth.setLocalPrefs).toHaveBeenCalledWith({ ...PREFS, vegano: true });
  await waitFor(() => expect(updatePrefs).toHaveBeenCalledWith({ ...PREFS, vegano: true }));
});

it('muestra el loader mientras no hay datos del perfil', async () => {
  (useAuth as jest.Mock).mockReturnValue({
    user: null,
    prefs: null,
    stats: null,
    signOut: jest.fn(),
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    setLocalPrefs: jest.fn(),
  });
  await render(<ProfileScreen navigation={nav} />);
  expect(screen.queryByText('Mi cuenta')).toBeNull();
});
