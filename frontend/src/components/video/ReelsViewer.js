import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

function ReelItem({ item, isActive, muted, onToggleMute, onLike, onShare, height }) {
  const videoRef = useRef(null);
  const [statusLabel, setStatusLabel] = useState('');

  const playUri = item?.hlsUrl || item?.videoUrl;
  useEffect(() => {
    if (isActive) {
      console.log('[Reels] active uri:', (playUri || '').slice(0, 120));
    }
  }, [isActive, playUri]);

  return (
    <View style={[styles.reel, { height }]}>
      {playUri ? (
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.videoTap, { height }]}
          onPress={() => {
            // manual toggle play/pause
            videoRef.current?.getStatusAsync?.().then((s) => {
              if (!s?.isLoaded) return;
              if (s.isPlaying) videoRef.current?.pauseAsync?.().catch(() => {});
              else videoRef.current?.playAsync?.().catch(() => {});
            }).catch(() => {});
          }}
        >
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: playUri }}
            resizeMode="cover"
            shouldPlay={isActive}
            isLooping
            isMuted={muted}
            useNativeControls={false}
            progressUpdateIntervalMillis={500}
            onLoadStart={() => setStatusLabel('Loading...')}
            onReadyForDisplay={() => setStatusLabel('')}
            onPlaybackStatusUpdate={(st) => {
              if (!st?.isLoaded) {
                if (st?.error) setStatusLabel(`Error: ${st.error}`);
                return;
              }
              if (st.isBuffering) setStatusLabel('Buffering...');
              else if (isActive && !st.isPlaying && !st.didJustFinish) setStatusLabel('Tap to play');
              else if (!st.isPlaying) setStatusLabel('');
            }}
            onError={(e) => {
              console.warn('Reel video error', e);
              setStatusLabel('Error loading video');
            }}
          />
          {statusLabel ? (
            <View pointerEvents="none" style={styles.statusPill}>
              <Text style={styles.statusText} numberOfLines={2}>
                {statusLabel}
              </Text>
            </View>
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
}

export default function ReelsViewer({ navigation }) {
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
    const unsub = navigation?.addListener?.('focus', () => load({ reset: true }));
    load({ reset: true });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const likeActive = async () => {
    const current = items[activeIndex];
    if (!current?._id) return;
    try {
      const res = await videoService.like(current._id);
      const likes = res?.data?.likes;
      setItems((prev) => prev.map((it) => (it._id === current._id ? { ...it, likes: likes ?? it.likes } : it)));
    } catch (e) {
      console.warn('Reel like error', e?.message);
    }
  };

  const shareActive = async () => {
    const current = items[activeIndex];
    if (!current) return;
    const url = current?.hlsUrl || current?.videoUrl || '';
    try {
      await Share.share({ message: url ? `Watch this reel: ${url}` : 'Check this reel on UNEXA' });
    } catch (_) {}
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <FlatList
        data={items}
        keyExtractor={(it) => it._id}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={3}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIndex}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onLike={likeActive}
            onShare={shareActive}
            height={height}
          />
        )}
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
