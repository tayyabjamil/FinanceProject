import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { R } from '@/constants/theme';
import type { CategoryBar } from '@/types';

const BREAKDOWN: CategoryBar[] = [
  { label: 'Food', pct: 32, color: '#FF9F43' },
  { label: 'Bills', pct: 25, color: R.accent },
  { label: 'Shopping', pct: 18, color: '#00C896' },
  { label: 'Transport', pct: 14, color: '#0075FF' },
  { label: 'Other', pct: 11, color: '#FF3B5C' },
];

export default function InsightsScreen() {
  return (
    <Screen>
      {/* Header */}
      <View style={styles.topRow}>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.periodChip}>
          <Text style={styles.periodText}>This month</Text>
        </View>
      </View>

      {/* Category breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category breakdown</Text>
        <View style={styles.bars}>
          {BREAKDOWN.map((b) => (
            <View key={b.label} style={styles.barRow}>
              <Text style={styles.barLabel}>{b.label}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${b.pct}%`, backgroundColor: b.color }]} />
              </View>
              <Text style={styles.barPct}>{b.pct}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Month comparison */}
      <View style={styles.card}>
        <View style={styles.compareHeader}>
          <View style={styles.badgeOrange}>
            <Text style={styles.badgeText}>↑ 8% vs last month</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>Monthly comparison</Text>
        <Text style={styles.cardSubtitle}>You spent 8% more than last month. Try reducing dining out.</Text>
        <View style={styles.compRow}>
          <View style={styles.compItem}>
            <Text style={styles.compLabel}>Last month</Text>
            <Text style={styles.compValue}>£1,840</Text>
          </View>
          <View style={styles.compDivider} />
          <View style={styles.compItem}>
            <Text style={styles.compLabel}>This month</Text>
            <Text style={[styles.compValue, { color: R.expense }]}>£1,988</Text>
          </View>
        </View>
      </View>

      {/* Spending warnings */}
      <Text style={styles.sectionTitle}>Alerts</Text>

      <View style={styles.alertCard}>
        <View style={styles.alertDot} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Shopping budget at risk</Text>
          <Text style={styles.alertSub}>You've used 82% of your shopping budget</Text>
        </View>
        <Text style={styles.alertEmoji}>⚠️</Text>
      </View>

      <View style={[styles.alertCard, styles.alertGreen]}>
        <View style={[styles.alertDot, styles.alertDotGreen]} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Transport on track</Text>
          <Text style={styles.alertSub}>You've used 45% with 3 weeks left</Text>
        </View>
        <Text style={styles.alertEmoji}>✅</Text>
      </View>

      {/* AI recommendation */}
      <View style={styles.aiCard}>
        <Text style={styles.aiLabel}>✨  AI Recommendation</Text>
        <Text style={styles.aiText}>
          Switch your weekly food shop to Aldi or Lidl to save an estimated £60–£80/month.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  title: { color: R.textPrimary, fontSize: 24, fontWeight: '800' },
  periodChip: {
    backgroundColor: R.bgCard,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: R.border,
  },
  periodText: { color: R.textSecondary, fontSize: 13 },

  card: {
    backgroundColor: R.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.border,
    padding: 16,
  },
  cardTitle: { color: R.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  cardSubtitle: { color: R.textSecondary, fontSize: 13, marginBottom: 14 },
  bars: { gap: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { color: R.textSecondary, fontSize: 13, width: 64 },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: R.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { color: R.textPrimary, fontSize: 12, fontWeight: '600', width: 34, textAlign: 'right' },

  compareHeader: { marginBottom: 8 },
  badgeOrange: {
    backgroundColor: '#FFB80022',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFB80044',
  },
  badgeText: { color: R.warning, fontSize: 12, fontWeight: '600' },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  compItem: { flex: 1, alignItems: 'center', gap: 4 },
  compLabel: { color: R.textSecondary, fontSize: 12 },
  compValue: { color: R.textPrimary, fontSize: 22, fontWeight: '800' },
  compDivider: { width: 1, height: 40, backgroundColor: R.border },

  sectionTitle: { color: R.textPrimary, fontSize: 16, fontWeight: '700' },

  alertCard: {
    backgroundColor: R.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFB80033',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertGreen: { borderColor: R.income + '44' },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: R.warning },
  alertDotGreen: { backgroundColor: R.income },
  alertContent: { flex: 1 },
  alertTitle: { color: R.textPrimary, fontSize: 14, fontWeight: '600' },
  alertSub: { color: R.textSecondary, fontSize: 12, marginTop: 2 },
  alertEmoji: { fontSize: 18 },

  aiCard: {
    backgroundColor: R.accentDim + '22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: R.accent + '44',
    padding: 16,
    gap: 8,
  },
  aiLabel: { color: R.accent, fontSize: 12, fontWeight: '700' },
  aiText: { color: R.textSecondary, fontSize: 14, lineHeight: 20 },
});
