import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Upload } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import VideoFeedList from '../../components/video/VideoFeedList';
import ReelsViewer from '../../components/video/ReelsViewer';
import PostFeedList from '../../components/posts/PostFeedList';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

const TABS = [
  { key: 'long', label: 'Long Videos' },
  { key: 'reels', label: 'Reels' },
  { key: 'posts', label: 'Posts' },
];

export default function UnifiedFeedScreen({ navigation }) {
  const [tab, setTab] = useState('long');

  const activeTitle = useMemo(() => {
    const found = TABS.find((t) => t.key === tab);
    return found?.label || 'Feed';
  }, [tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Feed"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : null}
        right={
          <TouchableOpacity
            onPress={() => {
              const routeNames = navigation?.getState?.()?.routeNames || [];
              const go = (screen, params) => {
                if (routeNames.includes(screen)) navigation.navigate(screen, params);
                else navigation.navigate('Videos', { screen, params });
              };

              if (tab === 'reels') go('UploadReel');
              else if (tab === 'posts') navigation.navigate('CreatePost');
              else go('UploadVideo');
            }}
            hitSlop={12}
          >
            <Upload color={THEME.text} size={20} />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'reels' ? (
          <ReelsViewer navigation={navigation} />
        ) : tab === 'posts' ? (
          <PostFeedList navigation={navigation} />
        ) : (
          <VideoFeedList
            navigation={navigation}
            title={activeTitle}
            mode={tab === 'long' ? 'long' : tab}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 6,
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: THEME.primary },
  tabText: { color: THEME.textDim, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  placeholderTitle: { color: THEME.text, fontWeight: '900', fontSize: 18, marginBottom: 8 },
  placeholderSub: { color: THEME.textDim, textAlign: 'center', lineHeight: 18, fontSize: 12 },
});
