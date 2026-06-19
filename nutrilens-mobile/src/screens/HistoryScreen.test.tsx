import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import HistoryScreen from '../../src/screens/HistoryScreen';
import { getHistory, getProductDetail } from '../../src/services/api';

// Mocks
jest.mock('../../src/services/api', () => ({
  getHistory: jest.fn(),
  getProductDetail: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('HistoryScreen', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el estado vacío si no hay catálogo', async () => {
    (getHistory as jest.Mock).mockResolvedValueOnce({ items: [] });

    const { getByText, getAllByText } = await render(<HistoryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Todavía no analizaste ningún producto')).toBeTruthy();
    });
  });

  it('muestra la lista de productos si el backend devuelve datos', async () => {
    const mockItems = [
      {
        id: '1',
        nombre: 'Galletitas Pepas',
        riesgo: 'alto',
        categoria: 'snacks',
        createdAt: new Date().toISOString(),
      },
    ];
    (getHistory as jest.Mock).mockResolvedValueOnce({ items: mockItems });
    (getProductDetail as jest.Mock).mockResolvedValueOnce({
      id: '1',
      nombre: 'Galletitas Pepas',
      categoria: 'snacks',
      riesgo: 'alto',
      alergenos: ['gluten'],
      sellos: [],
      ingredientes: ['harina de trigo'],
      reglasAplicadas: ['contiene_gluten'],
      confidence: 0.9,
      imagenUrl: '',
      createdAt: mockItems[0].createdAt,
      explanation: 'Detalle real desde el backend.',
      pipelineTrace: [],
    });

    const { getByText, getAllByText } = await render(<HistoryScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Galletitas Pepas')).toBeTruthy();
      expect(getAllByText('Alto').length).toBeGreaterThan(0);
    });

    // Probamos tocar un elemento de la lista
    await fireEvent.press(getByText('Galletitas Pepas'));

    await waitFor(() => {
      expect(getProductDetail).toHaveBeenCalledWith('1');
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'Result',
        expect.objectContaining({
          data: expect.objectContaining({
            product: expect.objectContaining({
              producto: 'Galletitas Pepas',
              ingredientes_detectados: ['harina de trigo'],
            }),
          }),
        }),
      );
    });
  });

  it('envía filtros al endpoint de catálogo', async () => {
    (getHistory as jest.Mock).mockResolvedValue({ items: [] });

    const { getByTestId, getByText } = await render(<HistoryScreen navigation={mockNavigation} />);

    await fireEvent.changeText(getByTestId('history-search-input'), 'pepas');
    await fireEvent.press(getByText('Alto'));

    await waitFor(() => {
      expect(getHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          q: 'pepas',
          riesgo: 'alto',
        }),
      );
    });
  });

  it('aplica el alcance Analizados por vos cuando llega desde perfil', async () => {
    (getHistory as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await render(
      <HistoryScreen navigation={mockNavigation} route={{ params: { onlyMine: true } }} />,
    );

    await waitFor(() => {
      expect(getHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filtro: 'mios',
          pageSize: 50,
        }),
      );
    });
  });

  it('el toggle Todos / Analizados por vos cambia el filtro mios', async () => {
    (getHistory as jest.Mock).mockResolvedValue({ items: [] });

    const { getByText } = await render(<HistoryScreen navigation={mockNavigation} />);

    await fireEvent.press(getByText('Analizados por vos'));
    await waitFor(() =>
      expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ filtro: 'mios' })),
    );

    await fireEvent.press(getByText('Todos'));
    await waitFor(() =>
      expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ filtro: undefined })),
    );
  });
});
