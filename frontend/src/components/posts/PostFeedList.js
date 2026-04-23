import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
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

  const load = async ({ reset } = {}) => {
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
        setItems((prev) => [...prev, ...nextItems]);
        setPage((p) => p + 1);
      }
    } catch (e) {
      console.warn('Posts feed error', e?.message);
    } finally {
      setRefreshing(false);
    }
  };

  const like = async (postId) => {
    try {
      const res = await postService.like(postId);
      const likes = res?.data?.likes;
      setItems((prev) => prev.map((p) => (p._id === postId ? { ...p, likes: likes ?? p.likes } : p)));
    } catch (e) {
      console.warn('Like post error', e?.message);
    }
  };

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => load({ reset: true }));
    load({ reset: true });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={items}
        keyExtractor={(it) => it._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ reset: true })} tintColor={THEME.primary} />}
        renderItem={({ item }) => (
          <PostCard
            item={item}
            onLike={() => like(item._id)}
            onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
          />
        )}
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
