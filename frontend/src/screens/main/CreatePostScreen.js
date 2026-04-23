import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, Upload, X } from 'lucide-react-native';
import ScreenHeader from '../../components/video/ScreenHeader';
import postService from '../../services/postService';

const THEME = {
  bg: '#0A0A0A',
  primary: '#7B61FF',
  accent: '#FF3B5C',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
};

export default function CreatePostScreen({ navigation }) {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Media library permission is required.');

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    setImage(asset);
  };

  const submit = async () => {
    if (!caption.trim() && !image?.uri) return Alert.alert('Post', 'Add a caption or an image.');
    setLoading(true);
    try {
      await postService.create({
        caption: caption.trim(),
        imageUri: image?.uri,
        imageName: image?.fileName,
        imageType: image?.mimeType,
      });
      Alert.alert('Posted', 'Your post is live.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Post', e?.response?.data?.error || e?.message || 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Create Post" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.label}>Caption</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]}
          multiline
          placeholder="What's on your mind?"
          placeholderTextColor={THEME.textDim}
        />

        <View style={styles.imageBox}>
          {image?.uri ? (
            <>
              <Image source={{ uri: image.uri }} style={styles.preview} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImage(null)}>
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.pickImgBtn} onPress={pickImage} disabled={loading}>
              <ImageIcon size={18} color="#fff" />
              <Text style={styles.pickImgText}>Add Image (optional)</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.postBtn} onPress={submit} disabled={loading}>
          <Upload size={18} color="#fff" />
          <Text style={styles.postText}>{loading ? 'Posting...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, padding: 16, gap: 12 },
  label: { color: THEME.textDim, fontSize: 12, fontWeight: '700' },
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    color: THEME.text,
  },
  imageBox: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickImgBtn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: THEME.primary, borderRadius: 16 },
  pickImgText: { color: '#fff', fontWeight: '900' },
  preview: { width: '100%', height: 260, backgroundColor: '#111' },
  removeImg: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: { height: 52, borderRadius: 18, backgroundColor: THEME.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 6 },
  postText: { color: '#fff', fontWeight: '900' },
});
