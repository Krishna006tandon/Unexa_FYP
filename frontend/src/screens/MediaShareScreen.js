import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import ENVIRONMENT from '../config/environment';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

const MediaShareScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [activeTab, setActiveTab] = useState('shared-with-me');

  useEffect(() => {
    fetchFriends();
    fetchSharedMedia();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${ENVIRONMENT.API_URL}/api/chat/friends`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchSharedMedia = async () => {
    try {
      const endpoint = activeTab === 'shared-with-me' ? '/shared-with-me' : '/my-shares';
      const response = await axios.get(`${ENVIRONMENT.API_URL}/api/media${endpoint}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSharedMedia(response.data.mediaShares || []);
    } catch (error) {
      console.error('Error fetching shared media:', error);
    }
  };

  useEffect(() => {
    fetchSharedMedia();
  }, [activeTab]);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaType, quality: 0.8 });
    if (!result.canceled) {
      setSelectedMedia(result.assets[0]);
    }
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const shareMedia = async () => {
    if (!selectedMedia) {
      return Alert.alert('Error', 'Please select a photo or video');
    }

    if (selectedFriends.length === 0) {
      return Alert.alert('Error', 'Please select at least one friend');
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      
      // Handle React Native Web file upload properly
      if (selectedMedia.uri.startsWith('blob:')) {
        // For React Native Web, convert blob URI to actual Blob
        try {
          console.log('🔄 Converting blob to file...');
          const response = await fetch(selectedMedia.uri);
          const blob = await response.blob();
          
          // Compress image if it's too large
          let processedBlob = blob;
          if (blob.size > 5 * 1024 * 1024) { // 5MB limit
            console.log('🗜️ Compressing large image...');
            // Create a compressed version
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            await new Promise((resolve) => {
              img.onload = () => {
                canvas.width = img.width * 0.8; // Reduce size by 20%
                canvas.height = img.height * 0.8;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
              };
              img.src = selectedMedia.uri;
            });
            
            processedBlob = canvas.toBlob('image/jpeg', 0.8);
          }
          
          console.log('📁 File size:', processedBlob.size, 'bytes');
          formData.append('media', processedBlob, selectedMedia.fileName || `media_${Date.now()}.jpg`);
        } catch (error) {
          console.error('❌ Error converting blob to file:', error);
          throw new Error('Failed to process media file');
        }
      } else {
        // For native React Native
        const file = {
          uri: selectedMedia.uri,
          type: selectedMedia.type || 'image/jpeg',
          name: selectedMedia.fileName || `media_${Date.now()}.jpg`
        };
        formData.append('media', file);
      }
      
      formData.append('recipients', JSON.stringify(selectedFriends));
      formData.append('caption', caption);

      console.log('📤 Uploading media URI:', selectedMedia.uri);
      console.log('📤 Media type:', selectedMedia.type);
      console.log('👥 Recipients:', selectedFriends);
      console.log('🌐 Sending request to:', `${ENVIRONMENT.API_URL}/api/media/share`);
      console.log('📝 FormData prepared, size:', formData.get('media') ? 'File present' : 'No file');

      const response = await axios.post(`${ENVIRONMENT.API_URL}/api/media/share`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`
        },
        timeout: 120000, // 2 minute timeout
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📊 Upload progress: ${percentCompleted}%`);
        }
      });

      console.log('✅ Media share response:', response.data);

      Alert.alert('Success', `Media shared with ${selectedFriends.length} friends! Streaks updated: ${response.data.streaksUpdated}`);
      
      // Reset form
      setSelectedMedia(null);
      setSelectedFriends([]);
      setCaption('');
      setShowFriendSelector(false);
      
      // Refresh shared media
      fetchSharedMedia();
      
    } catch (error) {
      console.error('Error sharing media:', error);
      Alert.alert('Error', 'Failed to share media. Please try again.');
    }
    
    setIsLoading(false);
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.friendItem,
        selectedFriends.includes(item._id) && styles.friendItemSelected
      ]}
      onPress={() => toggleFriendSelection(item._id)}
    >
      <Image 
        source={{ uri: item.profilePhoto }} 
        style={styles.friendAvatar}
      />
      <Text style={styles.friendName}>{item.username}</Text>
      <View style={styles.checkbox}>
        {selectedFriends.includes(item._id) && (
          <Ionicons name="checkmark" size={20} color={THEME.colors.secondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMediaItem = ({ item }) => (
    <View style={styles.mediaItem}>
      <View style={styles.mediaHeader}>
        <View style={styles.senderInfo}>
          <Image 
            source={{ uri: item.sender.profilePhoto }} 
            style={styles.senderAvatar}
          />
          <View>
            <Text style={styles.senderName}>{item.sender.username}</Text>
            <Text style={styles.shareTime}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 Streak</Text>
        </View>
      </View>
      
      {item.mediaType === 'image' ? (
        <Image 
          source={{ uri: item.mediaUrl }} 
          style={styles.mediaContent}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: item.mediaUrl }}
            style={styles.mediaContent}
            shouldPlay={false}
            isLooping
            useNativeControls
          />
        </View>
      )}
      
      {item.caption && (
        <Text style={styles.mediaCaption}>{item.caption}</Text>
      )}
      
      <View style={styles.mediaActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={24} color={THEME.colors.textDim} />
          <Text style={styles.actionText}>{item.reactions.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={24} color={THEME.colors.textDim} />
          <Text style={styles.actionText}>{item.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye-outline" size={24} color={THEME.colors.textDim} />
          <Text style={styles.actionText}>{item.views.length}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recipientsInfo}>
        <Text style={styles.recipientsLabel}>Shared with:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {item.recipients.map(recipient => (
            <View key={recipient._id} style={styles.recipientChip}>
              <Image 
                source={{ uri: recipient.profilePhoto }} 
                style={styles.recipientAvatar}
              />
              <Text style={styles.recipientName}>{recipient.username}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Media</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shared-with-me' && styles.activeTab]}
          onPress={() => setActiveTab('shared-with-me')}
        >
          <Text style={[styles.tabText, activeTab === 'shared-with-me' && styles.activeTabText]}>
            📥 Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my-shares' && styles.activeTab]}
          onPress={() => setActiveTab('my-shares')}
        >
          <Text style={[styles.tabText, activeTab === 'my-shares' && styles.activeTabText]}>
            📤 My Shares
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my-shares' && (
        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
            {selectedMedia ? (
              <Image 
                source={{ uri: selectedMedia.uri }} 
                style={styles.selectedMedia}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mediaPickerPlaceholder}>
                <Ionicons name="camera" size={48} color={THEME.colors.primary} />
                <Text style={styles.mediaPickerText}>📸 Tap to select photo/video</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.captionInput}
            placeholder="✍️ What's on your mind?"
            placeholderTextColor={THEME.colors.textDim}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
          />

          {/* Quick Share Buttons */}
          <View style={styles.quickShareSection}>
            <Text style={styles.quickShareTitle}>🔥 Quick Share:</Text>
            <View style={styles.quickShareButtons}>
              {friends.slice(0, 4).map(friend => (
                <TouchableOpacity 
                  key={friend._id}
                  style={[
                    styles.quickShareButton,
                    selectedFriends.includes(friend._id) && styles.quickShareButtonSelected
                  ]}
                  onPress={() => toggleFriendSelection(friend._id)}
                >
                  <Image 
                    source={{ uri: friend.profilePhoto }} 
                    style={styles.quickShareAvatar}
                  />
                  <Text style={styles.quickShareName}>{friend.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={() => {
                if (selectedFriends.length === friends.length) {
                  setSelectedFriends([]);
                } else {
                  setSelectedFriends(friends.map(f => f._id));
                }
              }}
            >
              <Text style={styles.selectAllText}>
                {selectedFriends.length === friends.length ? '🚫 Deselect All' : '✅ Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.shareButton, selectedFriends.length > 0 && styles.shareButtonActive]}
            onPress={shareMedia}
            disabled={isLoading || !selectedMedia || selectedFriends.length === 0}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <LinearGradient 
                colors={selectedFriends.length > 0 ? [THEME.colors.primary, THEME.colors.secondary] : ['#333', '#555']}
                style={styles.shareButtonGradient}
              >
                <Text style={styles.shareButtonText}>
                  Share with {selectedFriends.length} friends
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.mediaList}>
        {sharedMedia.map(item => (
          <View key={item._id}>
            {renderMediaItem({ item })}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={showFriendSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFriendSelector(false)}>
              <Ionicons name="close" size={24} color={THEME.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Friends</Text>
            <TouchableOpacity onPress={() => setShowFriendSelector(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item._id}
            style={styles.friendsList}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: THEME.colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: THEME.colors.glass,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: '600',
  },
  shareSection: {
    padding: 20,
  },
  mediaPicker: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedMedia: {
    width: '100%',
    height: '100%',
  },
  mediaPickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.glass,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 20,
  },
  mediaPickerText: {
    color: THEME.colors.textDim,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  captionInput: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    padding: 15,
    color: THEME.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickShareSection: {
    marginBottom: 20,
  },
  quickShareTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  quickShareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickShareButton: {
    width: '48%',
    backgroundColor: THEME.colors.glass,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  quickShareButtonSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  quickShareAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  quickShareName: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  selectAllButton: {
    alignSelf: 'center',
    padding: 10,
  },
  selectAllText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareButtonActive: {
    elevation: 6,
    shadowOpacity: 0.4,
  },
  shareButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 15,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaItem: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  mediaImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    marginBottom: 15,
  },
  mediaCaption: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
    lineHeight: 22,
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginTop: 5,
  },
  recipientsInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  recipientsLabel: {
    color: THEME.colors.textDim,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  recipientChip: {
    alignItems: 'center',
    marginRight: 15,
  },
  recipientAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 5,
  },
  recipientName: {
    color: THEME.colors.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: THEME.colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  modalDone: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  friendsList: {
    flex: 1,
    padding: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: THEME.colors.glass,
    borderRadius: 12,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  friendStatus: {
    color: THEME.colors.textDim,
    fontSize: 14,
  },
  friendCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendCheckboxSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
});

export default MediaShareScreen;
