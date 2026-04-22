import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function ChatBox({ messages, onSend }) {
  const [text, setText] = useState('');

  const data = useMemo(() => (messages || []).slice(-80).reverse(), [messages]);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => `${item?._id || item?.createdAt || 'msg'}_${idx}`}
        inverted
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <Text style={styles.msgUser}>{item.system ? 'SYSTEM' : item.username || 'user'}</Text>
            <Text style={styles.msgText} numberOfLines={3}>
              {item.message}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Say something..."
          placeholderTextColor={THEME.textDim}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.send}
          onPress={() => {
            const msg = text.trim();
            if (!msg) return;
            setText('');
            onSend?.(msg);
          }}
        >
          <Send color={THEME.text} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: THEME.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },
  msgRow: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  msgUser: { color: THEME.primary, fontWeight: '800', fontSize: 12, marginBottom: 2 },
  msgText: { color: THEME.text, fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: THEME.text,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
  },
});
