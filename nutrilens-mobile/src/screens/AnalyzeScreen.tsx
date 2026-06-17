import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme/tokens';
import { ApiError, analyzeProduct } from '../services/api';

interface PendingAnalysisRequest {
  photoUri: string;
  createdAt: number;
  attempts: number;
}

const PENDING_ANALYSIS_KEY = '@nutrilens/pending-analysis-request';
const PENDING_ANALYSIS_TTL_MS = 15 * 60 * 1000;
const MAX_PENDING_ANALYSIS_ATTEMPTS = 3;
const ANALYSIS_STEPS = [
  {
    icon: 'cloud-upload-outline',
    title: 'Subiendo imagen',
    detail: 'Preparando la foto para el analisis',
  },
  {
    icon: 'document-text-outline',
    title: 'Leyendo etiqueta',
    detail: 'Buscando ingredientes y sellos visibles',
  },
  {
    icon: 'sparkles-outline',
    title: 'Interpretando con IA',
    detail: 'Ordenando la informacion detectada',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Aplicando reglas',
    detail: 'Revisando alergenos, aptitudes y riesgo',
  },
  {
    icon: 'save-outline',
    title: 'Guardando resultado',
    detail: 'Dejando el producto listo en tu catalogo',
  },
];

export default function AnalyzeScreen({ navigation }: any) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [galleryPermission, setGalleryPermission] =
    useState<ImagePicker.MediaLibraryPermissionResponse | null>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const isAnalyzingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnalyzing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }

    pulseAnim.setValue(1);
  }, [isAnalyzing, pulseAnim]);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStepIndex(0);
      return;
    }

    setAnalysisStepIndex(0);
    const stepTimer = setInterval(() => {
      setAnalysisStepIndex((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1));
    }, 2200);

    return () => clearInterval(stepTimer);
  }, [isAnalyzing]);

  useEffect(() => {
    recoverPendingAnalysis();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        recoverPendingAnalysis();
      }
    });

    return () => subscription.remove();
  }, []);

  const setAnalysisLoading = (value: boolean) => {
    isAnalyzingRef.current = value;
    setIsAnalyzing(value);
  };

  const requestGalleryPermission = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setGalleryPermission(perm);
    return perm;
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (photo) setPhotoUri(photo.uri);
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar la foto.');
    }
  };

  const handlePickGallery = async () => {
    const perm = galleryPermission || (await requestGalleryPermission());
    if (!perm.granted) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const resetPhoto = () => {
    setPhotoUri(null);
  };

  const handleAnalysis = () => {
    if (!photoUri) return;
    runAnalysisRequest(photoUri, 0, 'new');
  };

  async function runAnalysisRequest(imageUri: string, attempts: number, mode: 'new' | 'retry') {
    if (isAnalyzingRef.current) return;

    const pending: PendingAnalysisRequest = {
      photoUri: imageUri,
      createdAt: Date.now(),
      attempts,
    };

    await AsyncStorage.setItem(PENDING_ANALYSIS_KEY, JSON.stringify(pending));
    setPhotoUri(imageUri);
    setAnalysisLoading(true);

    try {
      const data = await analyzeProduct(imageUri);
      await AsyncStorage.removeItem(PENDING_ANALYSIS_KEY);
      setAnalysisLoading(false);
      navigation.navigate('Result', { data, photoUri: imageUri });
      resetPhoto();
    } catch (err: any) {
      const isUnsupportedImage = err instanceof ApiError && err.code === 'image_not_supported';
      const nextAttempts = attempts + 1;

      if (isUnsupportedImage || nextAttempts >= MAX_PENDING_ANALYSIS_ATTEMPTS) {
        await AsyncStorage.removeItem(PENDING_ANALYSIS_KEY);
      } else {
        await AsyncStorage.setItem(
          PENDING_ANALYSIS_KEY,
          JSON.stringify({ ...pending, attempts: nextAttempts }),
        );
      }

      setAnalysisLoading(false);

      if (isUnsupportedImage) {
        Alert.alert(
          'No parece una etiqueta alimentaria',
          'Probá con una foto clara del envase, la tabla nutricional o la lista de ingredientes.',
        );
        return;
      }

      if (mode === 'new' || nextAttempts >= MAX_PENDING_ANALYSIS_ATTEMPTS) {
        Alert.alert('No pudimos analizar la imagen', formatAnalysisError(err));
      }
      console.error(err);
    }
  }

  async function recoverPendingAnalysis() {
    if (isAnalyzingRef.current) return;

    const rawPending = await AsyncStorage.getItem(PENDING_ANALYSIS_KEY);
    if (!rawPending) return;

    try {
      const pending = JSON.parse(rawPending) as PendingAnalysisRequest;
      if (!pending.photoUri || !pending.createdAt) {
        await AsyncStorage.removeItem(PENDING_ANALYSIS_KEY);
        return;
      }

      if (Date.now() - pending.createdAt > PENDING_ANALYSIS_TTL_MS) {
        await AsyncStorage.removeItem(PENDING_ANALYSIS_KEY);
        setPhotoUri(pending.photoUri);
        return;
      }

      setPhotoUri(pending.photoUri);
      runAnalysisRequest(pending.photoUri, pending.attempts || 0, 'retry');
    } catch (error) {
      await AsyncStorage.removeItem(PENDING_ANALYSIS_KEY);
    }
  }

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="camera-outline"
          size={64}
          color={colors.primary}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.permissionTitle}>Acceso a la cámara</Text>
        <Text style={styles.permissionText}>
          NutriLens necesita usar tu cámara para poder escanear los productos y sus ingredientes.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestCameraPermission}>
          <Text style={styles.primaryButtonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photoUri) {
    const activeAnalysisStep = ANALYSIS_STEPS[analysisStepIndex];

    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />

        {isAnalyzing ? (
          <LinearGradient
            colors={['rgba(31,142,96,0.85)', 'rgba(46,182,125,0.85)']}
            style={styles.overlayCentered}
          >
            <Animated.View
              style={[styles.analyzingIconContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              <Ionicons name={activeAnalysisStep.icon as any} size={32} color="#fff" />
            </Animated.View>
            <Text style={styles.analyzingText}>{activeAnalysisStep.title}</Text>
            <Text style={styles.analyzingSubtext}>{activeAnalysisStep.detail}</Text>

            <View style={styles.analysisProgressTrack}>
              <View
                style={[
                  styles.analysisProgressFill,
                  { width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` },
                ]}
              />
            </View>

            <View style={styles.analysisSteps}>
              {ANALYSIS_STEPS.map((step, index) => {
                const isActive = index === analysisStepIndex;
                const isDone = index < analysisStepIndex;
                return (
                  <View
                    key={step.title}
                    style={[styles.analysisStepRow, isActive && styles.analysisStepRowActive]}
                  >
                    <View
                      style={[
                        styles.analysisStepDot,
                        (isActive || isDone) && styles.analysisStepDotActive,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color={colors.primaryStrong} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.analysisStepText,
                        (isActive || isDone) && styles.analysisStepTextActive,
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomControls}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetPhoto}>
              <Ionicons name="refresh" size={22} color="#fff" />
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalysis}>
              <Ionicons name="color-wand" size={22} color={colors.primaryStrong || '#1f8e60'} />
              <Text style={styles.analyzeButtonText}>Analizar foto</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.cameraHeader}>
          <Text style={styles.headerTitle}>Capturá los ingredientes</Text>
          <Text style={styles.headerSubtitle}>
            Intenta que el texto sea legible y este enfocado
          </Text>
        </LinearGradient>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cameraBottom}>
          <TouchableOpacity style={styles.galleryButton} onPress={handlePickGallery}>
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.galleryText}>Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButtonOuter} onPress={handleTakePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={styles.placeholderSpace} />
        </LinearGradient>
      </CameraView>
    </View>
  );
}

function formatAnalysisError(error: any) {
  if (error instanceof ApiError && error.reason) {
    return error.reason;
  }

  return error?.message || 'Hubo un problema al analizar el producto. Revisá la conexión.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1f2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary || '#2eb67d',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  camera: { flex: 1, justifyContent: 'space-between' },
  cameraHeader: { paddingTop: 60, paddingBottom: 40, alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  cameraBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 40,
  },
  galleryButton: { alignItems: 'center', justifyContent: 'center', width: 70 },
  galleryText: { color: '#fff', fontSize: 12, marginTop: 6, fontWeight: '600' },
  placeholderSpace: { width: 70 },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  captureButtonInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  preview: { flex: 1, resizeMode: 'contain', backgroundColor: '#000' },
  overlayCentered: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  analyzingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  analyzingSubtext: { color: 'rgba(255,255,255,0.9)', fontSize: 15, textAlign: 'center' },
  analysisProgressTrack: {
    width: '82%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 18,
  },
  analysisProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  analysisSteps: {
    width: '82%',
    gap: 10,
  },
  analysisStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.58,
  },
  analysisStepRowActive: { opacity: 1 },
  analysisStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  analysisStepDotActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  analysisStepText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
  },
  analysisStepTextActive: {
    color: '#fff',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 8,
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  analyzeButtonText: { color: colors.primaryStrong || '#1f8e60', fontSize: 16, fontWeight: 'bold' },
});
