import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  analyzeProduct,
  clearAuthToken,
  createConversation,
  deleteConversation,
  getAuthToken,
  getChatStarterSuggestions,
  getConversation,
  getHistory,
  getProfile,
  getProductDetail,
  getSimilarProducts,
  listConversations,
  loginWithGoogleIdToken,
  saveAuthToken,
  sendChatMessage,
  updateConversation,
  updatePrefs,
} from './api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;
(global as any).FormData = class MockFormData {
  _parts: Array<[string, unknown]> = [];

  append(key: string, value: unknown) {
    this._parts.push([key, value]);
  }
};

function jsonResponse(payload: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
  } as any;
}

function textResponse(payload: string, ok = false, status = 500) {
  return {
    ok,
    status,
    json: jest.fn(),
    text: jest.fn().mockResolvedValue(payload),
  } as any;
}

describe('mobile api client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-token');
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));
  });

  it('guarda, lee y limpia el token de auth', async () => {
    await saveAuthToken('abc');
    await getAuthToken();
    await clearAuthToken();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@nutrilens/auth-token', 'abc');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@nutrilens/auth-token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@nutrilens/auth-token');
  });

  it('loguea con Google y manda headers para ngrok', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ token: 'jwt', user: { id: '1' } }));

    const response = await loginWithGoogleIdToken('google-token');

    expect(response.token).toBe('jwt');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/mobile/auth/google'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }),
        body: JSON.stringify({ idToken: 'google-token' }),
      }),
    );
  });

  it('convierte errores JSON de API en ApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'invalid_token', reason: 'Token invalido' }, false, 401),
    );

    await expect(loginWithGoogleIdToken('bad-token')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'invalid_token',
      message: 'Token invalido',
      status: 401,
    });
  });

  it('convierte errores de texto plano en ApiError', async () => {
    mockFetch.mockResolvedValueOnce(textResponse('Servidor caido', false, 500));

    await expect(getProfile()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Servidor caido',
    });
  });

  it('trae perfil y preferencias con Authorization', async () => {
    const prefs = { vegano: true, celiaco: false, lactosa: false, avisos: true };
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ user: { id: '1' }, prefs, stats: {} }))
      .mockResolvedValueOnce(jsonResponse(prefs));

    await getProfile();
    await updatePrefs(prefs);

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer stored-token' }),
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/me/prefs'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }),
    );
  });

  it('sube analisis con foto principal y codigo de barras opcional', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'analysis-1' }));

    await analyzeProduct('file:///label.png', 'file:///barcode.jpg');

    const [, options] = mockFetch.mock.calls[0];
    expect(mockFetch.mock.calls[0][0]).toEqual(expect.stringContaining('/analyze'));
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual(
      expect.objectContaining({
        Accept: 'application/json',
        Authorization: 'Bearer stored-token',
      }),
    );
    expect(options.body._parts.map(([key]: [string]) => key)).toEqual(['file', 'barcodeImage']);
  });

  it('no loguea como error tecnico una imagen no soportada', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          error: 'image_not_supported',
          reason: 'La imagen no parece corresponder a una etiqueta alimentaria.',
        },
        false,
        400,
      ),
    );

    await expect(analyzeProduct('file:///x.jpg')).rejects.toMatchObject({
      code: 'image_not_supported',
    });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('consulta chat, sugerencias, catalogo y detalle', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ answer: 'Hola' }))
      .mockResolvedValueOnce(jsonResponse({ suggestions: ['Pregunta'] }))
      .mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'prod-1' }));

    expect(await sendChatMessage('Que puedo comer?')).toEqual({ answer: 'Hola' });
    expect(await getChatStarterSuggestions()).toEqual(['Pregunta']);
    expect(await getHistory({ q: 'pepas', filtro: 'mios', pageSize: 50 })).toEqual({
      items: [],
      total: 0,
    });
    expect(await getProductDetail('prod-1')).toEqual({ id: 'prod-1' });

    expect(mockFetch.mock.calls[2][0]).toEqual(
      expect.stringContaining('/products?q=pepas&filtro=mios&pageSize=50'),
    );
  });

  it('devuelve productos similares o lista vacia si falla', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ productos: [{ id: 'a' }] }))
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, false, 500));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await getSimilarProducts('prod-1', 3)).toEqual([{ id: 'a' }]);
    expect(await getSimilarProducts('prod-1', 3)).toEqual([]);
  });

  it('maneja conversaciones completas', async () => {
    const messages = [{ role: 'user' as const, text: 'hola' }];
    mockFetch
      .mockResolvedValueOnce(jsonResponse([{ id: 'c1' }]))
      .mockResolvedValueOnce(jsonResponse({ id: 'c1', title: 'hola' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'c1', messages }))
      .mockResolvedValueOnce(jsonResponse({ id: 'c1', title: 'nuevo' }))
      .mockResolvedValueOnce(jsonResponse({}, true, 204));

    expect(await listConversations()).toEqual([{ id: 'c1' }]);
    expect(await createConversation(messages)).toEqual({ id: 'c1', title: 'hola' });
    expect(await getConversation('c1')).toEqual({ id: 'c1', messages });
    expect(await updateConversation('c1', messages)).toEqual({ id: 'c1', title: 'nuevo' });
    expect(await deleteConversation('c1')).toBe(true);
  });
});
