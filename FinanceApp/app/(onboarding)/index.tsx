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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import type { AppGoal } from '@/lib/session';
import { saveProfile } from '@/lib/session';
import { R } from '@/constants/theme';

const GOALS: { id: AppGoal; label: string; emoji: string }[] = [
  { id: 'save', label: 'Save more money', emoji: '💰' },
  { id: 'budget', label: 'Stick to a budget', emoji: '📊' },
  { id: 'reduce_spending', label: 'Reduce spending', emoji: '✂️' },
  { id: 'track_money', label: 'Track my money', emoji: '📈' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [goal, setGoal] = useState<AppGoal>('save');
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [incomeFocused, setIncomeFocused] = useState(false);

  const monthlyIncome = useMemo(() => Number(income.replace(/[^0-9.]/g, '')), [income]);

  async function onContinue() {
    if (!name.trim()) {
      Alert.alert('Your name', 'Please enter your name.');
      return;
    }
    if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
      Alert.alert('Monthly income', 'Please enter a valid monthly income.');
      return;
    }

    setLoading(true);
    try {
      await saveProfile({ name: name.trim(), monthlyIncome, goal, currency: 'GBP' });
      router.replace('/(tabs)/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.step}>Step 1 of 1</Text>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.title}>Let's personalise{'\n'}your experience</Text>
            <Text style={styles.subtitle}>This helps us tailor insights just for you</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Your name</Text>
              <TextInput
                style={[styles.input, nameFocused && styles.inputFocused]}
                placeholder="e.g. Alex"
                placeholderTextColor={R.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Monthly income (£)</Text>
              <TextInput
                style={[styles.input, incomeFocused && styles.inputFocused]}
                placeholder="e.g. 2500"
                placeholderTextColor={R.textMuted}
                value={income}
                onChangeText={setIncome}
                keyboardType="decimal-pad"
                onFocus={() => setIncomeFocused(true)}
                onBlur={() => setIncomeFocused(false)}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Primary goal</Text>
              <View style={styles.goalsGrid}>
                {GOALS.map((g) => {
                  const active = goal === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.goalCard, active && styles.goalCardActive]}
                      onPress={() => setGoal(g.id)}
                    >
                      <Text style={styles.goalEmoji}>{g.emoji}</Text>
                      <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={onContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Saving…' : 'Continue →'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.bg },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 32,
  },
  header: { gap: 12 },
  step: { color: R.accent, fontSize: 13, fontWeight: '600' },
  progressBar: {
    height: 4,
    backgroundColor: R.bgCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    width: '100%',
    backgroundColor: R.accent,
    borderRadius: 2,
  },
  title: {
    color: R.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { color: R.textSecondary, fontSize: 15 },
  form: { gap: 20 },
  fieldWrap: { gap: 8 },
  fieldLabel: { color: R.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: 2 },
  input: {
    backgroundColor: R.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: R.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: R.textPrimary,
    fontSize: 16,
  },
  inputFocused: { borderColor: R.accent },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCard: {
    width: '47%',
    backgroundColor: R.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: R.border,
    padding: 16,
    gap: 8,
  },
  goalCardActive: {
    borderColor: R.accent,
    backgroundColor: R.accentDim + '33',
  },
  goalEmoji: { fontSize: 24 },
  goalLabel: { color: R.textSecondary, fontSize: 13, fontWeight: '500' },
  goalLabelActive: { color: R.textPrimary },
  primaryBtn: {
    backgroundColor: R.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
