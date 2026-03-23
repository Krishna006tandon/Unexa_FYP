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
  FlatList,
  Dimensions
} from 'react-native';

import { AuthContext } from '../context/AuthContext';
import ENVIRONMENT from '../config/environment';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

  const VideoPlayer = ({ url, style, autoplay = false }) => {
    const player = useVideoPlayer(url, (p) => {
        p.loop = true;
        if (autoplay) p.play();
    });
    return <VideoView style={style} player={player} allowsFullscreen />;
  };
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [sharedMedia, setSharedMedia] = useState([]);
  const [activeTab, setActiveTab] = useState('shared-with-me');
  const [viewingMedia, setViewingMedia] = useState(null);

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

  const handleViewMedia = async (item) => {
    if (activeTab === 'my-shares') {
      setViewingMedia(item);
      return;
    }
    
    // Check if already viewed
    const hasViewed = item.views.some(v => (v.user?._id || v.user) === user._id);
    if (hasViewed) {
      Alert.alert('Already Viewed', 'This media can only be viewed once.');
      return;
    }
    
    setViewingMedia(item);
    
    try {
      await axios.post(`${ENVIRONMENT.API_URL}/api/media/${item._id}/view`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Update local state to reflect it's viewed
      setSharedMedia(prev => prev.map(m => {
        if (m._id === item._id) {
          return { ...m, views: [...m.views, { user: { _id: user._id } }] };
        }
        return m;
      }));
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const closeMediaView = () => {
    setViewingMedia(null);
  };

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
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
        let mimeType = selectedMedia.mimeType;
        if (!mimeType) {
          // Fallback if mimeType is not provided by ImagePicker
          if (selectedMedia.type === 'image') mimeType = 'image/jpeg';
          else if (selectedMedia.type === 'video') mimeType = 'video/mp4';
          else mimeType = 'image/jpeg';
        }
        
        const file = {
          uri: selectedMedia.uri,
          type: mimeType,
          name: selectedMedia.fileName || `media_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`
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

  const renderMediaItem = ({ item }) => {
    const isMyShare = activeTab === 'my-shares';
    const hasViewed = item.views.some(v => (v.user?._id || v.user) === user._id);

    return (
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
        <TouchableOpacity onPress={() => handleViewMedia(item)} activeOpacity={0.8}>
          {!isMyShare && hasViewed ? (
            <View style={[styles.mediaContent, styles.viewedPlaceholder]}>
              <Ionicons name="eye-off" size={48} color={THEME.colors.textDim} />
              <Text style={styles.viewedText}>Already viewed</Text>
            </View>
          ) : !isMyShare && !hasViewed ? (
            <View style={[styles.mediaContent, styles.tapToViewPlaceholder]}>
              <Ionicons name="gift-outline" size={48} color={THEME.colors.primary} />
              <Text style={styles.tapToViewText}>Tap to view once</Text>
            </View>
          ) : (
            <Image 
              source={{ uri: item.mediaUrl }} 
              style={styles.mediaContent}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => handleViewMedia(item)} activeOpacity={0.8}>
          {!isMyShare && hasViewed ? (
            <View style={[styles.mediaContent, styles.viewedPlaceholder]}>
              <Ionicons name="eye-off" size={48} color={THEME.colors.textDim} />
              <Text style={styles.viewedText}>Already viewed</Text>
            </View>
          ) : !isMyShare && !hasViewed ? (
            <View style={[styles.mediaContent, styles.tapToViewPlaceholder]}>
              <Ionicons name="videocam-outline" size={48} color={THEME.colors.primary} />
              <Text style={styles.tapToViewText}>Tap to play once</Text>
            </View>
          ) : (
            <View style={styles.videoContainer}>
               <VideoPlayer url={item.mediaUrl} style={styles.mediaContent} />
            </View>
          )}
        </TouchableOpacity>
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
      
      {isMyShare && (
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
      )}
    </View>
  );
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Media</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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

        <View style={styles.mediaList}>
          {sharedMedia.map(item => (
            <View key={item._id}>
              {renderMediaItem({ item })}
            </View>
          ))}
        </View>
        
        {/* Extra Bottom Padding */}
        <View style={{ height: 40 }} />
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

      {/* Full Screen Media Viewer */}
      <Modal
        visible={!!viewingMedia}
        animationType="fade"
        transparent={false}
        onRequestClose={closeMediaView}
      >
        <View style={styles.viewerContainer}>
          <TouchableOpacity 
            style={styles.closeViewerButton} 
            onPress={closeMediaView}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          
          {viewingMedia?.mediaType === 'image' ? (
            <Image 
              source={{ uri: viewingMedia.mediaUrl }} 
              style={styles.fullScreenMedia}
              resizeMode="contain"
            />
          ) : viewingMedia?.mediaType === 'video' ? (
            <VideoPlayer url={viewingMedia.mediaUrl} style={styles.fullScreenMedia} />
          ) : null}
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
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  shareSection: {
    padding: 20,
  },
  mediaPicker: {
    height: 240,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  selectedMedia: {
    width: '100%',
    height: '100%',
  },
  mediaPickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(123, 97, 255, 0.3)',
    borderRadius: 25,
  },
  mediaPickerText: {
    color: THEME.colors.textDim,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 18,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 25,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickShareSection: {
    marginBottom: 25,
  },
  quickShareTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  quickShareButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 15,
  },
  quickShareButton: {
    width: (width - 52) / 2, // Perfect 2-column grid with gap
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickShareButtonSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  quickShareAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  quickShareName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  selectAllButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
  },
  selectAllText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  shareButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  shareButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  mediaList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mediaItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 25,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  senderName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  shareTime: {
    color: THEME.colors.textDim,
    fontSize: 12,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: {
    color: '#FF4B4B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaContent: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mediaCaption: {
    color: '#FFF',
    fontSize: 15,
    marginTop: 15,
    lineHeight: 20,
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: THEME.colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  recipientsInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  recipientsLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recipientChip: {
    alignItems: 'center',
    marginRight: 15,
    width: 50,
  },
  recipientAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 4,
    backgroundColor: '#333',
  },
  recipientName: {
    color: THEME.colors.textDim,
    fontSize: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDone: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendsList: {
    flex: 1,
    padding: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  friendItemSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: '#333',
  },
  friendName: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  viewedText: {
    color: THEME.colors.textDim,
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  tapToViewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
  },
  tapToViewText: {
    color: THEME.colors.primary,
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
  },
});

export default MediaShareScreen;
