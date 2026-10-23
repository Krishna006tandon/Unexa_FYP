import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Video } from 'expo-av';
import { Share } from 'react-native';
import { Heart, Volume2, VolumeX } from 'lucide-react-native';
import videoService from '../../services/videoService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
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
}) {
  const videoRef = useRef(null);
  const [statusLabel, setStatusLabel] = useState('');
  const [hasError, setHasError] = useState(false);

  const shouldRenderVideo = isActive && isTabActive;
  const playUri = item?.hlsUrl || item?.videoUrl;

  const retryPlayback = useCallback(() => {
    setHasError(false);
    setStatusLabel('Retrying...');
    if (videoRef.current) {
      videoRef.current
        .unloadAsync()
        .then(() => {
          if (playUri) {
            return videoRef.current.loadAsync(
              { uri: playUri },
              { shouldPlay: shouldRenderVideo, isLooping: true, isMuted: muted }
            );
          }
        })
        .then(() => {
          setStatusLabel('');
        })
        .catch((err) => {
          console.warn('Retry failed:', err?.message);
          setHasError(true);
          setStatusLabel('Tap to retry');
        });
    }
  }, [playUri, shouldRenderVideo, muted]);

  useEffect(() => {
    if (shouldRenderVideo) {
      setHasError(false);
      setStatusLabel('');
    } else {
      setHasError(false);
      setStatusLabel('');
    }
  }, [shouldRenderVideo, playUri]);

  return (
    <View style={[styles.reel, { height }]}>
      {playUri ? (
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.videoTap, { height }]}
          onPress={() => {
            if (hasError) {
              retryPlayback();
              return;
            }
            videoRef.current?.getStatusAsync?.().then((s) => {
              if (!s?.isLoaded) return;
              if (s.isPlaying) videoRef.current?.pauseAsync?.().catch(() => {});
              else videoRef.current?.playAsync?.().catch(() => {});
            }).catch(() => {});
          }}
        >
          {shouldRenderVideo ? (
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: playUri }}
              resizeMode="cover"
              shouldPlay={shouldRenderVideo}
              isLooping
              isMuted={muted}
              useNativeControls={false}
              progressUpdateIntervalMillis={500}
              onLoadStart={() => {
                setHasError(false);
                setStatusLabel('Loading...');
              }}
              onReadyForDisplay={() => {
                setHasError(false);
                setStatusLabel('');
              }}
              onPlaybackStatusUpdate={(st) => {
                if (!st?.isLoaded) {
                  if (st?.error) {
                    console.warn('Reel playback error:', st.error);
                    setHasError(true);
                    setStatusLabel('Video unavailable. Tap to retry');
                  }
                  return;
                }
                setHasError(false);
                if (st.isBuffering) setStatusLabel('Buffering...');
                else if (shouldRenderVideo && !st.isPlaying && !st.didJustFinish) setStatusLabel('Tap to play');
                else if (!st.isPlaying) setStatusLabel('');
              }}
              onError={(e) => {
                console.warn('Reel video error', e);
                setHasError(true);
                setStatusLabel('Video unavailable. Tap to retry');
              }}
            />
          ) : item?.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.video} resizeMode="cover" />
          ) : (
            <View style={[styles.video, styles.missing]}>
              <Text style={{ color: THEME.textDim, textAlign: 'center' }}>{item?.title || 'UNEXA Reel'}</Text>
            </View>
          )}

          {statusLabel && shouldRenderVideo ? (
            <TouchableOpacity
              activeOpacity={hasError ? 0.7 : 1}
              onPress={hasError ? retryPlayback : undefined}
              style={[styles.statusPill, hasError && styles.statusPillError]}
            >
              <Text style={styles.statusText} numberOfLines={2}>
                {statusLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={[styles.video, styles.missing]}>
          <Text style={{ color: THEME.textDim, textAlign: 'center' }}>Missing video URL</Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {item?.title || 'Reel'}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          @{item?.userId?.username || 'creator'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onToggleMute} hitSlop={10}>
          {muted ? <VolumeX size={22} color="#fff" /> : <Volume2 size={22} color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onLike} hitSlop={10}>
          <Heart size={22} color="#fff" />
          <Text style={styles.ctrlText}>{item?.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onShare} hitSlop={10}>
          <Text style={styles.ctrlTextOnly}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ReelsViewer({ navigation, isTabActive = true }) {
  const { height } = Dimensions.get('window');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 70, minimumViewTime: 80 }),
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
        console.warn('Reels feed error', e?.message);
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
        setItems((prev) => prev.map((it) => (it._id === itemId ? { ...it, likes: likes ?? it.likes } : it)));
      })
      .catch((e) => console.warn('Reel like error', e?.message));
  }, []);

  const onShare = useCallback((item) => {
    if (!item) return;
    const url = item?.hlsUrl || item?.videoUrl || '';
    Share.share({ message: url ? `Watch this reel: ${url}` : 'Check this reel on UNEXA' }).catch(() => {});
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
        height={height}
      />
    ),
    [activeIndex, isTabActive, muted, onToggleMute, onLike, onShare, height]
  );

  const keyExtractor = useCallback((it) => it._id, []);

  return (
    <View style={[styles.wrap, { height }]}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          if (hasMore && !loading) load();
        }}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          <View style={[styles.reel, styles.empty]}>
            <Text style={{ color: THEME.textDim }}>No reels yet.</Text>
          </View>
        }
      />

      {!navigation?.canGoBack?.() ? null : (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.bg },
  reel: { width: '100%', height: '100%', backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoTap: { width: '100%', height: '100%' },
  missing: { alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  statusPill: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statusPillError: {
    backgroundColor: 'rgba(185, 28, 28, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 26,
  },
  title: { color: THEME.text, fontWeight: '900', fontSize: 16 },
  sub: { color: THEME.textDim, marginTop: 6, fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.bg },
  controls: {
    position: 'absolute',
    right: 12,
    bottom: 96,
    gap: 12,
    alignItems: 'center',
  },
  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ctrlText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ctrlTextOnly: { color: '#fff', fontWeight: '900', fontSize: 12 },
  backBtn: {
    position: 'absolute',
    left: 14,
    top: 14,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: THEME.text, fontWeight: '900' },
});
