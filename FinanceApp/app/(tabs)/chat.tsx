import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = [
  'What are my transactions saying?',
  'Where did most of my money go?',
  'How much did I spend on subscriptions?',
  'What are my biggest expenses?',
  'Where can I save money?',
  'Any unusual transactions?',
];

export default function ChatScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: "Hey! I'm your AI finance assistant. Ask me anything about your spending, budgets, or savings goals.",
      ts: new Date(),
    },
  ]);
  const listRef = useRef<FlatList>(null);

  async function send(msg: string) {
    const clean = msg.trim();
    if (!clean || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: clean, ts: new Date() };
    setMessages((m) => [...m, userMsg]);
    setText('');
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const res = await fetch(
        process.env.EXPO_PUBLIC_FINANCE_CHAT_URL ?? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/finance-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: clean }),
        },
      );

      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);

      const aiMsg: ChatMessage = { role: 'ai', text: body.answer, ts: new Date() };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        role: 'ai',
        text: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ts: new Date(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
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
          ListFooterComponent={
            loading ? (
              <View style={styles.bubbleWrapAi}>
                <View style={styles.aiBubbleIcon}>
                  <Text style={{ fontSize: 12 }}>✨</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAi, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={R.accent} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggestions */}
        <View style={styles.suggestionsWrap}>
          <FlatList
            data={SUGGESTIONS}
            keyExtractor={(s) => s}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsRow}
            renderItem={({ item: s }) => (
              <Pressable style={styles.suggestionChip} onPress={() => send(s)} disabled={loading}>
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
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(text)}
            disabled={!text.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
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
  loadingBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
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
