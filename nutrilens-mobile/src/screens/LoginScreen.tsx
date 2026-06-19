import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors, typography } from '../theme/tokens';
import { useAuth } from '../services/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signInWithGoogleIdToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const clientIds = useMemo(
    () => ({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    }),
    [],
  );
  const hasClientId = Boolean(
    clientIds.iosClientId || clientIds.androidClientId || clientIds.webClientId,
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    ...clientIds,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) {
      setError('Google no devolvió una sesión válida.');
      return;
    }

    signInWithGoogleIdToken(idToken).catch((err: any) => {
      setError(err?.message || 'No pudimos iniciar sesión.');
    });
  }, [response, signInWithGoogleIdToken]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Ionicons name="leaf" size={34} color="#fff" />
        </View>
        <Text style={styles.title}>NutriLens</Text>
        <Text style={styles.subtitle}>
          Iniciá sesión para guardar tus análisis, conversaciones y preferencias.
        </Text>

        {!hasClientId && (
          <View style={styles.notice}>
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
            <Text style={styles.noticeText}>
              Falta configurar el client ID de Google para mobile.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.googleButton, (!request || !hasClientId) && styles.googleButtonDisabled]}
          onPress={() => {
            setError(null);
            promptAsync();
          }}
          disabled={!request || !hasClientId}
          activeOpacity={0.78}
        >
          {!request && hasClientId ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="logo-google" size={20} color={colors.text} />
          )}
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginBottom: 8 },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    marginBottom: 28,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: { color: colors.text, flex: 1, fontSize: typography.fontSize.sm },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, flex: 1, fontSize: typography.fontSize.sm },
  googleButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonDisabled: { opacity: 0.55 },
  googleButtonText: { color: colors.text, fontWeight: '800', fontSize: typography.fontSize.base },
});
