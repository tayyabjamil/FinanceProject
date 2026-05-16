import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { getSession } from '@/lib/session';
import { getItem } from '@/lib/storage';
import type { Transaction } from '@/lib/transactions';
import { R } from '@/constants/theme';

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍔',
  transport: '🚗',
  shopping: '🛍️',
  bills: '⚡',
  rent: '🏠',
  salary: '💼',
  other: '💳',
};

export default function DashboardScreen() {
  const [name, setName] = useState('');
  const [income, setIncome] = useState(0);
  const [txns, setTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const session = await getSession();
      const list = (await getItem<Transaction[]>('financeai.transactions')) ?? [];
      if (cancelled) return;
      setName(session.profile?.name ?? '');
      setIncome(session.profile?.monthlyIncome ?? 0);
      setTxns(list);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const expenses = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const extraIncome = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalIncome = income + extraIncome;
    const balance = totalIncome - expenses;
    return { expenses, totalIncome, balance };
  }, [income, txns]);

  const savingsProgress = Math.max(0, Math.min(1, totals.balance / Math.max(1, totals.totalIncome * 0.2)));
  const recent = txns.slice(-5).reverse();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}{name ? `, ${name}` : ''}</Text>
            <Text style={styles.headerSub}>Here's your financial summary</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceAmount}>£{Math.round(totals.balance).toLocaleString()}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balancePill}>
              <Text style={styles.balancePillDot}>↑</Text>
              <Text style={styles.balancePillText}>£{Math.round(totals.totalIncome).toLocaleString()}</Text>
            </View>
            <View style={[styles.balancePill, styles.balancePillRed]}>
              <Text style={[styles.balancePillDot, styles.balancePillDotRed]}>↓</Text>
              <Text style={[styles.balancePillText, styles.balancePillTextRed]}>£{Math.round(totals.expenses).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValue}>£{Math.round(totals.totalIncome).toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💸</Text>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, { color: R.expense }]}>£{Math.round(totals.expenses).toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={styles.statLabel}>Saved</Text>
            <Text style={[styles.statValue, { color: R.income }]}>{Math.round(savingsProgress * 100)}%</Text>
          </View>
        </View>

        {/* Savings progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Savings goal</Text>
            <Text style={styles.cardBadge}>{Math.round(savingsProgress * 100)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(savingsProgress * 100)}%` }]} />
          </View>
          <Text style={styles.cardHint}>
            Target: save 20% of income · £{Math.round(totals.totalIncome * 0.2).toLocaleString()} this month
          </Text>
        </View>

        {/* AI tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>AI insight</Text>
            <Text style={styles.tipText}>
              Reduce discretionary spend by £{Math.round(totals.expenses * 0.05)} this week to hit your savings goal.
            </Text>
          </View>
        </View>

        {/* Recent transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Link href="/(tabs)/transactions" asChild>
            <Pressable>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.card}>
          {recent.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            recent.map((t, i) => (
              <View key={t.id} style={[styles.txRow, i < recent.length - 1 && styles.txRowBorder]}>
                <View style={styles.txIcon}>
                  <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[t.category] ?? '💳'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txMerchant}>{t.merchant}</Text>
                  <Text style={styles.txCategory}>{t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={[styles.txAmount, t.type === 'expense' ? styles.txAmountRed : styles.txAmountGreen]}>
                  {t.type === 'expense' ? '-' : '+'}£{t.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* FAB */}
        <Link href="/add-transaction" asChild>
          <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
            <Text style={styles.fabText}>+ Add transaction</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { color: R.textPrimary, fontSize: 20, fontWeight: '700' },
  headerSub: { color: R.textSecondary, fontSize: 13, marginTop: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: R.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  balanceCard: {
    backgroundColor: R.accent,
    borderRadius: 20,
    padding: 24,
    marginVertical: 12,
    gap: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
  },
  balancePillRed: { backgroundColor: 'rgba(255,59,92,0.25)' },
  balancePillDot: { color: R.income, fontWeight: '700', fontSize: 14 },
  balancePillDotRed: { color: R.expense },
  balancePillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  balancePillTextRed: { color: R.expense },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1,
    backgroundColor: R.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: R.border,
    gap: 4,
  },
  statEmoji: { fontSize: 20 },
  statLabel: { color: R.textSecondary, fontSize: 12 },
  statValue: { color: R.textPrimary, fontSize: 16, fontWeight: '700' },

  card: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { color: R.textPrimary, fontSize: 15, fontWeight: '600' },
  cardBadge: {
    color: R.accent,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: R.accentDim + '44',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  progressBg: {
    height: 8,
    backgroundColor: R.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: 8, backgroundColor: R.accent, borderRadius: 4 },
  cardHint: { color: R.textSecondary, fontSize: 12 },

  tipCard: {
    backgroundColor: R.accentDim + '22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.accent + '44',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: R.accent + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { color: R.accent, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  tipText: { color: R.textSecondary, fontSize: 13, lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { color: R.textPrimary, fontSize: 16, fontWeight: '700' },
  sectionLink: { color: R.accent, fontSize: 14, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: R.border },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: R.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txMerchant: { color: R.textPrimary, fontSize: 14, fontWeight: '600' },
  txCategory: { color: R.textSecondary, fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txAmountRed: { color: R.expense },
  txAmountGreen: { color: R.income },
  emptyText: { color: R.textSecondary, textAlign: 'center', paddingVertical: 8 },

  fab: {
    backgroundColor: R.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
