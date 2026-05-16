import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import type { Transaction, TransactionCategory, TransactionType } from '@/lib/transactions';
import { listTransactions } from '@/lib/transactions';
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

const TYPE_FILTERS: { id: TransactionType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

const CATS = ['all', 'food', 'transport', 'shopping', 'bills', 'rent', 'salary', 'other'] as const;

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [category, setCategory] = useState<TransactionCategory | 'all'>('all');
  const [items, setItems] = useState<Transaction[]>([]);
  const [queryFocused, setQueryFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const list = await listTransactions();
      if (cancelled) return;
      setItems(list);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, query, type, category]);

  const totalShown = useMemo(
    () => filtered.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0),
    [filtered]
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Fixed header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Payments</Text>
          <Link href="/add-transaction" asChild>
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, queryFocused && styles.searchWrapFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant, category…"
            placeholderTextColor={R.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setQueryFocused(true)}
            onBlur={() => setQueryFocused(false)}
          />
        </View>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <View style={styles.filterRow}>
            {TYPE_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, type === f.id && styles.chipActive]}
                onPress={() => setType(f.id)}
              >
                <Text style={[styles.chipText, type === f.id && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
            <View style={styles.chipDivider} />
            {CATS.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                  {c === 'all' ? 'All categories' : `${CATEGORY_ICONS[c] ?? ''} ${c}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Summary */}
      {filtered.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryCount}>{filtered.length} transactions</Text>
          <Text style={[styles.summaryTotal, totalShown >= 0 ? styles.positive : styles.negative]}>
            {totalShown >= 0 ? '+' : ''}£{Math.abs(totalShown).toFixed(2)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptySubtitle}>Add one to get started</Text>
            </View>
          ) : (
            filtered.map((t, i) => (
              <View key={t.id} style={[styles.txRow, i < filtered.length - 1 && styles.txRowBorder]}>
                <View style={styles.txIconWrap}>
                  <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[t.category] ?? '💳'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txMerchant}>{t.merchant}</Text>
                  <Text style={styles.txMeta}>
                    {t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, t.type === 'expense' ? styles.negative : styles.positive]}>
                  {t.type === 'expense' ? '-' : '+'}£{t.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: R.textPrimary, fontSize: 24, fontWeight: '800' },
  addBtn: {
    backgroundColor: R.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: R.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: R.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchWrapFocused: { borderColor: R.accent },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: R.textPrimary, fontSize: 15, paddingVertical: 11 },
  filtersScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  chip: {
    backgroundColor: R.bgCard,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: R.border,
  },
  chipActive: { backgroundColor: R.accent, borderColor: R.accent },
  chipText: { color: R.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipDivider: { width: 1, backgroundColor: R.border, marginHorizontal: 2 },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  summaryCount: { color: R.textSecondary, fontSize: 13 },
  summaryTotal: { fontSize: 13, fontWeight: '700' },

  list: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    overflow: 'hidden',
  },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: R.border },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: R.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txMerchant: { color: R.textPrimary, fontSize: 14, fontWeight: '600' },
  txMeta: { color: R.textSecondary, fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  positive: { color: R.income },
  negative: { color: R.expense },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { color: R.textPrimary, fontSize: 16, fontWeight: '600' },
  emptySubtitle: { color: R.textSecondary, fontSize: 14 },
});
