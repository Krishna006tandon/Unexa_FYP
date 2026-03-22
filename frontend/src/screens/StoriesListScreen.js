import React, { useState, useContext, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_URL } from './AuthScreen';
import { NetworkDiagnostic } from '../utils/networkDiagnostic';

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

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${API_URL}/api/story`, config);
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
      });

      if (!result.canceled && result.assets[0]) {
        uploadStory(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
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
        uploadStory(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadStory = async (asset) => {
    setUploading(true);
    
    try {
      // Test network connection first
      console.log('Testing API connection...');
      const connectionTest = await NetworkDiagnostic.testApiConnection(API_URL);
      if (!connectionTest.success) {
        console.error('Network connection failed:', connectionTest.error);
        Alert.alert('Network Error', `Cannot connect to server: ${connectionTest.error}`);
        return;
      }
      
      console.log('Network connection successful, proceeding with upload...');
      
      const mediaType = asset.type === 'image' ? 'image' : 'video';
      
      const formData = new FormData();
      formData.append('media', {
        uri: asset.uri,
        type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
        name: asset.fileName || `story.${asset.type === 'image' ? 'jpg' : 'mp4'}`,
      });
      
      const config = { 
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000, // 30 second timeout
      };
      
      console.log('Uploading to:', `${API_URL}/api/upload`);
      
      // Upload media first
      const uploadResponse = await axios.post(`${API_URL}/api/upload`, formData, config);
      const mediaUrl = uploadResponse.data.mediaUrl;
      
      // Then create story
      const storyData = {
        mediaUrl,
        mediaType,
        caption: '', // You can add caption input later
        duration: asset.type === 'video' ? 15 : 5
      };
      
      const storyConfig = { 
        headers: { 
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 second timeout
      };
      
      await axios.post(`${API_URL}/api/story/upload`, storyData, storyConfig);
      
      Alert.alert('Success', 'Story uploaded successfully!');
      fetchStories(); // Refresh stories
    } catch (error) {
      console.log('Upload error:', error);
      console.log('Error response:', error.response);
      console.log('Error status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      
      // More specific error messages
      let errorMessage = 'Failed to upload story';
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network Error: Cannot connect to server. Please check your WiFi connection and ensure the backend server is running.';
      } else if (error.response?.status === 400) {
        errorMessage = `Bad Request: ${error.response?.data?.error || 'Invalid file format'}`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication Error: Please log in again';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server Error: Please try again later';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const testNetworkConnection = async () => {
    try {
      const connectionTest = await NetworkDiagnostic.testApiConnection(API_URL);
      if (connectionTest.success) {
        Alert.alert('Network Test', 'Network connection successful!');
      } else {
        Alert.alert('Network Error', `Cannot connect to server: ${connectionTest.error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test network connection');
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Add Story',
      'Choose how to add your story',
      [
        { text: 'Test Network', onPress: testNetworkConnection },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
          colors={isViewed ? ['#333', '#555'] : [THEME.colors.primary, THEME.colors.secondary]}
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
});
