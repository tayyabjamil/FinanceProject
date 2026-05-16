import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { R } from '@/constants/theme';

type Msg = { role: 'user' | 'ai'; text: string; ts: Date };

const SUGGESTIONS = [
  'Why am I overspending?',
  'Can I save £300 this month?',
  'Where did my money go?',
  "What's my biggest expense?",
];

export default function ChatScreen() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', text: 'Hey! I\'m your AI finance assistant. Ask me anything about your spending, budgets, or savings goals.', ts: new Date() },
  ]);
  const listRef = useRef<FlatList>(null);

  const suggestions = useMemo(() => SUGGESTIONS, []);

  function send(msg: string) {
    const clean = msg.trim();
    if (!clean) return;
    const now = new Date();
    setMessages((m) => [
      ...m,
      { role: 'user', text: clean, ts: now },
      { role: 'ai', text: 'Great question! Real AI insights are coming soon. For now, I can see you\'re on track with your budget this month. 🎉', ts: new Date() },
    ]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.aiAvatar}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Powered by Claude</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: m }) => (
            <View style={[styles.bubbleWrap, m.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAi]}>
              {m.role === 'ai' && (
                <View style={styles.aiBubbleIcon}>
                  <Text style={{ fontSize: 12 }}>✨</Text>
                </View>
              )}
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.text}</Text>
              </View>
            </View>
          )}
        />

        {/* Suggestions */}
        <View style={styles.suggestionsWrap}>
          <FlatList
            data={suggestions}
            keyExtractor={(s) => s}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsRow}
            renderItem={({ item: s }) => (
              <Pressable style={styles.suggestionChip} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your finances…"
            placeholderTextColor={R.textMuted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={() => send(text)}
            disabled={!text.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: R.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: R.border,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: R.accentDim + '66',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: R.accent + '66',
  },
  headerTitle: { color: R.textPrimary, fontSize: 15, fontWeight: '700' },
  headerSub: { color: R.textSecondary, fontSize: 12 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: R.income,
    marginLeft: 'auto',
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  bubbleWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAi: { justifyContent: 'flex-start' },
  aiBubbleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: R.accentDim + '55',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: R.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: R.bgCard,
    borderWidth: 1,
    borderColor: R.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: R.textPrimary, fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },

  suggestionsWrap: {
    borderTopWidth: 1,
    borderTopColor: R.border,
    paddingVertical: 10,
  },
  suggestionsRow: { paddingHorizontal: 16, gap: 8 },
  suggestionChip: {
    backgroundColor: R.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: R.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: { color: R.textSecondary, fontSize: 13 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: R.border,
  },
  input: {
    flex: 1,
    backgroundColor: R.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: R.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: R.textPrimary,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: R.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: R.border },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },
});
