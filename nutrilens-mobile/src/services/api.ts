import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Obtenemos automaticamente la IP de la PC que esta corriendo Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const autoIP = debuggerHost ? debuggerHost.split(':')[0] : null;

// Si falla, usamos fallbacks: 10.0.2.2 (Android) o localhost (iOS)
const API_HOST = autoIP || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const localApiBaseUrl = `http://${API_HOST}:3000/api`;
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl || localApiBaseUrl;
const AUTH_TOKEN_KEY = '@nutrilens/auth-token';

export class ApiError extends Error {
  code?: string;
  reason?: string;
  details?: any;
  status?: number;

  constructor({
    message,
    code,
    reason,
    details,
    status,
  }: {
    message: string;
    code?: string;
    reason?: string;
    details?: any;
    status?: number;
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.reason = reason;
    this.details = details;
    this.status = status;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export interface DietPrefs {
  vegano: boolean;
  celiaco: boolean;
  lactosa: boolean;
  avisos: boolean;
}

export interface ProfilePayload {
  user: AuthUser;
  prefs: DietPrefs;
  stats: {
    catalogoTotal?: number;
    analizados: number;
    riesgoAlto: number;
    sinAlergenos: number;
    ultimoAnalizado?: {
      id: string;
      nombre: string;
      riesgo: string;
      analyzedAt: string;
    } | null;
  };
}

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: any[];
  fallback?: any;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: StoredChatMessage[];
}

export const saveAuthToken = async (token: string) => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = () => AsyncStorage.getItem(AUTH_TOKEN_KEY);

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

export const loginWithGoogleIdToken = async (idToken: string) => {
  const response = await fetch(`${API_BASE_URL}/mobile/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'No se pudo iniciar sesión con Google');
  }

  return (await response.json()) as { token: string; user: AuthUser };
};

export const getProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al obtener el perfil');
  }

  return (await response.json()) as ProfilePayload;
};

export const updatePrefs = async (prefs: DietPrefs) => {
  const response = await fetch(`${API_BASE_URL}/me/prefs`, {
    method: 'PATCH',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(prefs),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al guardar preferencias');
  }

  return (await response.json()) as DietPrefs;
};

export const analyzeProduct = async (photoUri: string, barcodeUri?: string | null) => {
  const formData = new FormData();

  formData.append('file', toMultipartImage(photoUri, 'photo.jpg') as any);
  if (barcodeUri) {
    formData.append('barcodeImage', toMultipartImage(barcodeUri, 'barcode.jpg') as any);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Error al subir la imagen');
    }

    return await response.json();
  } catch (error) {
    if (!(error instanceof ApiError && error.code === 'image_not_supported')) {
      console.error('Error in analyzeProduct:', error);
    }
    throw error;
  }
};

function toMultipartImage(uri: string, fallbackName: string) {
  const filename = uri.split('/').pop() || fallbackName;
  const match = /\.(\w+)$/.exec(filename);
  const extension = match?.[1]?.toLowerCase();
  const type = extension === 'png' ? 'image/png' : 'image/jpeg';
  return {
    uri,
    name: filename,
    type,
  };
}

export const sendChatMessage = async (question: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Error al comunicarse con el chat');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
};

export const getChatStarterSuggestions = async () => {
  const response = await fetch(`${API_BASE_URL}/chat/suggestions`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al obtener sugerencias');
  }

  const payload = (await response.json()) as { suggestions?: string[] | null };
  return Array.isArray(payload.suggestions) ? payload.suggestions : null;
};

export interface HistoryFilters {
  q?: string;
  categoria?: string;
  riesgo?: string;
  apto?: string;
  alergeno?: string;
  filtro?: 'mios';
  page?: number;
  pageSize?: number;
  sort?: 'createdAt:desc' | 'nombre:asc';
}

export const getHistory = async (filters: HistoryFilters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/products${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Error al obtener el catálogo');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getHistory:', error);
    throw error;
  }
};

export const getProductDetail = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'GET',
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Error al obtener el detalle del producto');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getProductDetail:', error);
    throw error;
  }
};

export const getSimilarProducts = async (id: string, k = 4) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}/similar?k=${k}`, {
      method: 'GET',
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw await parseApiError(response, 'Error al obtener productos similares');
    }

    const payload = (await response.json()) as { productos?: any[] | null };
    return Array.isArray(payload.productos) ? payload.productos : [];
  } catch (error) {
    console.error('Error in getSimilarProducts:', error);
    return [];
  }
};

export const listConversations = async () => {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al obtener conversaciones');
  }

  return (await response.json()) as ConversationSummary[];
};

export const createConversation = async (messages: StoredChatMessage[]) => {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al crear la conversación');
  }

  return (await response.json()) as { id: string; title: string };
};

export const getConversation = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: 'GET',
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al abrir la conversación');
  }

  return (await response.json()) as ConversationDetail;
};

export const updateConversation = async (id: string, messages: StoredChatMessage[]) => {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: 'PATCH',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw await parseApiError(response, 'Error al guardar la conversación');
  }

  return (await response.json()) as { id: string; title: string };
};

export const deleteConversation = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    throw await parseApiError(response, 'Error al eliminar la conversación');
  }

  return true;
};

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getAuthToken();
  return {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const errorText = await response.text();
  if (!errorText) {
    return new ApiError({ message: fallbackMessage, status: response.status });
  }

  try {
    const payload = JSON.parse(errorText);
    const reason = typeof payload.reason === 'string' ? payload.reason : undefined;
    const code = typeof payload.error === 'string' ? payload.error : undefined;

    return new ApiError({
      code,
      reason,
      details: payload.details,
      status: response.status,
      message: reason || code || fallbackMessage,
    });
  } catch (error) {
    return new ApiError({ message: errorText || fallbackMessage, status: response.status });
  }
}
