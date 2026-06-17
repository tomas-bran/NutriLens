import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  // Valores animados para la entrada escalonada (stagger)
  const fadeAnimHero = useRef(new Animated.Value(0)).current;
  const slideAnimHero = useRef(new Animated.Value(16)).current;

  const fadeAnimHow = useRef(new Animated.Value(0)).current;
  const slideAnimHow = useRef(new Animated.Value(16)).current;

  const fadeAnimExamples = useRef(new Animated.Value(0)).current;
  const slideAnimExamples = useRef(new Animated.Value(16)).current;

  const fadeAnimShortcuts = useRef(new Animated.Value(0)).current;
  const slideAnimShortcuts = useRef(new Animated.Value(16)).current;

  // Valor animado para los chips flotantes
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const floatLoops: Animated.CompositeAnimation[] = [];
    // Configurar la entrada en cascada
    const createAnim = (fade: Animated.Value, slide: Animated.Value) => {
      return Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]);
    };

    Animated.stagger(120, [
      createAnim(fadeAnimHero, slideAnimHero),
      createAnim(fadeAnimHow, slideAnimHow),
      createAnim(fadeAnimExamples, slideAnimExamples),
      createAnim(fadeAnimShortcuts, slideAnimShortcuts),
    ]).start();

    // Animación continua de levitación (desfasada para más naturalidad)
    const createFloat = (anim: Animated.Value, delay: number, duration: number) => {
      const timeout = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: -10, duration: duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: duration, useNativeDriver: true }),
          ]),
        );
        floatLoops.push(loop);
        loop.start();
      }, delay);
      timeouts.push(timeout);
    };

    createFloat(floatAnim1, 0, 3000);
    createFloat(floatAnim2, 500, 3200);

    return () => {
      timeouts.forEach(clearTimeout);
      floatLoops.forEach((loop) => loop.stop());
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Encabezado / Hero con diseño moderno */}
        <Animated.View
          style={{
            opacity: fadeAnimHero,
            transform: [{ translateY: slideAnimHero }],
            marginBottom: 32,
          }}
        >
          <LinearGradient
            colors={[
              colors.primaryStrong || '#1f8e60',
              colors.primary || '#2eb67d',
              '#15a06a',
              colors.primaryStrong || '#1f8e60',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decoración flotante (Chips) */}
            <Animated.View
              style={[
                styles.floatingChip,
                { top: '15%', right: '5%', transform: [{ translateY: floatAnim1 }] },
              ]}
            >
              <View style={styles.chipContent}>
                <Ionicons name="nutrition" size={12} color={colors.primaryStrong || '#1f8e60'} />
                <Text style={styles.chipText}>vegano</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                styles.floatingChip,
                { top: '65%', right: '8%', transform: [{ translateY: floatAnim2 }] },
              ]}
            >
              <View style={styles.chipContent}>
                <Ionicons name="leaf" size={12} color={colors.primaryStrong || '#1f8e60'} />
                <Text style={styles.chipText}>sin gluten</Text>
              </View>
            </Animated.View>

            <View style={styles.heroContent}>
              <View style={styles.badgeContainer}>
                <Ionicons name="sparkles" size={12} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.badgeText}>NUTRILENS · IA NUTRICIONAL</Text>
              </View>

              <Text style={styles.title}>
                Entendé qué comés,{'\n'}
                <Text style={{ color: '#d9f99d' }}>en segundos.</Text>
              </Text>
              <Text style={styles.subtitle}>
                Sacá una foto a cualquier producto y descubrí qué contiene realmente con un lenguaje
                claro.
              </Text>

              <View style={styles.ctaContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Analizar')}
                >
                  <Ionicons
                    name="camera"
                    size={20}
                    color={colors.primaryStrong || '#1f8e60'}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.primaryButtonText}>Analizar producto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Chat')}
                >
                  <Ionicons name="chatbubbles" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.secondaryButtonText}>Preguntá al asistente</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Sección: Cómo funciona */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnimHow, transform: [{ translateY: slideAnimHow }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Cómo funciona</Text>
          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Subí una foto de la etiqueta, ingredientes o tabla nutricional.
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Esperá unos segundos mientras la IA procesa la imagen.
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Mirá el análisis con riesgos, aptitudes y alérgenos detectados.
            </Text>
          </View>
        </Animated.View>

        {/* Sección: Ejemplos válidos */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnimExamples, transform: [{ translateY: slideAnimExamples }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Ejemplos válidos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.examplesContainer}
          >
            <View style={styles.exampleCard}>
              <View style={styles.exampleImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted || '#6b7280'} />
              </View>
              <Text style={styles.exampleText}>Frente del producto</Text>
            </View>
            <View style={styles.exampleCard}>
              <View style={styles.exampleImagePlaceholder}>
                <Ionicons name="list-outline" size={32} color={colors.textMuted || '#6b7280'} />
              </View>
              <Text style={styles.exampleText}>Ingredientes</Text>
            </View>
            <View style={styles.exampleCard}>
              <View style={styles.exampleImagePlaceholder}>
                <Ionicons name="grid-outline" size={32} color={colors.textMuted || '#6b7280'} />
              </View>
              <Text style={styles.exampleText}>Tabla nutricional</Text>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Sección: Tu Historial */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnimShortcuts, transform: [{ translateY: slideAnimShortcuts }] },
          ]}
        >
          <Text style={styles.sectionTitle}>Tu Historial</Text>

          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Historial')}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primarySoft || '#e6f5ee' }]}>
              <Ionicons name="time" size={28} color={colors.primaryStrong || '#1f8e60'} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Ver últimos análisis</Text>
              <Text style={styles.cardDescription}>Revisá los productos que ya escaneaste.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textMuted || '#6b7280'} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  heroGradient: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroContent: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 28,
  },
  ctaContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.primaryStrong || '#1f8e60',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  floatingChip: {
    position: 'absolute',
    zIndex: 10,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primaryStrong || '#1f8e60',
    marginLeft: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1f2e',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6f5ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumber: {
    color: '#1f8e60',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e7ec',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1f2e',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  examplesContainer: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  exampleCard: {
    width: 140,
    marginHorizontal: 8,
  },
  exampleImagePlaceholder: {
    height: 100,
    backgroundColor: '#f7f8fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e7ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
});
