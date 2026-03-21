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
          const response = await fetch(selectedMedia.uri);
          const blob = await response.blob();
          formData.append('media', blob, selectedMedia.fileName || `media_${Date.now()}.jpg`);
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
        timeout: 60000 // 60 second timeout
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
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: THEME.colors.secondary,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 16,
  },
  activeTabText: {
    color: THEME.colors.secondary,
    fontWeight: 'bold',
  },
  shareSection: {
    padding: 20,
  },
  mediaPicker: {
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
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
    borderColor: THEME.colors.glassBorder,
    borderRadius: 15,
  },
  mediaPickerText: {
    color: THEME.colors.textDim,
    marginTop: 10,
    fontSize: 16,
  },
  captionInput: {
    backgroundColor: THEME.colors.glass,
    color: THEME.colors.text,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  shareButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  shareButtonActive: {
    // Handled by gradient
  },
  shareButtonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  shareButtonText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  mediaList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaItem: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  senderName: {
    color: THEME.colors.text,
    fontWeight: 'bold',
  },
  shareTime: {
    color: THEME.colors.textDim,
    fontSize: 12,
  },
  streakBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  streakText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaContent: {
    width: '100%',
    height: 300,
  },
  videoContainer: {
    width: '100%',
    height: 300,
  },
  mediaCaption: {
    color: THEME.colors.text,
    padding: 15,
    paddingTop: 10,
  },
  mediaActions: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: THEME.colors.textDim,
    marginLeft: 5,
  },
  recipientsInfo: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.glassBorder,
    padding: 15,
  },
  recipientsLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginBottom: 10,
  },
  recipientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.glass,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  recipientAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  recipientName: {
    color: THEME.colors.text,
    fontSize: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  modalTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDone: {
    color: THEME.colors.secondary,
    fontSize: 16,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  friendName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkbox: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  quickShareSection: {
    backgroundColor: THEME.colors.glass,
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
  },
  quickShareTitle: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quickShareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderWidth: 2,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  quickShareButtonSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  quickShareAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  quickShareName: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  selectAllButton: {
    backgroundColor: THEME.colors.glass,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  selectAllText: {
    color: THEME.colors.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default MediaShareScreen;
