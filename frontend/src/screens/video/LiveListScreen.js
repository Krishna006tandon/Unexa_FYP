import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Radio } from 'lucide-react-native';
import liveService from '../../services/liveService';
import LiveCard from '../../components/video/LiveCard';
import ScreenHeader from '../../components/video/ScreenHeader';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
};

export default function LiveListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await liveService.active();
      setItems(res?.data || []);
    } catch (e) {
      console.warn('Live list error', e?.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Live Streams" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <TouchableOpacity style={styles.goLive} onPress={() => navigation.navigate('LiveScreen')}>
          <Radio color={THEME.accent} size={18} />
          <Text style={styles.goLiveText}>Go Live</Text>
        </TouchableOpacity>

        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={THEME.primary} />}
          renderItem={({ item }) => (
            <LiveCard
              item={item}
              onPress={() =>
                navigation.navigate('WatchLiveScreen', {
                  playbackId: item.playbackId,
                  playbackUrl: item.playbackUrl,
                  title: item.title,
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 50 }}>
              <Text style={{ color: THEME.textDim, textAlign: 'center' }}>No live streams right now.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  goLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,59,92,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.25)',
    marginBottom: 12,
  },
  goLiveText: { color: THEME.accent, fontWeight: '900' },
});
