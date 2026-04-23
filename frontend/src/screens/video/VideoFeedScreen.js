import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import VideoFeedList from '../../components/video/VideoFeedList';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function VideoFeedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Video Feed" onBack={() => navigation.goBack()} />
      <VideoFeedList navigation={navigation} title="Video Feed" mode="long" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
});
