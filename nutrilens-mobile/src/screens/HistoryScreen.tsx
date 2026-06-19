import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  TextInput,
  AppState,
  AppStateStatus,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory, getProductDetail } from '../services/api';
import { colors, typography } from '../theme/tokens';

interface PendingCatalogDetail {
  productId: string;
  createdAt: number;
  attempts: number;
}

const PENDING_CATALOG_DETAIL_KEY = '@nutrilens/pending-catalog-detail';
const PENDING_CATALOG_DETAIL_TTL_MS = 15 * 60 * 1000;
const MAX_PENDING_CATALOG_DETAIL_ATTEMPTS = 3;

const CATEGORY_OPTIONS = [
  'galletitas',
  'cereales',
  'snacks',
  'lácteos',
  'bebidas',
  'sin TACC',
  'veganos',
  'otros',
];
const RISK_OPTIONS = [
  { value: 'bajo', label: 'Bajo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
];
const APTO_OPTIONS = [
  { value: 'vegano', label: 'Vegano' },
  { value: 'celiaco', label: 'Celíaco' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
];
const ALLERGEN_OPTIONS = ['gluten', 'leche', 'huevo', 'soja', 'frutos secos', 'maní'];

export default function HistoryScreen({ navigation, route }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<string | undefined>();
  const [riesgo, setRiesgo] = useState<string | undefined>();
  const [apto, setApto] = useState<string | undefined>();
  const [alergeno, setAlergeno] = useState<string | undefined>();
  const [onlyMine, setOnlyMine] = useState(false);
  const openingIdRef = useRef<string | null>(null);

  const hasQueryFilters = Boolean(query.trim() || categoria || riesgo || apto || alergeno);
  const hasActiveFilters = hasQueryFilters;
  const isOnlyMineEmpty = onlyMine && !hasQueryFilters;

  useEffect(() => {
    if (typeof route?.params?.onlyMine === 'boolean') {
      setOnlyMine(route.params.onlyMine);
    }
  }, [route?.params?.onlyMine]);

  const setCatalogOpeningId = (value: string | null) => {
    openingIdRef.current = value;
    setOpeningId(value);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistory({
        q: query.trim() || undefined,
        categoria,
        riesgo,
        apto,
        alergeno,
        filtro: onlyMine ? 'mios' : undefined,
        pageSize: 50,
      });
      setHistory(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [query, categoria, riesgo, apto, alergeno, onlyMine]),
  );

  useEffect(() => {
    recoverPendingCatalogDetail();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        fetchHistory();
        recoverPendingCatalogDetail();
      }
    });

    return () => subscription.remove();
  }, [query, categoria, riesgo, apto, alergeno, onlyMine]);

  const clearFilters = () => {
    setQuery('');
    setCategoria(undefined);
    setRiesgo(undefined);
    setApto(undefined);
    setAlergeno(undefined);
    setOnlyMine(false);
  };

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

  const getRiskBg = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'bajo':
      case 'low':
        return colors.risk.lowBg;
      case 'medio':
      case 'medium':
        return colors.risk.mediumBg;
      case 'alto':
      case 'high':
        return colors.risk.highBg;
      default:
        return colors.surface;
    }
  };

  const translateRisk = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'bajo':
      case 'low':
        return 'Bajo';
      case 'medio':
      case 'medium':
        return 'Medio';
      case 'alto':
      case 'high':
        return 'Alto';
      default:
        return 'Desc.';
    }
  };

  const formatRelativeDate = (iso: string) => {
    if (!iso) return '';
    const elapsed = Date.now() - new Date(iso).getTime();

    const m = Math.floor(elapsed / 60000);
    if (m < 1) return 'hace instantes';
    if (m < 60) return `hace ${m} min`;

    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;

    const d = Math.floor(h / 24);
    if (d < 7) return `hace ${d} d`;

    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  };

  const capitalize = (s: string) =>
    s && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const openDetail = (item: any) => {
    openCatalogDetail(item.id, 0, 'new');
  };

  const openCatalogDetail = async (productId: string, attempts: number, mode: 'new' | 'retry') => {
    if (openingIdRef.current) return;

    const pending: PendingCatalogDetail = {
      productId,
      createdAt: Date.now(),
      attempts,
    };

    try {
      await AsyncStorage.setItem(PENDING_CATALOG_DETAIL_KEY, JSON.stringify(pending));
      setCatalogOpeningId(productId);
      const detail = await getProductDetail(productId);
      await AsyncStorage.removeItem(PENDING_CATALOG_DETAIL_KEY);
      navigation.navigate('Result', {
        data: mapDetailToResultData(detail),
        photoUri: detail.imagenUrl || undefined,
      });
    } catch (error: any) {
      const nextAttempts = attempts + 1;
      if (nextAttempts >= MAX_PENDING_CATALOG_DETAIL_ATTEMPTS) {
        await AsyncStorage.removeItem(PENDING_CATALOG_DETAIL_KEY);
      } else {
        await AsyncStorage.setItem(
          PENDING_CATALOG_DETAIL_KEY,
          JSON.stringify({ ...pending, attempts: nextAttempts }),
        );
      }

      if (mode === 'new' || nextAttempts >= MAX_PENDING_CATALOG_DETAIL_ATTEMPTS) {
        Alert.alert('Error', error?.message || 'No se pudo abrir el detalle del producto.');
      }
    } finally {
      setCatalogOpeningId(null);
    }
  };

  const recoverPendingCatalogDetail = async () => {
    if (openingIdRef.current) return;

    const rawPending = await AsyncStorage.getItem(PENDING_CATALOG_DETAIL_KEY);
    if (!rawPending) return;

    try {
      const pending = JSON.parse(rawPending) as PendingCatalogDetail;
      if (!pending.productId || !pending.createdAt) {
        await AsyncStorage.removeItem(PENDING_CATALOG_DETAIL_KEY);
        return;
      }

      if (Date.now() - pending.createdAt > PENDING_CATALOG_DETAIL_TTL_MS) {
        await AsyncStorage.removeItem(PENDING_CATALOG_DETAIL_KEY);
        return;
      }

      openCatalogDetail(pending.productId, pending.attempts || 0, 'retry');
    } catch (error) {
      await AsyncStorage.removeItem(PENDING_CATALOG_DETAIL_KEY);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => openDetail(item)}
      disabled={openingId === item.id}
    >
      <View style={styles.cardContent}>
        <View style={styles.thumbnailContainer}>
          {item.imagenUrl ? (
            <Image source={{ uri: item.imagenUrl }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Ionicons name="scan" size={28} color={colors.primary} />
            </View>
          )}
          <View style={[styles.thumbnailRiskBadge, { backgroundColor: getRiskBg(item.riesgo) }]}>
            <Text style={[styles.thumbnailRiskText, { color: getRiskColor(item.riesgo) }]}>
              {translateRisk(item.riesgo)}
            </Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.nombre || 'Producto Desconocido'}
            </Text>
          </View>

          <Text style={styles.itemMeta}>
            <Text style={{ textTransform: 'capitalize' }}>{item.categoria || 'Sin categoría'}</Text>
            {' · '}
            {formatRelativeDate(item.createdAt)}
          </Text>

          <View style={styles.allergensContainer}>
            {item.alergenos && item.alergenos.length > 0 ? (
              item.alergenos.slice(0, 3).map((a: string, index: number) => (
                <View key={`allergen-${index}`} style={styles.allergenChip}>
                  <Text style={styles.allergenText}>{capitalize(a)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.cleanChip}>
                <Ionicons name="checkmark" size={12} color={colors.risk.low} />
                <Text style={styles.cleanText}>Sin alergenos</Text>
              </View>
            )}
          </View>
        </View>
        {openingId === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.chevron} />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Catálogo</Text>
        </View>

        <View style={styles.filters}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              testID="history-search-input"
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.ownerToggle}>
            <TouchableOpacity
              style={[styles.ownerOption, !onlyMine && styles.ownerOptionSelected]}
              onPress={() => setOnlyMine(false)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="albums-outline"
                size={15}
                color={!onlyMine ? colors.primaryStrong : colors.textMuted}
              />
              <Text style={[styles.ownerOptionText, !onlyMine && styles.ownerOptionTextSelected]}>
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ownerOption, onlyMine && styles.ownerOptionSelected]}
              onPress={() => setOnlyMine(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="person-circle-outline"
                size={15}
                color={onlyMine ? colors.primaryStrong : colors.textMuted}
              />
              <Text style={[styles.ownerOptionText, onlyMine && styles.ownerOptionTextSelected]}>
                Analizados por vos
              </Text>
            </TouchableOpacity>
          </View>

          <FilterSection
            title="Riesgo"
            options={RISK_OPTIONS}
            value={riesgo}
            onChange={setRiesgo}
          />
          <FilterSection title="Aptitud" options={APTO_OPTIONS} value={apto} onChange={setApto} />
          <FilterSection
            title="Categoría"
            options={CATEGORY_OPTIONS.map((value) => ({ value, label: value }))}
            value={categoria}
            onChange={setCategoria}
          />
          <FilterSection
            title="Alérgeno"
            options={ALLERGEN_OPTIONS.map((value) => ({ value, label: value }))}
            value={alergeno}
            onChange={setAlergeno}
          />

          {hasActiveFilters && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={isOnlyMineEmpty ? () => setOnlyMine(false) : clearFilters}
            >
              <Ionicons
                name={isOnlyMineEmpty ? 'albums-outline' : 'close'}
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.clearFiltersText}>
                {isOnlyMineEmpty ? 'Ver catalogo completo' : 'Limpiar filtros'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.resultCount}>
            {loading && history.length > 0
              ? 'Actualizando catalogo...'
              : `${total} ${total === 1 ? 'producto' : 'productos'}`}
          </Text>
        </View>

        {loading && history.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.listContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="scan" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {hasActiveFilters
                  ? 'No encontramos productos'
                  : 'Todavía no analizaste ningún producto'}
              </Text>
              <Text style={styles.emptyText}>
                {hasActiveFilters
                  ? 'Probá ajustar los filtros o limpiar la búsqueda.'
                  : 'Cuando subas tu primera etiqueta, va a aparecer acá.'}
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={hasActiveFilters ? clearFilters : () => navigation.navigate('Analizar')}
              >
                <Ionicons
                  name={hasActiveFilters ? 'close' : 'camera'}
                  size={20}
                  color="#fff"
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>
                  {hasActiveFilters ? 'Limpiar filtros' : 'Analizar mi primer producto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshing={loading}
            onRefresh={fetchHistory}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function FilterSection({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (next: string | undefined) => void;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterOptions}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => onChange(selected ? undefined : option.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function mapDetailToResultData(detail: any) {
  return {
    id: detail.id,
    product: {
      producto: detail.nombre,
      categoria: detail.categoria,
      ingredientes_detectados: detail.ingredientes || [],
      alergenos: detail.alergenos || [],
      sellos: detail.sellos || [],
      apto_vegano: detail.aptoVegano,
      apto_celiaco: detail.aptoCeliaco,
      apto_sin_lactosa: detail.aptoSinLactosa,
      riesgo: detail.riesgo,
      confidence: detail.confidence,
    },
    rules: {
      reglas_aplicadas: detail.reglasAplicadas || [],
      risk_level: detail.riesgo,
    },
    explanation: detail.explanation,
    disclaimer:
      'NutriLens es un asistente informativo, no reemplaza el consejo de un profesional de nutrición.',
    savedAt: detail.createdAt,
    pipelineTrace: detail.pipelineTrace,
    offEnrichment: detail.offEnrichment ?? null,
  };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: typography.fontSize['2xl'], fontWeight: 'bold', color: colors.text },
  filters: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    minHeight: 44,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: typography.fontSize.sm },
  ownerToggle: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 4,
    marginBottom: 12,
  },
  ownerOption: {
    flex: 1,
    minHeight: 36,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ownerOptionSelected: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  ownerOptionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  ownerOptionTextSelected: { color: colors.primaryStrong },
  filterSection: { marginBottom: 10 },
  filterTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  filterOptions: { gap: 8, paddingRight: 16 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterChipTextSelected: { color: colors.primaryStrong },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
  },
  clearFiltersText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  resultCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  listContainer: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Empty State
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonIcon: { marginRight: 8 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: typography.fontSize.sm },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.primarySoft,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailRiskBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  thumbnailRiskText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: { fontSize: 15, fontWeight: 'bold', color: colors.text, flex: 1, marginRight: 8 },
  itemMeta: { fontSize: 12, color: colors.textMuted },

  allergensContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  allergenChip: {
    backgroundColor: colors.risk.highBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
  },
  allergenText: { fontSize: 10, fontWeight: 'bold', color: colors.risk.high },
  cleanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.risk.lowBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
  },
  cleanText: { fontSize: 10, fontWeight: '800', color: colors.risk.low },

  chevron: { marginTop: 4, marginLeft: 8 },
});
