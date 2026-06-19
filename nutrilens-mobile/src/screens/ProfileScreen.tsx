import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { updatePrefs, type DietPrefs } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { DOCS_URL } from '../constants';

export default function ProfileScreen({ navigation }: any) {
  const { user, prefs, stats, signOut, refreshProfile, setLocalPrefs } = useAuth();
  const [savingKey, setSavingKey] = useState<keyof DietPrefs | null>(null);

  useEffect(() => {
    refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

  const setPref = async (key: keyof DietPrefs, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setLocalPrefs(next);
    setSavingKey(key);
    try {
      const saved = await updatePrefs(next);
      setLocalPrefs(saved);
    } catch (error: any) {
      setLocalPrefs(prefs);
      Alert.alert('No pudimos guardar', error?.message || 'Intentá de nuevo en unos segundos.');
    } finally {
      setSavingKey(null);
    }
  };

  if (!user || !prefs || !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered} testID="profile-loading">
          <ActivityIndicator testID="profile-loading" size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Perfil</Text>
        <Text style={styles.title}>Mi cuenta</Text>
        <View style={styles.profileCard}>
          {user.image ? (
            <Image source={{ uri: user.image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionTitle}>Tus analisis</Text>
          {stats.catalogoTotal !== undefined && (
            <Text style={styles.statsHint}>{stats.catalogoTotal} productos en el catalogo</Text>
          )}
        </View>
        <View style={styles.statsRow}>
          <StatBox value={stats.analizados} label="Analizados por vos" />
          <StatBox value={stats.riesgoAlto} label="Riesgo alto" tone="danger" />
          <StatBox value={stats.sinAlergenos} label="Sin alergenos" tone="success" />
        </View>
        {stats.ultimoAnalizado && (
          <TouchableOpacity
            style={styles.lastProductCard}
            onPress={() => navigation.navigate('Catálogo', { onlyMine: true })}
            activeOpacity={0.75}
          >
            <View style={styles.lastProductIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primaryStrong} />
            </View>
            <View style={styles.lastProductText}>
              <Text style={styles.lastProductLabel}>Ultimo analisis</Text>
              <Text style={styles.lastProductName} numberOfLines={1}>
                {stats.ultimoAnalizado.nombre}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis preferencias</Text>
          <PrefRow
            icon="leaf-outline"
            title="Dieta vegana"
            subtitle="Avisar si contiene origen animal"
            value={prefs.vegano}
            loading={savingKey === 'vegano'}
            onChange={(value) => setPref('vegano', value)}
            testID="pref-switch-vegano"
          />
          <PrefRow
            icon="nutrition-outline"
            title="Sin gluten"
            subtitle="Avisar si contiene gluten"
            value={prefs.celiaco}
            loading={savingKey === 'celiaco'}
            onChange={(value) => setPref('celiaco', value)}
            testID="pref-switch-celiaco"
          />
          <PrefRow
            icon="cafe-outline"
            title="Sin lactosa"
            subtitle="Avisar si contiene lácteos"
            value={prefs.lactosa}
            loading={savingKey === 'lactosa'}
            onChange={(value) => setPref('lactosa', value)}
            testID="pref-switch-lactosa"
          />
          <PrefRow
            icon="warning-outline"
            title="Avisos de riesgo alto"
            subtitle="Marcar productos de riesgo alto"
            value={prefs.avisos}
            loading={savingKey === 'avisos'}
            onChange={(value) => setPref('avisos', value)}
            testID="pref-switch-avisos"
            last
          />
        </View>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Catálogo', { onlyMine: true })}
          >
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Ver mis analisis</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Catálogo', { onlyMine: false })}
          >
            <Ionicons name="albums-outline" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Ver catalogo completo</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkRow, styles.linkDivider]}
            onPress={() => Linking.openURL(DOCS_URL)}
            accessibilityRole="link"
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Documentación</Text>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.logoutRow]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            <Text style={[styles.linkText, styles.logoutText]}>Cerrar sesion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  value,
  label,
  tone = 'default',
}: {
  value: number;
  label: string;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneColor =
    tone === 'danger'
      ? colors.risk.high
      : tone === 'success'
        ? colors.success
        : colors.primaryStrong;

  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: toneColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PrefRow({
  icon,
  title,
  subtitle,
  value,
  loading,
  onChange,
  testID,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  loading: boolean;
  onChange: (value: boolean) => void;
  testID: string;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.prefRow, !last && styles.prefDivider]}
      onPress={() => onChange(!value)}
      activeOpacity={0.75}
      disabled={loading}
    >
      <View style={[styles.prefIcon, value && styles.prefIconActive]}>
        <Ionicons name={icon} size={20} color={value ? colors.primaryStrong : colors.textMuted} />
      </View>
      <View style={styles.prefText}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefSubtitle}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          testID={testID}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
          ios_backgroundColor={colors.border}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingBottom: 36 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.textMuted, fontSize: typography.fontSize.sm, fontWeight: '700' },
  title: {
    color: colors.text,
    fontSize: typography.fontSize['3xl'],
    fontWeight: '900',
    marginTop: 4,
  },
  profileCard: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginRight: 14 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: typography.fontSize.lg, fontWeight: '900' },
  profileEmail: { color: colors.textMuted, fontSize: typography.fontSize.sm, marginTop: 2 },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
  },
  statsHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  lastProductCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastProductIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lastProductText: { flex: 1, minWidth: 0 },
  lastProductLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  lastProductName: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '900',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.fontSize.base,
    fontWeight: '900',
    marginBottom: 4,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  prefDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  prefIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prefIconActive: { backgroundColor: colors.primarySoft },
  prefText: { flex: 1 },
  prefTitle: { color: colors.text, fontSize: typography.fontSize.sm, fontWeight: '800' },
  prefSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkText: { color: colors.text, fontSize: typography.fontSize.sm, fontWeight: '800', flex: 1 },
  linkDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  logoutRow: { borderTopWidth: 1, borderTopColor: colors.border },
  logoutText: { color: colors.danger },
});
