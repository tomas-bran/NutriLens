import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme/tokens';

const RULE_LABELS: Record<string, string> = {
  contiene_gluten: 'Contiene gluten',
  contiene_lacteos: 'Contiene lácteos',
  contiene_origen_animal: 'Contiene ingredientes de origen animal',
  llm_marca_no_vegano: 'La IA marcó el producto como no vegano',
  llm_marca_no_celiaco: 'La IA marcó el producto como no apto celíaco',
  llm_marca_con_lactosa: 'La IA marcó posible lactosa',
};

const SELLO_LABELS: Record<string, { line1: string; line2: string }> = {
  'exceso en azúcares': { line1: 'Exceso en', line2: 'Azúcares' },
  'exceso en sodio': { line1: 'Exceso en', line2: 'Sodio' },
  'exceso en grasas saturadas': { line1: 'Exceso en', line2: 'Grasas saturadas' },
  'exceso en grasas totales': { line1: 'Exceso en', line2: 'Grasas totales' },
  'exceso en calorías': { line1: 'Exceso en', line2: 'Calorías' },
};

export default function ResultScreen({ route, navigation }: any) {
  // El análisis de la API viene en route.params.data
  // La foto (opcional) viene en route.params.photoUri
  const { data, photoUri } = route.params || {};

  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;
  const fadeAnim4 = useRef(new Animated.Value(0)).current;
  const slideAnim4 = useRef(new Animated.Value(20)).current;
  const fadeAnim5 = useRef(new Animated.Value(0)).current;
  const slideAnim5 = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (data) {
      const createAnim = (fade: Animated.Value, slide: Animated.Value) => {
        return Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]);
      };

      Animated.stagger(100, [
        createAnim(fadeAnim1, slideAnim1),
        createAnim(fadeAnim2, slideAnim2),
        createAnim(fadeAnim3, slideAnim3),
        createAnim(fadeAnim4, slideAnim4),
        createAnim(fadeAnim5, slideAnim5),
      ]).start();
    }
  }, [data]);

  if (!data) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colors.textMuted}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.errorText}>No hay datos para mostrar.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { product, rules, explanation, disclaimer } = data;

  const riesgo = product?.riesgo || rules?.risk_level;
  const sellos = product?.sellos || [];
  const aptitudes = [
    {
      key: 'vegano',
      label: product?.apto_vegano ? 'Vegano' : 'No vegano',
      value: product?.apto_vegano,
    },
    {
      key: 'celiaco',
      label: product?.apto_celiaco ? 'Apto celíaco' : 'No apto celíaco',
      value: product?.apto_celiaco,
    },
    {
      key: 'sin_lactosa',
      label: product?.apto_sin_lactosa ? 'Sin lactosa' : 'Tiene lactosa',
      value: product?.apto_sin_lactosa,
    },
  ].filter((item) => item.value !== undefined);

  // Derivamos flags de las reglas aplicadas (si existen)
  const flags =
    rules?.reglas_aplicadas?.map((regla: string) => {
      switch (regla) {
        case 'contiene_gluten':
          return { type: 'danger', message: 'Contiene Gluten' };
        case 'contiene_lacteos':
          return { type: 'warning', message: 'Contiene Lacteos' };
        case 'contiene_origen_animal':
          return { type: 'warning', message: 'Contiene ingredientes de origen animal' };
        case 'llm_marca_no_vegano':
          return { type: 'warning', message: 'Probablemente no vegano' };
        case 'llm_marca_no_celiaco':
          return { type: 'danger', message: 'Probablemente no apto celiaco' };
        case 'llm_marca_con_lactosa':
          return { type: 'warning', message: 'Probablemente contiene lactosa' };
        default:
          return { type: 'warning', message: regla };
      }
    }) ||
    rules?.flags ||
    [];
  const ruleLabels = (rules?.reglas_aplicadas || []).map(
    (rule: string) => RULE_LABELS[rule] || rule,
  );

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'bajo':
      case 'low':
        return colors.risk.low;
      case 'medio':
      case 'medium':
        return colors.risk.medium;
      case 'alto':
      case 'high':
        return colors.risk.high;
      default:
        return colors.textMuted;
    }
  };

  const getRiskGradient = (risk: string): [string, string] => {
    switch (risk?.toLowerCase()) {
      case 'bajo':
      case 'low':
        return ['#ecfdf5', '#dcfce7'];
      case 'medio':
      case 'medium':
        return ['#fffbeb', '#fef08a'];
      case 'alto':
      case 'high':
        return ['#fef2f2', '#fee2e2'];
      default:
        return ['#f3f4f6', '#e5e7eb'];
    }
  };

  const translateRisk = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'bajo':
      case 'low':
        return 'Bajo Riesgo';
      case 'medio':
      case 'medium':
        return 'Precaución';
      case 'alto':
      case 'high':
        return 'Alto Riesgo';
      default:
        return 'Desconocido';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1a1f2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultado</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: slideAnim1 }] }}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.productImage} />}

          {product?.confidence !== undefined && product.confidence < 0.6 && (
            <View style={styles.lowConfidenceContainer}>
              <Ionicons name="warning" size={24} color="#b45309" />
              <View style={styles.lowConfidenceTextContainer}>
                <Text style={styles.lowConfidenceTitle}>Confianza baja</Text>
                <Text style={styles.lowConfidenceText}>
                  El análisis puede tener errores. Probá con una foto más nítida.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.productName}>
                  {product?.producto || product?.name || 'Producto Desconocido'}
                </Text>
                {product?.brand && <Text style={styles.brand}>{product.brand}</Text>}
              </View>

              {riesgo && (
                <LinearGradient
                  colors={getRiskGradient(riesgo)}
                  style={styles.riskBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.riskText, { color: getRiskColor(riesgo) }]}>
                    {translateRisk(riesgo)}
                  </Text>
                </LinearGradient>
              )}
            </View>

            {aptitudes.length > 0 && (
              <View style={styles.aptitudesContainer} testID="aptitudes-chips">
                {aptitudes.map((aptitude) => (
                  <View
                    key={aptitude.key}
                    style={[
                      styles.aptitudeChip,
                      aptitude.value ? styles.aptitudeChipPositive : styles.aptitudeChipNegative,
                    ]}
                  >
                    <Ionicons
                      name={aptitude.value ? 'checkmark-circle' : 'close-circle'}
                      size={14}
                      color={aptitude.value ? colors.success : colors.danger}
                    />
                    <Text
                      style={[
                        styles.aptitudeText,
                        { color: aptitude.value ? colors.success : colors.danger },
                      ]}
                    >
                      {aptitude.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: slideAnim2 }] }}>
          {sellos.length > 0 && (
            <View style={styles.card} testID="sello-chips">
              <Text style={styles.sectionTitle}>Sellos detectados</Text>
              <View style={styles.sellosContainer}>
                {sellos.map((sello: string) => {
                  const parts = SELLO_LABELS[sello] || {
                    line1: 'Exceso en',
                    line2: sello.replace('exceso en ', ''),
                  };
                  return (
                    <View key={sello} style={styles.selloBadge}>
                      <Text style={styles.selloLine1}>{parts.line1}</Text>
                      <Text style={styles.selloLine2}>{parts.line2}</Text>
                      <Text style={styles.selloFooter}>Ministerio{'\n'}de Salud</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {flags.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Análisis de la IA</Text>
              {flags.map((flag: any, index: number) => (
                <View key={index} style={styles.flagRow}>
                  <View
                    style={[
                      styles.flagIconContainer,
                      { backgroundColor: flag.type === 'danger' ? '#fef2f2' : '#fffbeb' },
                    ]}
                  >
                    <Ionicons
                      name={flag.type === 'danger' ? 'alert-circle' : 'warning'}
                      size={18}
                      color={flag.type === 'danger' ? colors.danger : colors.warning}
                    />
                  </View>
                  <Text style={styles.flagText}>{flag.message}</Text>
                </View>
              ))}
            </View>
          )}

          {ruleLabels.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Reglas aplicadas</Text>
              {ruleLabels.map((rule: string, index: number) => (
                <View key={`${rule}-${index}`} style={styles.ruleRow}>
                  <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: slideAnim3 }] }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            <Text style={styles.ingredients}>
              {product?.ingredientes_detectados?.join(', ') ||
                product?.ingredients?.join(', ') ||
                'No se detectaron ingredientes.'}
            </Text>
          </View>

          {(product?.alergenos?.length > 0 || product?.allergens?.length > 0) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Alérgenos Detectados</Text>
              <View style={styles.tagContainer}>
                {(product?.alergenos || product?.allergens || []).map(
                  (alg: string, idx: number) => (
                    <View
                      key={idx}
                      style={[styles.tag, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                    >
                      <Text style={[styles.tagText, { color: '#b91c1c' }]}>{alg}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: slideAnim4 }] }}>
          {explanation && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>¿Por qué este resultado?</Text>
              <Text style={styles.explanation}>{explanation}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim5, transform: [{ translateY: slideAnim5 }] }}>
          {disclaimer && <Text style={styles.disclaimer}>{disclaimer}</Text>}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Chat', params: { productData: data } })
            }
          >
            <LinearGradient
              colors={[colors.primaryStrong || '#1f8e60', colors.primary || '#2eb67d']}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubbles" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Preguntar al Asistente</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backIcon: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1f2e' },
  scrollContent: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 50 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorText: { fontSize: 18, color: '#1a1f2e', marginBottom: 24, fontWeight: '600' },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 100,
  },
  backButtonText: { color: '#4b5563', fontWeight: 'bold', fontSize: 15 },

  productImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1f2e',
    marginBottom: 6,
    lineHeight: 28,
  },
  brand: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  aptitudesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  aptitudeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aptitudeChipPositive: { backgroundColor: colors.successBg, borderColor: colors.successBg },
  aptitudeChipNegative: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg },
  aptitudeText: { fontSize: 12, fontWeight: 'bold' },

  lowConfidenceContainer: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  lowConfidenceTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  lowConfidenceTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  lowConfidenceText: { fontSize: 13, color: '#b45309', lineHeight: 18 },

  riskBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  riskText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1f2e', marginBottom: 16 },
  sellosContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  selloBadge: {
    width: 92,
    height: 92,
    backgroundColor: colors.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 18,
  },
  selloLine1: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  selloLine2: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 2,
  },
  selloFooter: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 7,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 6,
  },

  flagRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  flagIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: -2,
  },
  flagText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 22 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  ruleText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 20 },

  ingredients: { fontSize: 14, color: '#4b5563', lineHeight: 24 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: 'bold' },

  explanation: { fontSize: 14, color: '#4b5563', lineHeight: 24 },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  primaryButton: {
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
