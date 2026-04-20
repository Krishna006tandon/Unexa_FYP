import React, { useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Radio } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
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

export default function LiveScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('My Live Stream');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const username = useMemo(() => user?.username || user?.name || 'Creator', [user]);

  const goLive = async () => {
    setLoading(true);
    try {
      const res = await liveService.create(title);
      setCreated(res?.data);
    } catch (e) {
      Alert.alert('Mux Live', e?.response?.data?.error || e?.message || 'Failed to create live stream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0A0A0A', '#120F24']} style={styles.gradient} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Go Live (Mux)</Text>
        <Text style={styles.sub}>Create a cloud live stream and broadcast with OBS.</Text>

        <Text style={styles.label}>Stream title</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={THEME.textDim} />

        <TouchableOpacity style={styles.primaryBtn} onPress={goLive} disabled={loading}>
          <Radio color="#fff" size={18} />
          <Text style={styles.primaryText}>{loading ? 'Creating…' : 'Go Live'}</Text>
        </TouchableOpacity>

        {created ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OBS Setup</Text>
            <Text style={styles.mono}>Server: {created.rtmpUrl || 'rtmp://global-live.mux.com/app'}</Text>
            <Text style={styles.mono}>Stream Key: {created.streamKey}</Text>

            <Text style={[styles.cardTitle, { marginTop: 14 }]}>Playback</Text>
            <Text style={styles.mono}>Playback ID: {created.playbackId}</Text>
            <Text style={styles.hint}>
              Viewers can watch: https://stream.mux.com/{created.playbackId}.m3u8 (HLS)
            </Text>

            <TouchableOpacity
              style={styles.watchBtn}
              onPress={() => navigation.navigate('WatchLiveScreen', { playbackId: created.playbackId, title })}
            >
              <Text style={styles.watchText}>Preview Stream</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.hint}>
            OBS Server is always `rtmp://global-live.mux.com/app`. Your backend returns a unique Stream Key.
          </Text>
        )}

        <Text style={styles.footer}>Signed in as {username}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  gradient: { ...StyleSheet.absoluteFillObject },
  body: { padding: 16, paddingBottom: 30 },
  title: { color: THEME.text, fontWeight: '900', fontSize: 24 },
  sub: { color: THEME.textDim, marginTop: 6, fontSize: 12, lineHeight: 18 },
  label: { color: THEME.textDim, fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 8 },
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
    marginTop: 12,
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
  watchBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchText: { color: '#fff', fontWeight: '900' },
  footer: { marginTop: 18, color: THEME.textDim, fontSize: 12 },
});

