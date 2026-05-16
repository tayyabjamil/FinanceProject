import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import type { TransactionCategory, TransactionType } from '@/lib/transactions';
import { addTransaction } from '@/lib/transactions';
import { R } from '@/constants/theme';

const CATEGORIES: { id: TransactionCategory; icon: string }[] = [
  { id: 'food', icon: '🍔' },
  { id: 'transport', icon: '🚗' },
  { id: 'shopping', icon: '🛍️' },
  { id: 'bills', icon: '⚡' },
  { id: 'rent', icon: '🏠' },
  { id: 'salary', icon: '💼' },
  { id: 'other', icon: '💳' },
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [merchantFocused, setMerchantFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const numericAmount = useMemo(() => Number(amount.replace(/[^0-9.]/g, '')), [amount]);

  const autoCategoryHint = useMemo(() => {
    const m = merchant.toLowerCase();
    if (m.includes('uber') || m.includes('bolt')) return 'transport';
    if (m.includes('tesco') || m.includes('aldi') || m.includes('lidl')) return 'food';
    if (m.includes('amazon')) return 'shopping';
    return null;
  }, [merchant]);

  async function onSave() {
    if (!merchant.trim()) {
      Alert.alert('Merchant', 'Please enter a merchant.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Amount', 'Please enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      const chosenCategory = category === 'other' && autoCategoryHint
        ? (autoCategoryHint as TransactionCategory)
        : category;
      await addTransaction({
        type,
        amount: numericAmount,
        merchant: merchant.trim(),
        category: chosenCategory,
        date: new Date(date).toISOString(),
        notes: notes.trim() ? notes.trim() : undefined,
      });
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>↑ Expense</Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>↓ Income</Text>
          </Pressable>
        </View>

        {/* Amount hero */}
        <View style={styles.amountWrap}>
          <Text style={styles.currencySymbol}>£</Text>
          <TextInput
            style={[styles.amountInput, type === 'expense' ? styles.amountRed : styles.amountGreen]}
            placeholder="0.00"
            placeholderTextColor={R.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              const hinted = autoCategoryHint === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.catChip, active && styles.catChipActive, hinted && !active && styles.catChipHinted]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text style={styles.catIcon}>{c.icon}</Text>
                  <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.id}</Text>
                  {hinted && !active && <Text style={styles.aiHint}>AI</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.fieldsCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Merchant</Text>
              <TextInput
                style={[styles.fieldInput, merchantFocused && styles.fieldInputFocused]}
                placeholder="e.g. Tesco"
                placeholderTextColor={R.textMuted}
                value={merchant}
                onChangeText={setMerchant}
                onFocus={() => setMerchantFocused(true)}
                onBlur={() => setMerchantFocused(false)}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={R.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, notesFocused && styles.fieldInputFocused]}
                placeholder="Optional"
                placeholderTextColor={R.textMuted}
                value={notes}
                onChangeText={setNotes}
                onFocus={() => setNotesFocused(true)}
                onBlur={() => setNotesFocused(false)}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{loading ? 'Saving…' : 'Save transaction'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: R.bg },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: R.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: R.border,
    padding: 4,
    gap: 4,
  },
  typeBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  typeBtnExpense: { backgroundColor: R.expense + '22' },
  typeBtnIncome: { backgroundColor: R.income + '22' },
  typeBtnText: { color: R.textSecondary, fontWeight: '600', fontSize: 14 },
  typeBtnTextActive: { color: R.textPrimary },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  currencySymbol: { color: R.textSecondary, fontSize: 32, fontWeight: '700', marginTop: 8 },
  amountInput: { fontSize: 64, fontWeight: '800', letterSpacing: -2, minWidth: 120 },
  amountRed: { color: R.expense },
  amountGreen: { color: R.income },

  section: { gap: 10 },
  sectionLabel: { color: R.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 2 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: R.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: R.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  catChipActive: { borderColor: R.accent, backgroundColor: R.accentDim + '33' },
  catChipHinted: { borderColor: R.warning + '88', backgroundColor: R.warning + '11' },
  catIcon: { fontSize: 16 },
  catLabel: { color: R.textSecondary, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  catLabelActive: { color: R.textPrimary },
  aiHint: {
    color: R.warning,
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: R.warning + '22',
    paddingHorizontal: 4,
    borderRadius: 4,
  },

  fieldsCard: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    overflow: 'hidden',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fieldLabel: { color: R.textSecondary, fontSize: 14, width: 72 },
  fieldInput: { flex: 1, color: R.textPrimary, fontSize: 15 },
  fieldInputFocused: { color: R.textPrimary },
  fieldDivider: { height: 1, backgroundColor: R.border, marginLeft: 16 },

  saveBtn: {
    backgroundColor: R.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
