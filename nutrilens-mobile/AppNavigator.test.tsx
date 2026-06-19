import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from './src/navigation/AppNavigator';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('./src/services/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('<AppNavigator />', () => {
  it('debería renderizar la estructura base de navegación sin crashear', async () => {
    const screen = await render(<AppNavigator />);
    expect(screen).toBeDefined();
  });
});
