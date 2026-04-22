import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ENVIRONMENT from '../config/environment';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function WebLiveViewerScreen({ navigation }) {
  const livewebUrl = useMemo(() => `${ENVIRONMENT.API_URL.replace(/\/$/, '')}/liveweb/`, []);

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: THEME.text, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>
          Web viewer is available on Web only.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#0A0A0A', '#120F24']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.top}>
        <Text style={styles.title}>Live Streams</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.openBtn} onPress={() => window.open(livewebUrl, '_blank')}>
            <Text style={styles.openText}>Open Fullscreen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goBtn} onPress={() => navigation.navigate('GoLive')}>
            <Text style={styles.openText}>Go Live</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.frameWrap}>
        <iframe title="UNEXA Live" src={livewebUrl} style={styles.iframe} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: THEME.text, fontWeight: '900', fontSize: 18 },
  openBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  goBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(123,97,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.25)',
  },
  openText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  frameWrap: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border },
  iframe: { width: '100%', height: '100%', border: '0px' },
});
