import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Video } from 'expo-av';
import { Heart, Volume2, VolumeX, Share2, Play, AlertCircle, RotateCcw } from 'lucide-react-native';
import videoService from '../../services/videoService';
import { resolveMediaUrl, configureAudioForPlayback } from '../../utils/mediaUtils';
import { useResponsive } from '../../utils/responsive';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.72)',
};

const ReelItem = React.memo(function ReelItem({
  item,
  isActive,
  isTabActive = true,
  muted,
  onToggleMute,
  onLike,
  onShare,
  height,
  width,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const playIconAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);

  const shouldRenderVideo = isActive && isTabActive;
  const rawUri = item?.hlsUrl || item?.videoUrl;
  const playUri = resolveMediaUrl(rawUri);
  const thumbUri = resolveMediaUrl(item?.thumbnailUrl);

  // Initialize audio playback
  useEffect(() => {
    configureAudioForPlayback();
  }, []);

  // Clean unmount to prevent MediaCodec / decoder resource leaks
  useEffect(() => {
    return () => {
      videoRef.current?.unloadAsync?.().catch(() => {});
    };
  }, []);

  // Handle active / inactive transition
  useEffect(() => {
    if (!shouldRenderVideo) {
      setIsPlaying(false);
      videoRef.current?.pauseAsync?.().catch(() => {});
    } else {
      setIsPlaying(true);
      setHasError(false);
    }
  }, [shouldRenderVideo]);

  const triggerPlayIconAnim = () => {
    setShowPlayIcon(true);
    playIconAnim.setValue(0.9);
    Animated.sequence([
      Animated.timing(playIconAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(playIconAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setShowPlayIcon(false);
    });
  };

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap to like
      onLike();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    // Single tap to toggle play/pause
    if (videoRef.current) {
      videoRef.current.getStatusAsync?.().then((status) => {
        if (!status?.isLoaded) return;
        if (status.isPlaying) {
          videoRef.current.pauseAsync().catch(() => {});
          setIsPlaying(false);
        } else {
          videoRef.current.playAsync().catch(() => {});
          setIsPlaying(true);
        }
        triggerPlayIconAnim();
      }).catch(() => {});
    }
  };

  const retryPlayback = useCallback(() => {
    setHasError(false);
    setIsBuffering(true);
    if (videoRef.current && playUri) {
      videoRef.current
        .unloadAsync()
        .then(() =>
          videoRef.current.loadAsync(
            { uri: playUri },
            { shouldPlay: shouldRenderVideo, isLooping: true, isMuted: muted }
          )
        )
        .catch((err) => {
          console.warn('[ReelItem] retry failed:', err?.message);
          setHasError(true);
          setIsBuffering(false);
        });
    }
  }, [playUri, shouldRenderVideo, muted]);

  return (
    <View style={[styles.reel, { height, width }]}>
      {playUri ? (
        <TouchableWithoutFeedback onPress={handleTap}>
          <View style={[styles.videoTap, { height, width }]}>
            {shouldRenderVideo ? (
              <Video
                ref={videoRef}
                style={[styles.video, { height, width }]}
                source={{ uri: playUri }}
                posterSource={thumbUri ? { uri: thumbUri } : undefined}
                usePoster={!!thumbUri}
                resizeMode="cover"
                shouldPlay={shouldRenderVideo && isPlaying}
                isLooping
                isMuted={muted}
                useNativeControls={false}
                progressUpdateIntervalMillis={300}
                onLoadStart={() => {
                  setHasError(false);
                  setIsBuffering(true);
                }}
                onReadyForDisplay={() => {
                  setHasError(false);
                  setIsBuffering(false);
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (!status?.isLoaded) {
                    if (status?.error) {
                      console.warn('[ReelItem] playback error:', status.error);
                      setHasError(true);
                      setIsBuffering(false);
                    }
                    return;
                  }
                  setIsBuffering(status.isBuffering);
                  if (hasError) setHasError(false);
                }}
                onError={(e) => {
                  console.warn('[ReelItem] video load error:', e);
                  setHasError(true);
                  setIsBuffering(false);
                }}
              />
            ) : thumbUri ? (
              <Image source={{ uri: thumbUri }} style={[styles.video, { height, width }]} resizeMode="cover" />
            ) : (
              <View style={[styles.video, styles.missing, { height, width }]}>
                <Text style={styles.missingText}>{item?.title || 'UNEXA Reel'}</Text>
              </View>
            )}

            {/* Play/Pause Animated Badge */}
            {showPlayIcon && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.playBadgeWrap,
                  {
                    transform: [{ scale: playIconAnim }],
                    opacity: playIconAnim,
                  },
                ]}
              >
                <View style={styles.playBadge}>
                  {isPlaying ? <Play size={36} color="#FFF" style={{ marginLeft: 3 }} /> : <Play size={36} color="#FFF" />}
                </View>
              </Animated.View>
            )}

            {/* Buffering Indicator */}
            {isBuffering && shouldRenderVideo && !hasError && (
              <View pointerEvents="none" style={styles.centerSpinner}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            )}

            {/* Error Pill */}
            {hasError && shouldRenderVideo && (
              <TouchableOpacity style={styles.errorPill} onPress={retryPlayback} activeOpacity={0.85}>
                <RotateCcw size={15} color="#FFF" />
                <Text style={styles.errorText}>Video unavailable. Tap to retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <View style={[styles.video, styles.missing, { height, width }]}>
          <AlertCircle size={32} color={THEME.textDim} />
          <Text style={styles.missingText}>No video stream available</Text>
        </View>
      )}

      {/* Reel Bottom Meta Overlay */}
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.username} numberOfLines={1}>
          @{item?.userId?.username || 'creator'}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item?.title || 'UNEXA Reel'}
        </Text>
        {!!item?.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>

      {/* Right Side Vertical Action Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onToggleMute} hitSlop={10} activeOpacity={0.8}>
          {muted ? <VolumeX size={22} color="#fff" /> : <Volume2 size={22} color="#fff" />}
          <Text style={styles.ctrlSubText}>{muted ? 'Muted' : 'Sound'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={onLike} hitSlop={10} activeOpacity={0.8}>
          <Heart size={24} color={item?.liked ? THEME.accent : '#fff'} fill={item?.liked ? THEME.accent : 'transparent'} />
          <Text style={styles.ctrlText}>{item?.likes || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={onShare} hitSlop={10} activeOpacity={0.8}>
          <Share2 size={22} color="#fff" />
          <Text style={styles.ctrlSubText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ReelsViewer({ navigation, isTabActive = true }) {
  const { width: windowWidth, height: windowHeight, insets } = useResponsive();
  const [containerHeight, setContainerHeight] = useState(0);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  // Dynamic layout measurement so reel height strictly matches the visible container
  const onLayout = useCallback((e) => {
    const { height: h } = e.nativeEvent.layout;
    if (h > 100 && Math.abs(h - containerHeight) > 2) {
      setContainerHeight(Math.round(h));
    }
  }, [containerHeight]);

  // Fallback height if onLayout hasn't fired yet
  const effectiveHeight = containerHeight > 0
    ? containerHeight
    : windowHeight - (Platform.OS === 'ios' ? 180 + insets.bottom : 160);

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 60 }),
    []
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first?.index != null) setActiveIndex(first.index);
  }).current;

  const load = useCallback(
    async ({ reset } = {}) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await videoService.feed({ page: reset ? 1 : page, limit: 10, kind: 'reel' });
        const nextItems = res?.data?.items || [];
        setHasMore(!!res?.data?.hasMore);
        if (reset) {
          setItems(nextItems);
          setPage(2);
          setActiveIndex(0);
        } else {
          setItems((prev) => {
            const seen = new Set();
            const merged = [];
            for (const it of [...prev, ...nextItems]) {
              const id = it?._id;
              if (!id || seen.has(id)) continue;
              seen.add(id);
              merged.push(it);
            }
            return merged;
          });
          setPage((p) => p + 1);
        }
      } catch (e) {
        console.warn('[ReelsViewer] feed error:', e?.message);
      } finally {
        setLoading(false);
      }
    },
    [loading, page]
  );

  useEffect(() => {
    if (items.length === 0) {
      load({ reset: true });
    }
  }, []);

  const onToggleMute = useCallback(() => setMuted((m) => !m), []);

  const onLike = useCallback((itemId) => {
    if (!itemId) return;
    videoService.like(itemId)
      .then((res) => {
        const likes = res?.data?.likes;
        setItems((prev) =>
          prev.map((it) => (it._id === itemId ? { ...it, likes: likes ?? (it.likes || 0) + 1, liked: true } : it))
        );
      })
      .catch((e) => console.warn('[ReelsViewer] like error:', e?.message));
  }, []);

  const onShare = useCallback((item) => {
    if (!item) return;
    const url = resolveMediaUrl(item?.hlsUrl || item?.videoUrl) || '';
    Share.share({
      message: url ? `Check out this reel on UNEXA: ${url}` : 'Check out this reel on UNEXA',
    }).catch(() => {});
  }, []);

  const renderItem = useCallback(
    ({ item, index }) => (
      <ReelItem
        item={item}
        isActive={index === activeIndex}
        isTabActive={isTabActive}
        muted={muted}
        onToggleMute={onToggleMute}
        onLike={() => onLike(item._id)}
        onShare={() => onShare(item)}
        height={effectiveHeight}
        width={windowWidth}
      />
    ),
    [activeIndex, isTabActive, muted, onToggleMute, onLike, onShare, effectiveHeight, windowWidth]
  );

  const keyExtractor = useCallback((it) => it._id, []);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={effectiveHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_, index) => ({
          length: effectiveHeight,
          offset: effectiveHeight * index,
          index,
        })}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          if (hasMore && !loading) load();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={[styles.reel, styles.empty, { height: effectiveHeight }]}>
            {loading ? (
              <ActivityIndicator color={THEME.primary} size="large" />
            ) : (
              <Text style={{ color: THEME.textDim, fontSize: 14 }}>No reels available yet.</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: THEME.bg,
    overflow: 'hidden',
  },
  reel: {
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    backgroundColor: '#000',
  },
  videoTap: {
    backgroundColor: '#000',
  },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    gap: 10,
  },
  missingText: {
    color: THEME.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  playBadgeWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 30, 30, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 20,
  },
  errorText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 24,
    zIndex: 10,
  },
  username: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: THEME.textDim,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 30,
    gap: 14,
    alignItems: 'center',
    zIndex: 15,
  },
  ctrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 10,
    marginTop: 2,
  },
  ctrlSubText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 9,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
