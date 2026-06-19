import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ResultScreen from '../../src/screens/ResultScreen';
import { getProductDetail, getSimilarProducts } from '../services/api';

jest.mock('../../src/services/api', () => ({
  getProductDetail: jest.fn(),
  getSimilarProducts: jest.fn().mockResolvedValue([]),
}));

// Mockeamos la navegación de React Navigation
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('ResultScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renderiza correctamente los datos de un producto normal', async () => {
    const mockRoute = {
      params: {
        data: {
          product: {
            producto: 'Beldent Menta',
            confidence: 0.95,
            riesgo: 'low',
            ingredientes_detectados: ['Goma base', 'Edulcorante'],
            sellos: ['exceso en azúcares'],
            apto_vegano: true,
            apto_celiaco: true,
            apto_sin_lactosa: true,
          },
          rules: { reglas_aplicadas: ['contiene_gluten'], flags: [] },
          explanation: 'Es un chicle sin azúcar.',
        },
      },
    };

    const { getByText } = await render(
      <ResultScreen route={mockRoute} navigation={mockNavigation} />,
    );

    // Validamos que el nombre y el nivel de riesgo aparezcan en pantalla
    expect(getByText('Beldent Menta')).toBeTruthy();
    expect(getByText('Bajo Riesgo')).toBeTruthy();
    // Validamos que se extrajeron los ingredientes
    expect(getByText('Goma base, Edulcorante')).toBeTruthy();
    expect(getByText('Vegano')).toBeTruthy();
    expect(getByText('Apto celíaco')).toBeTruthy();
    expect(getByText('Sellos detectados')).toBeTruthy();
    expect(getByText('Reglas aplicadas')).toBeTruthy();
    expect(getByText('Contiene gluten')).toBeTruthy();
  });

  it('muestra la alerta de "Confianza baja" cuando confidence es < 0.6 (US-20)', async () => {
    const mockRoute = {
      params: {
        data: {
          product: {
            producto: 'Producto Borroso',
            confidence: 0.45,
          },
          rules: { flags: [] },
        },
      },
    };

    const { getByText } = await render(
      <ResultScreen route={mockRoute} navigation={mockNavigation} />,
    );

    // Validamos que nuestra regla de negocio para atajar alucinaciones se dibuje
    expect(getByText('Confianza baja')).toBeTruthy();
    expect(
      getByText('El análisis puede tener errores. Probá con una foto más nítida.'),
    ).toBeTruthy();
  });

  it('muestra productos similares y abre su detalle', async () => {
    (getSimilarProducts as jest.Mock).mockResolvedValueOnce([
      {
        id: 'similar-1',
        nombre: 'Cereal integral',
        riesgo: 'bajo',
        imagenUrl: '',
      },
    ]);
    (getProductDetail as jest.Mock).mockResolvedValueOnce({
      id: 'similar-1',
      nombre: 'Cereal integral',
      categoria: 'cereales',
      riesgo: 'bajo',
      alergenos: [],
      sellos: [],
      ingredientes: ['avena'],
      reglasAplicadas: [],
      confidence: 0.95,
      imagenUrl: '',
      createdAt: new Date().toISOString(),
      explanation: 'Buena alternativa.',
      pipelineTrace: [],
      offEnrichment: null,
    });

    const route = {
      params: {
        data: {
          id: 'prod-1',
          product: {
            producto: 'Galletitas',
            confidence: 0.9,
            riesgo: 'alto',
            ingredientes_detectados: ['harina'],
          },
          rules: { reglas_aplicadas: [] },
        },
      },
    };

    const { getByText } = await render(<ResultScreen route={route} navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Productos similares del catalogo')).toBeTruthy();
      expect(getByText('Cereal integral')).toBeTruthy();
    });

    await fireEvent.press(getByText('Cereal integral'));

    await waitFor(() => {
      expect(getProductDetail).toHaveBeenCalledWith('similar-1');
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'Result',
        expect.objectContaining({
          data: expect.objectContaining({
            product: expect.objectContaining({ producto: 'Cereal integral' }),
          }),
        }),
      );
    });
  });
});
