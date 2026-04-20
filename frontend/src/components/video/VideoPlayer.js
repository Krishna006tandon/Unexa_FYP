import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';

const THEME = { bg: '#0A0A0A', primary: '#7B61FF' };

export default function VideoPlayer({ uri, posterUri }) {
  if (!uri) return null;
  return (
    <View style={styles.wrap}>
      <Video
        style={styles.video}
        source={{ uri }}
        posterSource={posterUri ? { uri: posterUri } : undefined}
        usePoster={!!posterUri}
        resizeMode="contain"
        shouldPlay
        useNativeControls
        onError={(e) => console.warn('Video error', e)}
      />
      <View pointerEvents="none" style={styles.loading}>
        <ActivityIndicator color={THEME.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 18, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  loading: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0 },
});

