import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Radio, Square } from 'lucide-react-native';
import liveService from '../../services/liveService';
import ScreenHeader from '../../components/video/ScreenHeader';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function GoLiveScreen({ navigation }) {
  const [title, setTitle] = useState('My Live Stream');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const create = async () => {
    setLoading(true);
    try {
      const res = await liveService.create(title);
      setCreated(res?.data);
    } catch (e) {
      Alert.alert('Go Live', e?.response?.data?.error || e?.message || 'Failed to create stream');
    } finally {
      setLoading(false);
    }
  };

  const end = async () => {
    if (!created?.streamKey) return;
    setLoading(true);
    try {
      await liveService.end(created.streamKey);
      Alert.alert('Stream ended', 'Your stream is now offline.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('End Stream', e?.response?.data?.error || e?.message || 'Failed to end stream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Go Live" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Stream Title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={THEME.textDim} />

        <TouchableOpacity style={styles.primaryBtn} onPress={create} disabled={loading}>
          <Radio color="#fff" size={18} />
          <Text style={styles.primaryText}>{loading ? 'Working...' : 'Generate Stream Key'}</Text>
        </TouchableOpacity>

        {created ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OBS / RTMP</Text>
            <Text style={styles.mono}>
              Server URL: {created.rtmpUrl ? created.rtmpUrl.replace(/\/[^/]+$/, '') : ''}
            </Text>
            <Text style={styles.mono}>Stream Key: {created.streamKey}</Text>
            <Text style={[styles.cardTitle, { marginTop: 14 }]}>Playback (HLS)</Text>
            <Text style={styles.mono}>{created.playbackUrl}</Text>

            <Text style={styles.hint}>
              In OBS: Settings → Stream → Service: Custom. Paste Server URL + Stream Key. Start Streaming to go live.
            </Text>

            <TouchableOpacity style={styles.endBtn} onPress={end} disabled={loading}>
              <Square color="#fff" size={18} />
              <Text style={styles.endText}>End Stream</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.hint}>
            UNEXA uses RTMP ingest (OBS / RTMP app) and HLS playback. WebRTC is not used.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { padding: 16, paddingBottom: 30 },
  label: { color: THEME.textDim, fontSize: 12, marginBottom: 8, fontWeight: '700' },
  input: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
    marginBottom: 12,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  card: {
    marginTop: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 14,
  },
  cardTitle: { color: THEME.text, fontWeight: '900', marginBottom: 8 },
  mono: { color: THEME.textDim, fontSize: 12, marginTop: 6 },
  hint: { marginTop: 14, color: THEME.textDim, fontSize: 12, lineHeight: 18 },
  endBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  endText: { color: '#fff', fontWeight: '900' },
});
