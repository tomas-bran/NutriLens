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
      const errorText = await response.text();
      throw new Error(errorText || 'Error al subir la imagen');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in analyzeProduct:', error);
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
      const errorText = await response.text();
      throw new Error(errorText || 'Error al comunicarse con el chat');
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
      const errorText = await response.text();
      throw new Error(errorText || 'Error al obtener el historial');
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
      const errorText = await response.text();
      throw new Error(errorText || 'Error al obtener el detalle del producto');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getProductDetail:', error);
    throw error;
  }
};
