import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Radio, Upload, Play, Film } from 'lucide-react-native';
import { useResponsive } from '../../utils/responsive';

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
  const { isTablet, maxContentWidth } = useResponsive();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.hTitle}>UNEXA Video</Text>
          <Text style={styles.hSub}>Live streams + uploads • RTMP → HLS</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate('LiveList')}
            activeOpacity={0.85}
          >
            <Radio color={THEME.accent} size={28} />
            <Text style={styles.tileTitle}>Live Streams</Text>
            <Text style={styles.tileSub}>Watch now + real-time chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigation.navigate('UnifiedFeed')}
            activeOpacity={0.85}
          >
            <Play color={THEME.primary} size={28} />
            <Text style={styles.tileTitle}>Feed</Text>
            <Text style={styles.tileSub}>Long videos • reels • community posts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, styles.wide]}
            onPress={() => navigation.navigate('LiveScreen')}
            activeOpacity={0.85}
          >
            <Radio color={THEME.accent} size={24} />
            <Text style={styles.wideTitle}>Go Live</Text>
            <Text style={styles.wideSub}>Broadcast stream with RTMP key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, styles.wide]}
            onPress={() => navigation.navigate('UploadVideo')}
            activeOpacity={0.85}
          >
            <Upload color={THEME.primary} size={24} />
            <Text style={styles.wideTitle}>Upload Video</Text>
            <Text style={styles.wideSub}>Video file + thumbnail + title</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, styles.wide]}
            onPress={() => navigation.navigate('UploadReel')}
            activeOpacity={0.85}
          >
            <Film color="#3DDCFF" size={24} />
            <Text style={styles.wideTitle}>Upload Reel</Text>
            <Text style={styles.wideSub}>Vertical short video (9:16)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 18 },
  hTitle: { color: THEME.text, fontSize: 26, fontWeight: '900' },
  hSub: { color: THEME.textDim, marginTop: 6, fontSize: 13 },
  grid: { gap: 12 },
  tile: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 18,
    minHeight: 110,
    justifyContent: 'center',
  },
  wide: { minHeight: 88 },
  tileTitle: { color: THEME.text, fontWeight: '900', fontSize: 17, marginTop: 12 },
  tileSub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },
  wideTitle: { color: THEME.text, fontWeight: '900', fontSize: 16, marginTop: 10 },
  wideSub: { color: THEME.textDim, fontSize: 12, marginTop: 2 },
});
