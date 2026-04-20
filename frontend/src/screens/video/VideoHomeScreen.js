import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Radio, Upload, Play } from 'lucide-react-native';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function VideoHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>UNEXA Video</Text>
        <Text style={styles.hSub}>Live streams + uploads • RTMP → HLS</Text>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('LiveList')}>
          <Radio color={THEME.accent} size={26} />
          <Text style={styles.tileTitle}>Live Streams</Text>
          <Text style={styles.tileSub}>Watch now + chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('VideoFeed')}>
          <Play color={THEME.primary} size={26} />
          <Text style={styles.tileTitle}>Video Feed</Text>
          <Text style={styles.tileSub}>Browse uploads</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, styles.wide]} onPress={() => navigation.navigate('LiveScreen')}>
          <Radio color={THEME.accent} size={22} />
          <Text style={styles.wideTitle}>Go Live</Text>
          <Text style={styles.wideSub}>Generate a stream key</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tile, styles.wide]} onPress={() => navigation.navigate('UploadVideo')}>
          <Upload color={THEME.primary} size={22} />
          <Text style={styles.wideTitle}>Upload Video</Text>
          <Text style={styles.wideSub}>Thumbnail + metadata</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg, paddingHorizontal: 16 },
  header: { paddingTop: 14, paddingBottom: 18 },
  hTitle: { color: THEME.text, fontSize: 24, fontWeight: '900' },
  hSub: { color: THEME.textDim, marginTop: 6, fontSize: 12 },
  grid: { gap: 12 },
  tile: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 16,
    minHeight: 110,
    justifyContent: 'center',
  },
  wide: { minHeight: 86 },
  tileTitle: { color: THEME.text, fontWeight: '900', fontSize: 16, marginTop: 12 },
  tileSub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },
  wideTitle: { color: THEME.text, fontWeight: '900', fontSize: 15, marginTop: 10 },
  wideSub: { color: THEME.textDim, fontSize: 12, marginTop: 2 },
});
