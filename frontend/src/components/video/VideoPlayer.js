import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Video } from 'expo-av';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  AlertCircle,
} from 'lucide-react-native';
import { resolveMediaUrl, configureAudioForPlayback, formatVideoTime } from '../../utils/mediaUtils';

const THEME = {
  bg: '#000000',
  primary: '#7B61FF',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.7)',
  glass: 'rgba(0,0,0,0.65)',
  border: 'rgba(255,255,255,0.12)',
};

export default function VideoPlayer({
  uri,
  posterUri,
  autoReplay = false,
  autoPlay = true,
  style,
  resizeMode = 'contain',
}) {
  const videoRef = useRef(null);
  const controlsTimeout = useRef(null);

  const cleanUri = resolveMediaUrl(uri);
  const cleanPoster = resolveMediaUrl(posterUri);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isBuffering, setIsBuffering] = useState(true);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isEnded, setIsEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Configure audio session on mount & clean up video instance on unmount
  useEffect(() => {
    configureAudioForPlayback();

    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (videoRef.current) {
        videoRef.current.unloadAsync?.().catch(() => {});
      }
    };
  }, []);

  // Auto-hide controls after 3.5 seconds
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    setShowControls(true);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  const toggleControls = () => {
    if (showControls) {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      setShowControls(false);
    } else {
      resetControlsTimeout();
    }
  };

  const handlePlayPause = async () => {
    if (!videoRef.current) return;
    try {
      if (isEnded) {
        await videoRef.current.setPositionAsync(0);
        await videoRef.current.playAsync();
        setIsEnded(false);
        setIsPlaying(true);
      } else if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
      resetControlsTimeout();
    } catch (e) {
      console.warn('[VideoPlayer] play/pause error:', e.message);
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current) return;
    try {
      const nextMuted = !isMuted;
      await videoRef.current.setIsMutedAsync(nextMuted);
      setIsMuted(nextMuted);
      resetControlsTimeout();
    } catch (e) {
      console.warn('[VideoPlayer] toggleMute error:', e.message);
    }
  };

  const handleSeek = async (ratio) => {
    if (!videoRef.current || durationMillis <= 0) return;
    try {
      const targetMillis = Math.max(0, Math.min(durationMillis, Math.round(ratio * durationMillis)));
      await videoRef.current.setPositionAsync(targetMillis);
      setPositionMillis(targetMillis);
      resetControlsTimeout();
    } catch (e) {
      console.warn('[VideoPlayer] seek error:', e.message);
    }
  };

  const handleFullscreen = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.presentFullscreenPlayer) {
        await videoRef.current.presentFullscreenPlayer();
      }
    } catch (e) {
      console.warn('[VideoPlayer] fullscreen error:', e.message);
    }
  };

  const retryPlayback = async () => {
    setHasError(false);
    setErrorMessage('');
    setIsBuffering(true);
    setIsEnded(false);
    try {
      if (videoRef.current) {
        await videoRef.current.unloadAsync().catch(() => {});
        if (cleanUri) {
          await videoRef.current.loadAsync(
            { uri: cleanUri },
            { shouldPlay: true, isMuted }
          );
        }
      }
    } catch (err) {
      console.warn('[VideoPlayer] retry failed:', err.message);
      setHasError(true);
      setErrorMessage(err.message || 'Failed to play video');
      setIsBuffering(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (!status?.isLoaded) {
      if (status?.error) {
        console.warn('[VideoPlayer] status error:', status.error);
        setHasError(true);
        setErrorMessage(status.error);
        setIsBuffering(false);
      }
      return;
    }

    setIsLoaded(true);
    setIsBuffering(status.isBuffering);
    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis || 0);
    setDurationMillis(status.durationMillis || 0);

    if (hasError) setHasError(false);

    if (status.didJustFinish) {
      if (autoReplay) {
        videoRef.current?.setPositionAsync?.(0)
          .then(() => videoRef.current?.playAsync?.())
          .catch(() => {});
        setIsEnded(false);
      } else {
        setIsEnded(true);
        setShowControls(true);
      }
    } else if (isEnded && status.isPlaying) {
      setIsEnded(false);
    }
  };

  if (!cleanUri) {
    return (
      <View style={[styles.wrap, styles.placeholderWrap, style]}>
        <AlertCircle size={32} color={THEME.textDim} />
        <Text style={styles.placeholderText}>Video is not available</Text>
      </View>
    );
  }

  const progressPercent = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  return (
    <TouchableWithoutFeedback onPress={toggleControls}>
      <View style={[styles.wrap, style]}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: cleanUri }}
          posterSource={cleanPoster ? { uri: cleanPoster } : undefined}
          usePoster={!!cleanPoster}
          resizeMode={resizeMode}
          shouldPlay={autoPlay}
          isMuted={isMuted}
          useNativeControls={false}
          progressUpdateIntervalMillis={250}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          onError={(e) => {
            console.warn('[VideoPlayer] Video error:', e);
            setHasError(true);
            setErrorMessage(typeof e === 'string' ? e : 'Video playback error');
            setIsBuffering(false);
          }}
        />

        {/* Buffering Indicator */}
        {isBuffering && !hasError && !isEnded && (
          <View pointerEvents="none" style={styles.centerOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator color={THEME.primary} size="large" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        )}

        {/* Error Overlay with Retry */}
        {hasError && (
          <View style={styles.centerOverlay}>
            <View style={styles.errorBox}>
              <AlertCircle size={36} color="#FF4B4B" />
              <Text style={styles.errorTitle}>Playback Error</Text>
              <Text style={styles.errorSub} numberOfLines={2}>
                {errorMessage || 'Unable to play video at this time.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retryPlayback} activeOpacity={0.85}>
                <RotateCcw size={16} color="#FFF" />
                <Text style={styles.retryBtnText}>Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ended / Replay Overlay */}
        {isEnded && !hasError && (
          <View style={styles.centerOverlay}>
            <TouchableOpacity style={styles.replayCircle} onPress={handlePlayPause} activeOpacity={0.85}>
              <RotateCcw size={28} color="#FFF" />
              <Text style={styles.replayLabel}>Replay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && !hasError && !isEnded && (
          <View style={styles.controlsWrap} pointerEvents="box-none">
            {/* Center Play/Pause button */}
            <View style={styles.centerPlayWrap} pointerEvents="box-none">
              <TouchableOpacity style={styles.centerPlayBtn} onPress={handlePlayPause} activeOpacity={0.8}>
                {isPlaying ? <Pause size={30} color="#FFF" /> : <Play size={30} color="#FFF" style={{ marginLeft: 3 }} />}
              </TouchableOpacity>
            </View>

            {/* Bottom Controls Bar */}
            <View style={styles.bottomBar}>
              {/* Scrubbing Track */}
              <TouchableOpacity
                style={styles.progressBarTouch}
                activeOpacity={1}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // Estimate ratio based on touch location
                  const width = 300; // estimated fallback
                  handleSeek(Math.max(0, Math.min(1, locationX / width)));
                }}
              >
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  <View style={[styles.progressKnob, { left: `${Math.min(98, progressPercent)}%` }]} />
                </View>
              </TouchableOpacity>

              <View style={styles.bottomRow}>
                <View style={styles.bottomLeft}>
                  <TouchableOpacity onPress={handlePlayPause} hitSlop={10} style={styles.iconBtn}>
                    {isPlaying ? <Pause size={18} color="#FFF" /> : <Play size={18} color="#FFF" />}
                  </TouchableOpacity>
                  <Text style={styles.timeText}>
                    {formatVideoTime(positionMillis)} / {formatVideoTime(durationMillis)}
                  </Text>
                </View>

                <View style={styles.bottomRight}>
                  <TouchableOpacity onPress={toggleMute} hitSlop={10} style={styles.iconBtn}>
                    {isMuted ? <VolumeX size={18} color="#FFF" /> : <Volume2 size={18} color="#FFF" />}
                  </TouchableOpacity>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity onPress={handleFullscreen} hitSlop={10} style={styles.iconBtn}>
                      <Maximize2 size={18} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderWrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    gap: 8,
  },
  placeholderText: {
    color: THEME.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: THEME.glass,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,25,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,75,75,0.3)',
    maxWidth: '85%',
    gap: 8,
  },
  errorTitle: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  errorSub: {
    color: THEME.textDim,
    fontSize: 12,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  replayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(123, 97, 255, 0.85)',
    gap: 4,
  },
  replayLabel: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  controlsWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 5,
  },
  centerPlayWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  progressBarTouch: {
    width: '100%',
    paddingVertical: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 2,
  },
  progressKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginLeft: -6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  timeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
