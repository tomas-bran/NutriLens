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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme/tokens';
import { analyzeProduct } from '../services/api';

export default function AnalyzeScreen({ navigation }: any) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [galleryPermission, setGalleryPermission] =
    useState<ImagePicker.MediaLibraryPermissionResponse | null>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Animación para el estado "Analizando"
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAnalyzing]);

  const requestGalleryPermission = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setGalleryPermission(perm);
    return perm;
  };
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

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: false });
        if (photo) setPhotoUri(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'No se pudo capturar la foto.');
      }
    }
  };

  const handlePickGallery = async () => {
    const perm = galleryPermission || (await requestGalleryPermission());
    if (!perm.granted) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería.');
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

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const data = await analyzeProduct(photoUri!);
      setIsAnalyzing(false);
      // Navegamos a ResultScreen pasando la data y opcionalmente la foto
      navigation.navigate('Result', { data, photoUri });
      resetPhoto();
    } catch (err: any) {
      setIsAnalyzing(false);
      Alert.alert(
        'Error',
        err.message || 'Hubo un problema al analizar el producto. Revisá la conexión.',
      );
      console.error(err);
    }
  };

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />

        {isAnalyzing ? (
          <LinearGradient
            colors={['rgba(31,142,96,0.85)', 'rgba(46,182,125,0.85)']}
            style={styles.overlayCentered}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
              <View style={styles.analyzingIconContainer}>
                <Ionicons name="sparkles" size={32} color="#fff" />
              </View>
              <Text style={styles.analyzingText}>Analizando producto...</Text>
              <Text style={styles.analyzingSubtext}>La IA está revisando los ingredientes</Text>
            </Animated.View>
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
            Intentá que el texto sea legible y esté enfocado
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
