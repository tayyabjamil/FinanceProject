import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getSession, signOut } from '@/lib/session';
import { R } from '@/constants/theme';

type MenuItem = { label: string; icon: string; onPress: () => void; destructive?: boolean };

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [income, setIncome] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const s = await getSession();
      if (cancelled) return;
      setName(s.profile?.name ?? '');
      setIncome(s.profile?.monthlyIncome ?? 0);
      setCurrency(s.profile?.currency ?? 'GBP');
      setEmail(s.email ?? '');
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function onLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const menuItems: MenuItem[] = [
    { label: 'Edit profile', icon: '✏️', onPress: () => router.push('/(onboarding)') },
    { label: 'Notifications', icon: '🔔', onPress: () => {} },
    { label: 'Security', icon: '🔒', onPress: () => {} },
    { label: 'Help & support', icon: '💬', onPress: () => {} },
    { label: 'Sign out', icon: '🚪', onPress: onLogout, destructive: true },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name || 'Your name'}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currency}</Text>
            <Text style={styles.statLabel}>Currency</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMid]}>
            <Text style={styles.statValue}>£{Math.round(income).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Monthly income</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Free</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, i < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.destructive && styles.menuLabelDestructive]}>
                {item.label}
              </Text>
              {!item.destructive && <Text style={styles.menuChevron}>›</Text>}
            </Pressable>
          ))}
        </View>

        <Text style={styles.version}>FinanceAI v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.bg },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  title: { color: R.textPrimary, fontSize: 24, fontWeight: '800' },

  profileCard: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: R.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: R.textPrimary, fontSize: 17, fontWeight: '700' },
  profileEmail: { color: R.textSecondary, fontSize: 13, marginTop: 2 },
  verifiedBadge: {
    backgroundColor: R.income + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: { color: R.income, fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row' },
  statCard: {
    flex: 1,
    backgroundColor: R.bgCard,
    borderWidth: 1,
    borderColor: R.border,
    padding: 14,
    gap: 4,
    alignItems: 'center',
  },
  statCardMid: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  statValue: { color: R.textPrimary, fontSize: 16, fontWeight: '700' },
  statLabel: { color: R.textSecondary, fontSize: 11 },

  menuCard: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: R.border },
  menuIcon: { fontSize: 18, width: 26 },
  menuLabel: { flex: 1, color: R.textPrimary, fontSize: 15, fontWeight: '500' },
  menuLabelDestructive: { color: R.expense },
  menuChevron: { color: R.textMuted, fontSize: 20, fontWeight: '300' },

  version: { color: R.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
