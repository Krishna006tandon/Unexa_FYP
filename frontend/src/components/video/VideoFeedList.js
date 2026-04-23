import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, Upload } from 'lucide-react-native';
import VideoCard from './VideoCard';
import videoService from '../../services/videoService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function VideoFeedList({ navigation, title, mode }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const limit = useMemo(() => (mode === 'reels' ? 15 : 10), [mode]);
  const kind = useMemo(() => (mode === 'reels' ? 'reel' : mode === 'long' ? 'long' : null), [mode]);

  const load = async ({ reset } = {}) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // Backend currently exposes a single feed. Reels vs long-videos split is UI-only for now.
      const res = await videoService.feed({ page: reset ? 1 : page, limit, ...(kind ? { kind } : {}) });
      const nextItems = res?.data?.items || [];
      setHasMore(!!res?.data?.hasMore);
      if (reset) {
        setItems(nextItems);
        setPage(2);
      } else {
        setItems((prev) => [...prev, ...nextItems]);
        setPage((p) => p + 1);
      }
    } catch (e) {
      console.warn('Feed error', e?.message);
    } finally {
      setRefreshing(false);
    }
  };

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return load({ reset: true });
    setSearching(true);
    try {
      const res = await videoService.search(q, { ...(kind ? { kind } : {}) });
      setItems(res?.data?.items || []);
      setHasMore(false);
    } catch (e) {
      console.warn('Search error', e?.message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => load({ reset: true }));
    load({ reset: true });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={() => {
            const routeNames = navigation?.getState?.()?.routeNames || [];
            if (routeNames.includes('UploadVideo')) navigation.navigate('UploadVideo');
            else navigation.navigate('Videos', { screen: 'UploadVideo' });
          }}
          hitSlop={12}
        >
          <Upload color={THEME.text} size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search color={THEME.textDim} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search videos..."
            placeholderTextColor={THEME.textDim}
            style={styles.searchInput}
            onSubmitEditing={doSearch}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={searching}>
          <Text style={styles.searchBtnText}>{searching ? '...' : 'Go'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ reset: true })}
            tintColor={THEME.primary}
          />
        }
        renderItem={({ item }) => (
          <VideoCard
            item={item}
            onPress={() => {
              const routeNames = navigation?.getState?.()?.routeNames || [];
              if (routeNames.includes('VideoPlayer')) {
                navigation.navigate('VideoPlayer', { videoId: item._id });
              } else {
                navigation.navigate('Videos', { screen: 'VideoPlayer', params: { videoId: item._id } });
              }
            }}
          />
        )}
        onEndReached={() => {
          if (hasMore && !refreshing && !query.trim()) load();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={{ paddingTop: 50 }}>
            <Text style={{ color: THEME.textDim, textAlign: 'center' }}>No videos yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: { color: THEME.text, fontWeight: '900', fontSize: 18 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: { flex: 1, color: THEME.text, fontWeight: '600' },
  searchBtn: {
    width: 56,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '900' },
});
