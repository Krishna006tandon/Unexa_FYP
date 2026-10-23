import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import postService from '../../services/postService';
import PostCard from './PostCard';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  textDim: '#A0A0A0',
};

export default function PostFeedList({ navigation }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ reset } = {}) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await postService.feed({ page: reset ? 1 : page, limit: 10 });
      const nextItems = res?.data?.items || [];
      setHasMore(!!res?.data?.hasMore);
      if (reset) {
        setItems(nextItems);
        setPage(2);
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
      console.warn('Posts feed error', e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [page, refreshing]);

  const like = useCallback(async (postId) => {
    try {
      const res = await postService.like(postId);
      const likes = res?.data?.likes;
      setItems((prev) => prev.map((p) => (p._id === postId ? { ...p, likes: likes ?? p.likes } : p)));
    } catch (e) {
      console.warn('Like post error', e?.message);
    }
  }, []);

  const handlePress = useCallback((postId) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  useEffect(() => {
    if (items.length === 0) {
      load({ reset: true });
    }
  }, []);

  const renderItem = useCallback(({ item }) => (
    <PostCard
      item={item}
      onLike={() => like(item._id)}
      onPress={() => handlePress(item._id)}
    />
  ), [like, handlePress]);

  const keyExtractor = useCallback((it) => it._id, []);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ reset: true })} tintColor={THEME.primary} />}
        renderItem={renderItem}
        onEndReached={() => {
          if (hasMore && !refreshing) load();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={{ paddingTop: 50 }}>
            <Text style={{ color: THEME.textDim, textAlign: 'center' }}>No posts yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.bg },
});
