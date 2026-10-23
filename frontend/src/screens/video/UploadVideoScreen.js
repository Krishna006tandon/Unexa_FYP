import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Upload, FileVideo, Image as ImageIcon, X } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
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

export default function UploadVideoScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    setFile(asset);
    if (!title) setTitle(asset.name?.replace(/\.[^/.]+$/, '') || 'My Video');
  };

  const pickThumbnail = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission', 'Media library permission is required to pick a thumbnail.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        exif: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setThumbnail(asset);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to pick thumbnail');
    }
  };

  const upload = async () => {
    if (!file?.uri) return Alert.alert('Upload', 'Pick a video first.');
    if (!title.trim()) return Alert.alert('Upload', 'Add a title.');
    if ((file?.size || 0) > 290 * 1024 * 1024) {
      return Alert.alert('Upload', 'This video is too large (limit ~290MB). Please pick a smaller file.');
    }
    setLoading(true);
    try {
      console.log('[UploadVideo] picking asset:', {
        name: file?.name,
        size: file?.size,
        mimeType: file?.mimeType,
        uri: (file?.uri || '').slice(0, 80),
        thumbnail: thumbnail?.uri ? (thumbnail.uri.slice(0, 80)) : null,
      });
      const res = await videoService.upload({
        uri: file.uri,
        title: title.trim(),
        description: description.trim(),
        name: file.name,
        type: file.mimeType,
        kind: 'long',
        thumbnailUri: thumbnail?.uri || null,
        thumbnailName: thumbnail?.fileName || thumbnail?.name,
        thumbnailType: thumbnail?.mimeType || thumbnail?.type,
      });
      Alert.alert('Uploaded', 'Your video is live in the feed.');
      navigation.navigate('VideoPlayer', { videoId: res?.data?._id });
    } catch (e) {
      console.log('[UploadVideo] error', {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      const hint =
        (file?.uri || '').startsWith('content://')
          ? 'Hint: Android content:// URIs sometimes fail. We can copy-to-cache before upload.'
          : (file?.size || 0) > 80 * 1024 * 1024
            ? 'Hint: Large uploads may fail on Render/proxy limits. Try a smaller video.'
            : 'Hint: Check API_URL and backend is reachable.';
      Alert.alert('Upload Failed', `${status ? `HTTP ${status}. ` : ''}${serverMsg || e?.message || 'Network error'}\n\n${hint}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Upload Video" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.pickBtn} onPress={pick} disabled={loading}>
          <FileVideo color="#fff" size={18} />
          <Text style={styles.pickText}>{file?.name ? `Selected: ${file.name}` : 'Pick a video file'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Video title"
          placeholderTextColor={THEME.textDim}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
          multiline
          placeholder="Video description (optional)"
          placeholderTextColor={THEME.textDim}
        />

        <Text style={styles.label}>Thumbnail (Optional)</Text>
        {thumbnail?.uri ? (
          <View style={styles.thumbContainer}>
            <Image source={{ uri: thumbnail.uri }} style={styles.thumbPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeThumbBtn} onPress={() => setThumbnail(null)} disabled={loading}>
              <X color="#fff" size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeThumbBtn} onPress={pickThumbnail} disabled={loading}>
              <Text style={styles.changeThumbText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickThumbBtn} onPress={pickThumbnail} disabled={loading}>
            <ImageIcon color="#fff" size={18} />
            <Text style={styles.pickThumbText}>Add Custom Thumbnail (16:9)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.uploadBtn} onPress={upload} disabled={loading}>
          <Upload color="#fff" size={18} />
          <Text style={styles.uploadText}>{loading ? 'Uploading...' : 'Upload'}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Tip: Enable `VIDEO_TRANSCODE_HLS=true` in backend to generate HLS for uploaded videos (slower but scalable).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: THEME.primary,
  },
  pickText: { color: '#fff', fontWeight: '900', flex: 1 },
  label: { color: THEME.textDim, fontSize: 12, fontWeight: '700', marginTop: 6 },
  input: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
  },
  thumbContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    position: 'relative',
  },
  thumbPreview: {
    width: '100%',
    height: '100%',
  },
  removeThumbBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeThumbBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  changeThumbText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pickThumbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  pickThumbText: {
    color: '#fff',
    fontWeight: '700',
  },
  uploadBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  uploadText: { color: '#fff', fontWeight: '900' },
  hint: { color: THEME.textDim, fontSize: 12, lineHeight: 18, marginTop: 6 },
});
