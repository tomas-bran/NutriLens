import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../src/screens/HomeScreen';
import { useNavigation } from '@react-navigation/native';

// Mocks
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('HomeScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    // Silenciamos los timers por las animaciones en bucle (Animated.loop)
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renderiza correctamente el título y botones', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(/Entendé qué comés/i)).toBeTruthy();
    expect(getByText('Analizar producto')).toBeTruthy();
    expect(getByText('Preguntá al asistente')).toBeTruthy();
  });

  it('navega a "Analizar" al tocar el botón primario', async () => {
    const { getByText } = await render(<HomeScreen />);
    fireEvent.press(getByText('Analizar producto'));
    expect(mockNavigate).toHaveBeenCalledWith('Analizar');
  });

  it('navega a "Chat" al tocar el botón secundario', async () => {
    const { getByText } = await render(<HomeScreen />);
    fireEvent.press(getByText('Preguntá al asistente'));
    expect(mockNavigate).toHaveBeenCalledWith('Chat');
  });

  it('navega al "Catálogo" al tocar la tarjeta inferior', async () => {
    const { getByText } = await render(<HomeScreen />);
    fireEvent.press(getByText('Ver catálogo'));
    expect(mockNavigate).toHaveBeenCalledWith('Catálogo');
  });
});
