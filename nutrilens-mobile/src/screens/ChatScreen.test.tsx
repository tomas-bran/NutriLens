import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import ChatScreen from '../../src/screens/ChatScreen';
import { sendChatMessage } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mocks
jest.mock('../../src/services/api', () => ({
  sendChatMessage: jest.fn(),
  getProductDetail: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('muestra el mensaje inicial por defecto', async () => {
    const { getByText } = await render(<ChatScreen route={{}} />);
    expect(getByText(/Soy tu asistente nutricional/i)).toBeTruthy();
  });

  it('envía un mensaje y renderiza la respuesta del asistente', async () => {
    (sendChatMessage as jest.Mock).mockResolvedValueOnce({
      answer: 'Tenés 3 galletitas guardadas.',
      products: [{ id: '1', nombre: 'Galletitas Pepas', categoria: 'snacks', riesgo: 'alto' }],
      suggestions: ['Compará las galletitas'],
      fallback: null,
    });

    const { getByPlaceholderText, getByText, getByTestId } = await render(
      <ChatScreen route={{}} />,
    );

    const input = getByPlaceholderText('Preguntá lo que quieras...');

    await fireEvent.changeText(input, '¿Qué galletitas tengo?');

    // Usamos el testID para encontrar el botón y lo disparamos
    const sendButton = getByTestId('send-button');
    await fireEvent.press(sendButton);

    // Validamos que se llamó a la API y la UI se actualizó con la respuesta
    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledWith('¿Qué galletitas tengo?');
      expect(getByText('Tenés 3 galletitas guardadas.')).toBeTruthy();
      expect(getByText('Galletitas Pepas')).toBeTruthy();
      expect(getByText('Compará las galletitas')).toBeTruthy();
    });
  });

  it('muestra un indicador de escritura mientras espera la respuesta', async () => {
    let resolveResponse: (value: any) => void = () => {};
    (sendChatMessage as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve;
        }),
    );

    const { getByPlaceholderText, getByTestId, unmount } = await render(<ChatScreen route={{}} />);

    await fireEvent.changeText(getByPlaceholderText('Preguntá lo que quieras...'), 'hola');
    fireEvent.press(getByTestId('send-button'));

    await waitFor(() => {
      expect(getByTestId('chat-typing-indicator')).toBeTruthy();
    });

    unmount();
    resolveResponse({ answer: 'Hola, ¿en qué te ayudo?', products: [], suggestions: [] });
  });

  it('limpia links internos y separadores de tablas markdown', async () => {
    (sendChatMessage as jest.Mock).mockResolvedValueOnce({
      answer:
        'Producto: [Pepas](/catalogo/abc)\n\n| Nombre | Riesgo |\n| --- | --- |\n| **Pepas** | alto |',
      products: [],
      suggestions: [],
      fallback: null,
    });

    const { getByPlaceholderText, getByText, getByTestId, queryByText } = await render(
      <ChatScreen route={{}} />,
    );

    await fireEvent.changeText(getByPlaceholderText('Preguntá lo que quieras...'), 'pepas');
    await fireEvent.press(getByTestId('send-button'));

    await waitFor(() => {
      expect(getByText(/Producto: /)).toBeTruthy();
      expect(getByText('Pepas')).toBeTruthy();
      expect(queryByText(/\/catalogo\/abc/)).toBeNull();
      expect(queryByText('| --- | --- |')).toBeNull();
    });
  });
});
