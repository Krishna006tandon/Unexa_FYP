import React, { useState, useContext, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AuthContext } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import ENVIRONMENT from '../config/environment';
import { useUI } from '../context/UIContext';

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  }
};

const StoriesListScreen = ({ navigation }) => {
  const [storiesData, setStoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(AuthContext);
  const { socket } = useProfile();
  const { showAlert } = useUI();

  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [pendingAsset, setPendingAsset] = useState(null);

  useEffect(() => {
    fetchStories();
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStories();
    });

    if (socket) {
      socket.on('new_story', fetchStories);
    }

    return () => {
      unsubscribe();
      if (socket) socket.off('new_story', fetchStories);
    };
  }, [navigation, socket]);

  const fetchStories = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/story`, config);
      setStoriesData(data);
    } catch (error) {
      console.log('Error fetching stories:', error);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 30, // Limit story video to 30 seconds
      });

      if (!result.canceled && result.assets[0]) {
        promptPrivacy(result.assets[0]);
      }
    } catch (error) {
       showAlert('Error', 'Failed to pick media', 'error');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        promptPrivacy(result.assets[0]);
      }
    } catch (error) {
       showAlert('Error', 'Failed to take photo', 'error');
    }
  };

  const takeVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0]) {
        promptPrivacy(result.assets[0]);
      }
    } catch (error) {
       showAlert('Error', 'Failed to take video', 'error');
    }
  };

  const promptPrivacy = (asset) => {
    setPendingAsset(asset);
    setShowOptions(false);
    setShowPrivacy(true);
  };

  const processUpload = async (asset, isCloseFriends) => {
    setUploading(true);
    
    try {
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      
      const formData = new FormData();
      formData.append('media', {
        uri: asset.uri,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        name: asset.fileName || (mediaType === 'video' ? `story_${Date.now()}.mp4` : `story_${Date.now()}.jpg`),
      });
      
      const config = { 
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000, // 30 second timeout
      };
      
      console.log('Uploading to:', `${ENVIRONMENT.API_URL}/api/upload`);
      
      // Upload media first
      const uploadResponse = await axios.post(`${ENVIRONMENT.API_URL}/api/upload`, formData, config);
      const mediaUrl = uploadResponse.data.mediaUrl;
      
      // Then create story
      const storyData = {
        mediaUrl,
        mediaType,
        caption: '', // You can add caption input later
        duration: asset.type === 'video' ? 15 : 5,
        isCloseFriends
      };
      
      const storyConfig = { 
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 second timeout
      };
      
      await axios.post(`${ENVIRONMENT.API_URL}/api/story/upload`, storyData, storyConfig);
      
      showAlert('Success', 'Story uploaded successfully!', 'success');
      fetchStories(); // Refresh stories
    } catch (error) {
      console.log('Upload error:', error);
      
      let errorMessage = 'Failed to upload story';
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network Error: Cannot connect to server.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid file format';
      }
      
      showAlert('Error', errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const showUploadOptions = () => {
    setShowOptions(true);
  };

  const renderStoryItem = ({ item }) => {
    const latestStory = item.stories[0];
    const isViewed = !item.hasUnviewed;
    
    return (
      <TouchableOpacity 
        style={styles.storyItem}
        onPress={() => navigation.navigate('StoryScreen', { 
          stories: item.stories, 
          token: user.token 
        })}
      >
        <LinearGradient 
          colors={isViewed ? ['#333', '#555'] : latestStory?.isCloseFriends ? ['#1DB954', '#1AA34A'] : [THEME.colors.primary, THEME.colors.secondary]}
          style={styles.storyRing}
        >
          <Image source={{ uri: item.user.avatar || item.user.profilePhoto || 'https://i.pravatar.cc/150' }} style={styles.storyAvatar} />
        </LinearGradient>
        <Text style={styles.storyUsername} numberOfLines={1}>
          {item.user.username}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAddStoryItem = () => (
    <TouchableOpacity style={styles.storyItem} onPress={showUploadOptions}>
      <View style={[styles.storyRing, styles.addStoryRing]}>
        <Plus color={THEME.colors.text} size={24} />
      </View>
      <Text style={styles.storyUsername}>Your Story</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Stories</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={storiesData}
        renderItem={renderStoryItem}
        keyExtractor={(item) => item.user._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={renderAddStoryItem}
        contentContainerStyle={styles.storiesList}
      />
      
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.uploadingText}>Uploading story...</Text>
        </View>
      )}

      {/* Add Story Options Modal */}
      <Modal visible={showOptions} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowOptions(false)} activeOpacity={1}>
          <BlurView intensity={100} tint="dark" style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Add to Story</Text>
            
            <TouchableOpacity style={styles.optionBtn} onPress={takePhoto}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(123, 97, 255, 0.1)' }]}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/685/685655.png' }} style={styles.miniIcon} />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={takeVideo}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(61, 220, 255, 0.1)' }]}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png' }} style={styles.miniIcon} />
              </View>
              <Text style={styles.optionText}>Record Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1375/1375106.png' }} style={styles.miniIcon} />
              </View>
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacy} transparent animationType="fade">
        <View style={styles.privacyOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>Story Privacy</Text>
            <Text style={styles.privacySubtitle}>Who should see your updates?</Text>
            
            <TouchableOpacity 
              style={styles.privacyOption} 
              onPress={() => { setShowPrivacy(false); processUpload(pendingAsset, false); }}
            >
              <LinearGradient colors={['rgba(123, 97, 255, 0.2)', 'rgba(61, 220, 255, 0.1)']} style={styles.privacyGrad}>
                <Text style={styles.privacyOptionTitle}>Public Story 🌍</Text>
                <Text style={styles.privacyOptionDesc}>All your followers can see this</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.privacyOption} 
              onPress={() => { setShowPrivacy(false); processUpload(pendingAsset, true); }}
            >
              <LinearGradient colors={['rgba(29, 185, 84, 0.2)', 'rgba(29, 185, 84, 0.05)']} style={styles.privacyGrad}>
                <Text style={[styles.privacyOptionTitle, { color: '#1DB954' }]}>Close Friends 💚</Text>
                <Text style={styles.privacyOptionDesc}>Only selected inner circle can see</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.privacyCancel} onPress={() => setShowPrivacy(false)}>
              <Text style={styles.privacyCancelText}>Cancel</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

export default StoriesListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 65,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  storiesList: {
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  storyRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  addStoryRing: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#1E1E1E',
  },
  storyUsername: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    maxWidth: 72,
    textAlign: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  miniIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFF',
  },
  optionText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  privacyOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 25,
  },
  privacyCard: {
    width: '100%',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  privacyTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  privacySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    marginBottom: 30,
  },
  privacyOption: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
  },
  privacyGrad: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  privacyOptionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  privacyOptionDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  privacyCancel: {
    marginTop: 10,
    padding: 10,
  },
  privacyCancelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '600',
  },
});
