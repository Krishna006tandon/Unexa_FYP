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
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUI } from '../context/UIContext';
import { BlurView } from 'expo-blur';



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
  const { showAlert } = useUI();

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
  const [showMediaOptionsModal, setShowMediaOptionsModal] = useState(false);

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
      showAlert('Already Viewed', 'This media can only be viewed once.', 'info');
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
    try {
      let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.All, 
        quality: 0.8,
        videoMaxDuration: 60, // Limit shared video to 60 seconds
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to pick media', 'error');
    } finally {
      setShowMediaOptionsModal(false);
    }
  };

  const takePhoto = async () => {
    try {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to take photo', 'error');
    } finally {
      setShowMediaOptionsModal(false);
    }
  };

  const takeVideo = async () => {
    try {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to record video', 'error');
    } finally {
      setShowMediaOptionsModal(false);
    }
  };

  const showMediaOptions = () => {
    setShowMediaOptionsModal(true);
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
      return showAlert('Error', 'Please select a photo or video', 'warning');
    }

    if (selectedFriends.length === 0) {
      return showAlert('Error', 'Please select at least one friend', 'warning');
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

      showAlert('Success', `Media shared with ${selectedFriends.length} friends! Streaks updated: ${response.data.streaksUpdated}`, 'success');
      
      // Reset form
      setSelectedMedia(null);
      setSelectedFriends([]);
      setCaption('');
      setShowFriendSelector(false);
      
      // Refresh shared media
      fetchSharedMedia();
      
    } catch (error) {
      console.error('Error sharing media:', error);
      showAlert('Error', 'Failed to share media. Please try again.', 'error');
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
            <View style={styles.videoContainer}>
              {item.mediaType === 'image' ? (
                <Image 
                  source={{ uri: item.mediaUrl }} 
                  style={styles.mediaContent}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <VideoPlayer url={item.mediaUrl} style={styles.mediaContent} />
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={12} color="#FFF" />
                    <Text style={styles.videoBadgeText}>VIDEO</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

      {item.caption ? (
        <Text style={styles.mediaCaptionText}>{item.caption}</Text>
      ) : null}

      <View style={styles.mediaActions}>
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={22} color={THEME.colors.textDim} />
            <Text style={styles.actionText}>{item.reactions.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color={THEME.colors.textDim} />
            <Text style={styles.actionText}>{item.comments.length || 0}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.viewBadge}>
          <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.4)" />
          <Text style={styles.viewCountText}>{item.views.length}</Text>
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
            <TouchableOpacity style={styles.mediaPicker} onPress={showMediaOptions}>
              {selectedMedia ? (
                selectedMedia.type === 'video' ? (
                  <VideoPlayer url={selectedMedia.uri} style={styles.selectedMedia} autoplay={true} />
                ) : (
                  <Image source={{ uri: selectedMedia.uri }} style={styles.selectedMedia} resizeMode="cover" />
                )
              ) : (
                <View style={styles.mediaPickerPlaceholder}>
                    <LinearGradient
                      colors={['rgba(123, 97, 255, 0.2)', 'rgba(61, 220, 255, 0.1)']}
                      style={styles.pickerCircle}
                    >
                      <Ionicons name="add" size={40} color="#FFF" />
                    </LinearGradient>
                  <Text style={styles.mediaPickerText}>Tap to share photo or video</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={caption}
              onChangeText={setCaption}
              multiline
            />

            <TouchableOpacity 
              style={styles.friendSelectorButton} 
              onPress={() => setShowFriendSelector(true)}
            >
              <View style={styles.selectorLeft}>
                <Ionicons name="people" size={20} color={THEME.colors.primary} />
                <Text style={styles.selectorText}>
                  {selectedFriends.length > 0 
                    ? `Sharing with ${selectedFriends.length} friends` 
                    : 'Select friends to share with'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareButton, (selectedFriends.length > 0 && selectedMedia) && styles.shareButtonActive]}
              onPress={shareMedia}
              disabled={isLoading || !selectedMedia || selectedFriends.length === 0}
            >
              <LinearGradient 
                colors={selectedFriends.length > 0 && selectedMedia ? [THEME.colors.primary, THEME.colors.secondary] : ['#222', '#333']}
                style={styles.shareButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.shareButtonText}>Share Now</Text>
                )}
              </LinearGradient>
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
        transparent={true}
        onRequestClose={() => setShowFriendSelector(false)}
      >
        <BlurView intensity={95} tint="dark" style={{ flex: 1 }}>
          <View style={styles.modalHeaderPremiumSelector}>
            <View style={styles.modalGrabberPremium} />
            <View style={styles.modalHeaderRowPremium}>
              <TouchableOpacity onPress={() => setShowFriendSelector(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitlePremiumText}>Select Friends</Text>
              <TouchableOpacity onPress={() => setShowFriendSelector(false)}>
                <Text style={styles.modalDonePremium}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 25 }}
            ListEmptyComponent={
              <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 40 }}>
                No friends found to share with.
              </Text>
            }
          />
        </BlurView>
      </Modal>

      {/* Full Screen Media Viewer */}
      <Modal
        visible={!!viewingMedia}
        animationType="fade"
        transparent={true}
        onRequestClose={closeMediaView}
      >
        <BlurView intensity={100} tint="dark" style={styles.viewerContainerPremium}>
          <TouchableOpacity 
            style={styles.closeViewerButtonPremium} 
            onPress={closeMediaView}
          >
            <View style={styles.closeCirclePremium}>
              <Ionicons name="close" size={28} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.viewerContentWrapper}>
            {viewingMedia?.mediaType === 'image' ? (
              <Image 
                source={{ uri: viewingMedia.mediaUrl }} 
                style={styles.fullScreenMediaPremium}
                resizeMode="contain"
              />
            ) : viewingMedia?.mediaType === 'video' ? (
              <VideoPlayer url={viewingMedia.mediaUrl} style={styles.fullScreenMediaPremium} autoplay={true} />
            ) : null}

            {viewingMedia?.caption && (
               <BlurView intensity={20} tint="dark" style={styles.viewerCaptionWrapper}>
                 <Text style={styles.viewerCaptionText}>{viewingMedia.caption}</Text>
               </BlurView>
            )}
          </View>
        </BlurView>
      </Modal>

      {/* Media Selection Modal */}
      <Modal visible={showMediaOptionsModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMediaOptionsModal(false)} activeOpacity={1}>
          <BlurView intensity={100} tint="dark" style={styles.modalContent}>
            <View style={styles.modalGrabber} />
            <Text style={styles.modalTitle}>Share Media</Text>
            
            <TouchableOpacity style={styles.optionBtn} onPress={takePhoto}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(123, 97, 255, 0.1)' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={takeVideo}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(61, 220, 255, 0.1)' }]}>
                <Ionicons name="videocam" size={24} color="#FFF" />
              </View>
              <Text style={styles.optionText}>Record Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={pickMedia}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
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
    paddingHorizontal: 25,
    paddingTop: 65,
    paddingBottom: 20,
    backgroundColor: THEME.colors.background,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 25,
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 15,
  },
  activeTab: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#FFF',
  },
  shareSection: {
    padding: 25,
  },
  mediaPicker: {
    height: 250,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1.5,
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
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
  },
  pickerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mediaPickerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 20,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 25,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  friendSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,100,255,0.05)',
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  shareButton: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 8,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  shareButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mediaList: {
    flex: 1,
    paddingHorizontal: 25,
  },
  mediaItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 30,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  senderName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  shareTime: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  mediaContent: {
    width: '100%',
    height: 320,
    borderRadius: 24,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
  },
  mediaCaptionText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 18,
    lineHeight: 24,
    opacity: 0.9,
    paddingHorizontal: 5,
  },
  videoBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: THEME.colors.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewCountText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
  },
  recipientsInfo: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  recipientsLabel: {
    color: THEME.colors.textDim,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  recipientChip: {
    alignItems: 'center',
    marginRight: 18,
    width: 55,
  },
  recipientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recipientName: {
    color: THEME.colors.textDim,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 70,
    paddingBottom: 25,
    backgroundColor: THEME.colors.background,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalDone: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 22,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  friendItemSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(123, 97, 255, 0.06)',
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  friendName: {
    flex: 1,
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    height: 320,
  },
  viewedText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  tapToViewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.2)',
    height: 320,
  },
  tapToViewText: {
    color: THEME.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  modalHeaderPremiumSelector: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalGrabberPremium: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitlePremiumText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalDonePremium: {
    color: THEME.colors.secondary,
    fontSize: 16,
    fontWeight: '800',
  },
  viewerContainerPremium: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
    marginVertical: 6,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeViewerButtonPremium: {
    position: 'absolute',
    top: 60,
    right: 25,
    zIndex: 100,
  },
  closeCirclePremium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  viewerContentWrapper: {
    width: Dimensions.get('window').width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenMediaPremium: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  viewerCaptionWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 40,
    paddingBottom: 60,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  viewerCaptionText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
  },
});

export default MediaShareScreen;
