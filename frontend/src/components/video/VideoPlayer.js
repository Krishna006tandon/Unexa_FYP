import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { Video } from 'expo-av';

const THEME = { bg: '#0A0A0A', primary: '#7B61FF' };

export default function VideoPlayer({ uri, posterUri, autoReplay = false }) {
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  if (!uri) return null;
  return (
    <View style={styles.wrap}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri }}
        posterSource={posterUri ? { uri: posterUri } : undefined}
        usePoster={!!posterUri}
        resizeMode="contain"
        shouldPlay
        useNativeControls
        onPlaybackStatusUpdate={(status) => {
          if (!status?.isLoaded) return;
          if (status.didJustFinish) {
            if (autoReplay) {
              videoRef.current?.setPositionAsync?.(0).then(() => videoRef.current?.playAsync?.()).catch(() => {});
              setEnded(false);
            } else {
              setEnded(true);
            }
          } else if (ended && status.isPlaying) {
            setEnded(false);
          }
        }}
        onError={(e) => console.warn('Video error', e)}
      />
      <View pointerEvents="none" style={styles.loading}>
        <ActivityIndicator color={THEME.primary} />
      </View>

      {ended ? (
        <TouchableOpacity
          style={styles.replay}
          onPress={() => {
            setEnded(false);
            videoRef.current?.setPositionAsync?.(0).then(() => videoRef.current?.playAsync?.()).catch(() => {});
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.replayText}>Replay</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 18, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  loading: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0 },
  replay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  replayText: {
    color: '#fff',
    fontWeight: '900',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
