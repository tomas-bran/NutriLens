import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  saveAuthToken,
  getAuthToken,
  clearAuthToken,
  loginWithGoogleIdToken,
  getProfile,
  updatePrefs,
  analyzeProduct,
  sendChatMessage,
  getHistory,
  getProductDetail,
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
} from './api';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = mockFetch;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

/** Respuesta fetch OK. */
function ok(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** Respuesta fetch de error (con body JSON o texto crudo). */
function fail(body: unknown, status = 400, rawText?: string) {
  return {
    ok: false,
    status,
    json: async () => body,
    text: async () => (rawText !== undefined ? rawText : JSON.stringify(body)),
  } as unknown as Response;
}

const lastCall = () => mockFetch.mock.calls[mockFetch.mock.calls.length - 1];

describe('ApiError', () => {
  it('expone code/reason/details/status', () => {
    const err = new ApiError({
      message: 'boom',
      code: 'invalid_token',
      reason: 'sin token',
      details: { a: 1 },
      status: 401,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe('invalid_token');
    expect(err.reason).toBe('sin token');
    expect(err.details).toEqual({ a: 1 });
    expect(err.status).toBe(401);
  });
});

describe('token storage', () => {
  it('saveAuthToken guarda en AsyncStorage bajo la key de auth', async () => {
    await saveAuthToken('abc.def');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@nutrilens/auth-token', 'abc.def');
  });

  it('getAuthToken devuelve el token guardado', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('stored-token');
    await expect(getAuthToken()).resolves.toBe('stored-token');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@nutrilens/auth-token');
  });

  it('clearAuthToken borra el token', async () => {
    await clearAuthToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@nutrilens/auth-token');
  });
});

describe('authHeaders (vía requests autenticadas)', () => {
  it('agrega Authorization: Bearer cuando hay token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('tok-123');
    mockFetch.mockResolvedValueOnce(ok({ user: {}, prefs: {}, stats: {} }));
    await getProfile();
    const headers = lastCall()[1].headers;
    expect(headers.Authorization).toBe('Bearer tok-123');
    expect(headers.Accept).toBe('application/json');
  });

  it('no agrega Authorization cuando no hay token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce(ok({ user: {}, prefs: {}, stats: {} }));
    await getProfile();
    expect(lastCall()[1].headers.Authorization).toBeUndefined();
  });
});

describe('loginWithGoogleIdToken', () => {
  it('postea el idToken y devuelve token + user', async () => {
    mockFetch.mockResolvedValueOnce(ok({ token: 'mob-token', user: { id: 'u1', email: 'a@b.c' } }));
    const res = await loginWithGoogleIdToken('google-id-token');
    expect(res.token).toBe('mob-token');
    const [url, init] = lastCall();
    expect(url).toContain('/mobile/auth/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ idToken: 'google-id-token' });
  });

  it('lanza ApiError si Google falla', async () => {
    mockFetch.mockResolvedValueOnce(fail({ error: 'invalid_token', reason: 'no válido' }, 401));
    await expect(loginWithGoogleIdToken('x')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'invalid_token',
      reason: 'no válido',
      status: 401,
    });
  });
});

describe('getProfile', () => {
  it('devuelve el perfil en éxito', async () => {
    const profile = { user: { id: 'u1' }, prefs: {}, stats: {} };
    mockFetch.mockResolvedValueOnce(ok(profile));
    await expect(getProfile()).resolves.toEqual(profile);
    expect(lastCall()[0]).toContain('/me');
  });

  it('lanza ApiError en error', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'sin sesión' }, 401));
    await expect(getProfile()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('updatePrefs', () => {
  const prefs = { vegano: true, celiaco: false, lactosa: false, avisos: true };

  it('hace PATCH /me/prefs con el body', async () => {
    mockFetch.mockResolvedValueOnce(ok(prefs));
    await expect(updatePrefs(prefs)).resolves.toEqual(prefs);
    const [url, init] = lastCall();
    expect(url).toContain('/me/prefs');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual(prefs);
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('lanza ApiError en error', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'no' }, 500));
    await expect(updatePrefs(prefs)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('analyzeProduct', () => {
  it('postea FormData a /analyze y devuelve el resultado', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'p1', product: {} }));
    const res = await analyzeProduct('file:///tmp/etiqueta.jpg');
    expect(res).toEqual({ id: 'p1', product: {} });
    const [url, init] = lastCall();
    expect(url).toContain('/analyze');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('propaga ApiError image_not_supported sin loguear como error inesperado', async () => {
    mockFetch.mockResolvedValueOnce(fail({ error: 'image_not_supported', reason: 'no es comida' }, 422));
    await expect(analyzeProduct('file:///tmp/x.png')).rejects.toMatchObject({
      code: 'image_not_supported',
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('loguea y propaga otros errores', async () => {
    mockFetch.mockResolvedValueOnce(fail({ error: 'upload_failed', reason: 'falló' }, 500));
    await expect(analyzeProduct('file:///tmp/x.jpg')).rejects.toBeInstanceOf(ApiError);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('sendChatMessage', () => {
  it('postea la pregunta a /chat', async () => {
    mockFetch.mockResolvedValueOnce(ok({ answer: 'hola' }));
    await expect(sendChatMessage('¿cuál es mejor?')).resolves.toEqual({ answer: 'hola' });
    const [url, init] = lastCall();
    expect(url).toContain('/chat');
    expect(JSON.parse(init.body)).toEqual({ question: '¿cuál es mejor?' });
  });

  it('lanza ApiError en error', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'falló' }, 500));
    await expect(sendChatMessage('x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getHistory', () => {
  it('arma el query string con los filtros activos', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [] }));
    await getHistory({ q: 'leche', categoria: 'bebidas', riesgo: 'alto' });
    const url = lastCall()[0] as string;
    expect(url).toContain('/products?');
    expect(url).toContain('q=leche');
    expect(url).toContain('categoria=bebidas');
    expect(url).toContain('riesgo=alto');
  });

  it('sin filtros pega a /products sin query', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [] }));
    await getHistory();
    expect(lastCall()[0]).toMatch(/\/products$/);
  });

  it('lanza ApiError en error', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'no' }, 500));
    await expect(getHistory()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getProductDetail', () => {
  it('pega a /products/:id', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'p1', nombre: 'X' }));
    await expect(getProductDetail('p1')).resolves.toMatchObject({ id: 'p1' });
    expect(lastCall()[0]).toContain('/products/p1');
  });

  it('lanza ApiError en error', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'no existe' }, 404));
    await expect(getProductDetail('nope')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('conversations', () => {
  it('listConversations: GET /conversations', async () => {
    mockFetch.mockResolvedValueOnce(ok([{ id: 'c1' }]));
    await expect(listConversations()).resolves.toEqual([{ id: 'c1' }]);
    expect(lastCall()[0]).toMatch(/\/conversations$/);
  });

  it('createConversation: POST con messages', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'c1', title: 'Charla' }));
    const msgs = [{ role: 'user' as const, text: 'hola' }];
    await expect(createConversation(msgs)).resolves.toEqual({ id: 'c1', title: 'Charla' });
    const [url, init] = lastCall();
    expect(url).toMatch(/\/conversations$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ messages: msgs });
  });

  it('getConversation: GET /conversations/:id', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'c1', messages: [] }));
    await expect(getConversation('c1')).resolves.toMatchObject({ id: 'c1' });
    expect(lastCall()[0]).toContain('/conversations/c1');
  });

  it('updateConversation: PATCH /conversations/:id', async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: 'c1', title: 'Nueva' }));
    await updateConversation('c1', []);
    const [url, init] = lastCall();
    expect(url).toContain('/conversations/c1');
    expect(init.method).toBe('PATCH');
  });

  it('deleteConversation: DELETE ok devuelve true', async () => {
    mockFetch.mockResolvedValueOnce(ok({}, 200));
    await expect(deleteConversation('c1')).resolves.toBe(true);
    expect(lastCall()[1].method).toBe('DELETE');
  });

  it('deleteConversation: 204 (no content) también devuelve true', async () => {
    mockFetch.mockResolvedValueOnce(fail({}, 204));
    await expect(deleteConversation('c1')).resolves.toBe(true);
  });

  it('deleteConversation: error real lanza ApiError', async () => {
    mockFetch.mockResolvedValueOnce(fail({ reason: 'no' }, 500));
    await expect(deleteConversation('c1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('parseApiError (formas de error)', () => {
  it('body vacío → mensaje fallback con status', async () => {
    mockFetch.mockResolvedValueOnce(fail(null, 503, ''));
    await expect(getProfile()).rejects.toMatchObject({
      message: 'Error al obtener el perfil',
      status: 503,
    });
  });

  it('texto no-JSON → usa el texto como mensaje', async () => {
    mockFetch.mockResolvedValueOnce(fail(null, 500, 'Bad Gateway'));
    await expect(getProfile()).rejects.toMatchObject({ message: 'Bad Gateway', status: 500 });
  });
});
