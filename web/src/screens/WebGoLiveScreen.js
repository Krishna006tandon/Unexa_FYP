import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radio } from 'lucide-react-native';
import liveService from '../services/liveService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function WebGoLiveScreen() {
  const [title, setTitle] = useState('My Live Stream');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const create = async () => {
    setLoading(true);
    try {
      const res = await liveService.create(title);
      setCreated(res?.data);
    } catch (e) {
      Alert.alert('Go Live', e?.response?.data?.error || e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0A0A0A', '#120F24']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.body}>
        <Text style={styles.h1}>Go Live</Text>
        <Text style={styles.sub}>Generate a stream key and stream via OBS/RTMP app (no WebRTC).</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={THEME.textDim} />

        <TouchableOpacity style={styles.primaryBtn} onPress={create} disabled={loading}>
          <Radio color="#fff" size={18} />
          <Text style={styles.primaryText}>{loading ? 'Creating…' : 'Create Stream'}</Text>
        </TouchableOpacity>

        {created ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>RTMP</Text>
            <Text style={styles.mono}>Server: {created.rtmpUrl ? created.rtmpUrl.replace(/\/[^/]+$/, '') : ''}</Text>
            <Text style={styles.mono}>Stream Key: {created.streamKey}</Text>
            <Text style={[styles.cardTitle, { marginTop: 12 }]}>Playback</Text>
            <Text style={styles.mono}>{created.playbackUrl || ''}</Text>
            <Text style={styles.hint}>Tip: open the Viewer page to watch the stream on web.</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { padding: 16, gap: 12 },
  h1: { color: THEME.text, fontWeight: '900', fontSize: 22 },
  sub: { color: THEME.textDim, fontSize: 12, lineHeight: 18 },
  label: { color: THEME.textDim, fontSize: 12, fontWeight: '800', marginTop: 8 },
  input: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
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
    marginTop: 10,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 14,
  },
  cardTitle: { color: THEME.text, fontWeight: '900' },
  mono: { color: THEME.textDim, fontSize: 12, marginTop: 6 },
  hint: { marginTop: 10, color: THEME.textDim, fontSize: 12, lineHeight: 18 },
});

