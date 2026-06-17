import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Obtenemos automaticamente la IP de la PC que esta corriendo Expo
const debuggerHost = Constants.expoConfig?.hostUri;
const autoIP = debuggerHost ? debuggerHost.split(':')[0] : null;

// Si falla, usamos fallbacks: 10.0.2.2 (Android) o localhost (iOS)
const API_HOST = autoIP || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const localApiBaseUrl = `http://${API_HOST}:3000/api`;
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl || localApiBaseUrl;

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

export const analyzeProduct = async (photoUri: string) => {
  const formData = new FormData();

  const filename = photoUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: photoUri,
    name: filename,
    type,
  } as any);

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
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

export const sendChatMessage = async (question: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
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

export interface HistoryFilters {
  q?: string;
  categoria?: string;
  riesgo?: string;
  apto?: string;
  alergeno?: string;
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
      headers: { Accept: 'application/json' },
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
      headers: { Accept: 'application/json' },
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
