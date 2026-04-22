import React, { useContext, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView, Share } from 'react-native';
import { Radio } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
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
  const { socket } = useContext(ProfileContext);
  const [title, setTitle] = useState('My Live Stream');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [status, setStatus] = useState('idle');

  const username = useMemo(() => user?.username || user?.name || 'Creator', [user]);

  const goLive = async () => {
    setLoading(true);
    try {
      const res = await liveService.create(title);
      setCreated(res?.data);
      setStatus(res?.data?.status || 'idle');
    } catch (e) {
      Alert.alert('Mux Live', e?.response?.data?.error || e?.message || 'Failed to create live stream');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!socket || !created?._id) return;
    const onStatus = (p) => {
      if (p?.streamId === created._id) setStatus(p.status || 'idle');
    };
    socket.on('live:status', onStatus);
    return () => socket.off('live:status', onStatus);
  }, [socket, created?._id]);

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
            <Text style={styles.mono}>
              Server:{' '}
                {created.provider === 'mux'
                  ? (created.rtmpUrl || 'rtmp://global-live.mux.com/app')
                  : created.rtmpUrl
                    ? created.rtmpUrl.replace(/\/[^/]+$/, '')
                    : ''}
            </Text>
            <Text style={styles.mono}>Stream Key: {created.streamKey}</Text>
            <Text style={styles.mono}>Status: {status}</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() =>
                Share.share({
                  message:
                    `UNEXA Live (OBS)\n\nServer: ${
                      created.provider === 'mux'
                        ? created.rtmpUrl || 'rtmp://global-live.mux.com/app'
                        : created.rtmpUrl
                          ? created.rtmpUrl.replace(/\/[^/]+$/, '')
                          : ''
                    }\nStream Key: ${created.streamKey}\nPlayback: ${created.playbackUrl || ''}`,
                })
              }
            >
              <Text style={styles.shareText}>Share OBS Details</Text>
            </TouchableOpacity>

            <Text style={[styles.cardTitle, { marginTop: 14 }]}>Playback</Text>
            {created.playbackId ? <Text style={styles.mono}>Playback ID: {created.playbackId}</Text> : null}
            {created.playbackUrl ? <Text style={styles.mono}>Playback URL: {created.playbackUrl}</Text> : null}
            <Text style={styles.hint}>
              Viewers can watch HLS using the Playback URL (hybrid) or `https://stream.mux.com/&lt;playbackId&gt;.m3u8` (Mux).
            </Text>

            <TouchableOpacity
              style={styles.watchBtn}
              onPress={() =>
                navigation.navigate('WatchLiveScreen', {
                  playbackId: created.playbackId,
                  playbackUrl: created.playbackUrl,
                  streamId: created._id,
                  provider: created.provider,
                  title,
                })
              }
            >
              <Text style={styles.watchText}>Preview Stream</Text>
            </TouchableOpacity>

            <View style={styles.sep} />
            <Text style={styles.cardTitle}>Mobile Broadcaster (No WebRTC)</Text>
            <Text style={styles.hint}>
              For camera/screen-share from mobile, use an RTMP broadcaster app (Larix / Prism Live / Streamlabs).
              Use the same Server + Stream Key above. If you want mobile to stream from outside your Wi‑Fi,
              expose RTMP via `ngrok tcp 1935` and set backend `RTMP_BASE_URL` to that public RTMP.
            </Text>
            <TouchableOpacity
              style={styles.watchBtn}
              onPress={() =>
                navigation.navigate('MobileBroadcastScreen', {
                  provider: created.provider,
                  rtmpUrl: created.rtmpUrl,
                  streamKey: created.streamKey,
                  title,
                })
              }
            >
              <Text style={styles.watchText}>Start In‑App Camera Live</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareBtnAlt}
              onPress={() =>
                navigation.navigate('ScreenShareBroadcastScreen', {
                  provider: created.provider,
                  rtmpUrl: created.rtmpUrl,
                  streamKey: created.streamKey,
                  title: `${title} (Screen)`,
                })
              }
            >
              <Text style={styles.shareText}>Start In‑App Screen Share (Android)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareBtnAlt}
              onPress={() =>
                Share.share({
                  message:
                    `UNEXA Live (Mobile RTMP)\n\nServer: ${
                      created.provider === 'mux'
                        ? 'rtmp://global-live.mux.com/app'
                        : created.rtmpUrl
                          ? created.rtmpUrl.replace(/\/[^/]+$/, '')
                          : ''
                    }\nStream Key: ${created.streamKey}\n\nTip: In Larix, choose Screen Broadcast or Camera and paste these.`,
                })
              }
            >
              <Text style={styles.shareText}>Share Mobile RTMP</Text>
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
  shareBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnAlt: {
    marginTop: 12,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(123,97,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { color: THEME.text, fontWeight: '900' },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 16, marginBottom: 16 },
  footer: { marginTop: 18, color: THEME.textDim, fontSize: 12 },
});
