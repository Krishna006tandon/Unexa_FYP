import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useUI } from '../context/UIContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { X, Send, Eye, Heart, MessageCircle, Smile, Trash2 } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';



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

const StoryScreen = ({ route, navigation }) => {
  const { width, height } = Dimensions.get('window');
  usePreventScreenCapture();
  const { stories, initialIndex = 0 } = route.params;
  const { user } = useContext(AuthContext);
  const { showAlert } = useUI();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewCount, setViewCount] = useState(0);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactions, setReactions] = useState([]);
  const [replies, setReplies] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);
  const currentStory = stories[currentIndex];

  if (!currentStory) {
    navigation.goBack();
    return null;
  }

  useEffect(() => {
    loadStory();
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex]);

  const loadStory = async () => {
    setIsLoading(true);
    setProgress(0);
    
    // Mark story as viewed and load interactions
    try {
      await axios.post(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}/view`, {}, {
        headers: { Authorization: `Bearer ${route.params.token}` }
      });
      
      // Load story interactions
      const interactionsResponse = await axios.get(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}/interactions`, {
        headers: { Authorization: `Bearer ${route.params.token}` }
      });
      
      setReactions(interactionsResponse.data.reactions || []);
      setReplies(interactionsResponse.data.replies || []);
      setViewCount(interactionsResponse.data.viewCount || 0);
    } catch (error) {
      console.log('Error loading story:', error);
      // Fallback to existing views
      const views = currentStory.views || [];
      setViewCount(views.length);
    }
    
    if (currentStory.mediaType === 'video') {
      setIsPlaying(true);
    } else {
      setIsPlaying(true);
      startProgress(currentStory.duration || 5);
    }
    setIsLoading(false);
  };

  const startProgress = (duration) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    const interval = 50; // Update every 50ms
    const totalSteps = (duration * 1000) / interval;
    let currentStep = 0;
    
    progressInterval.current = setInterval(() => {
      currentStep++;
      setProgress(currentStep / totalSteps);
      
      if (currentStep >= totalSteps) {
        clearInterval(progressInterval.current);
        goToNextStory();
      }
    }, interval);
  };

  const goToNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goToPreviousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleVideoStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsLoading(false);
      if (status.isPlaying) {
        const duration = status.durationMillis || 5000;
        startProgress(duration / 1000);
      }
    }
  };

  const handleStoryPress = (event) => {
    const { locationX } = event.nativeEvent;
    const screenWidth = width;
    
    if (locationX < screenWidth / 3) {
      goToPreviousStory();
    } else if (locationX > (screenWidth * 2) / 3) {
      goToNextStory();
    }
  };

  const handleReaction = async (emoji) => {
    try {
      const response = await axios.post(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}/react`, 
        { emoji }, 
        { headers: { Authorization: `Bearer ${route.params.token}` }}
      );
      setReactions(response.data.reactions);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error reacting to story:', error);
      showAlert('Error', 'Failed to react to story', 'error');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      const response = await axios.post(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}/reply`, 
        { content: replyText.trim() }, 
        { headers: { Authorization: `Bearer ${route.params.token}` }}
      );
      setReplies(response.data.replies);
      setReplyText('');
      setShowReplyModal(false);
      showAlert('Success', 'Reply sent successfully!', 'success');
    } catch (error) {
      console.error('Error replying to story:', error);
      showAlert('Error', 'Failed to send reply', 'error');
    }
  };

  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const fetchViewers = async () => {
    setLoadingViewers(true);
    setShowViewersModal(true);
    try {
      const response = await axios.get(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}/viewers`, {
        headers: { Authorization: `Bearer ${route.params.token}` }
      });
      setViewers(response.data);
    } catch (error) {
      console.error('Error fetching viewers:', error);
      showAlert('Error', 'Failed to fetch viewers', 'error');
    } finally {
      setLoadingViewers(false);
    }
  };

  const handleDeleteStory = async () => {
    try {
      await axios.delete(`${ENVIRONMENT.API_URL}/api/story/${currentStory._id}`, {
        headers: { Authorization: `Bearer ${route.params.token}` }
      });
      showAlert('Success', 'Story deleted successfully', 'success');
      
      // If last story, go back, otherwise go to next
      if (stories.length === 1) {
        navigation.goBack();
      } else {
        goToNextStory();
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      showAlert('Error', 'Failed to delete story', 'error');
    }
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress * 100}%` : '0%'
                }
              ]} 
            />
          </View>
        ))}
      </View>
    );
  };

  const renderStoryContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      );
    }

    if (currentStory.mediaType === 'video') {
      return (
        <Video
          ref={videoRef}
          source={{ uri: currentStory.mediaUrl }}
          style={styles.media}
          shouldPlay={isPlaying}
          isLooping={false}
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
          resizeMode="cover"
        />
      );
    }

    return (
      <Image 
        source={{ uri: currentStory.mediaUrl }} 
        style={styles.media}
        resizeMode="cover"
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.headerGradient}>
          <TouchableOpacity 
            style={styles.userInfo} 
            onPress={() => {
              const uId = currentStory?.user?._id || currentStory?.user;
              if (uId) navigation.navigate('ProfileScreen', { userId: uId });
            }}
          >
            <Image source={{ uri: currentStory?.user?.profilePhoto }} style={styles.avatar} />
            <View style={styles.userText}>
              <View style={styles.usernameRow}>
                <Text style={styles.username}>{currentStory?.user?.username || 'User'}</Text>
                {currentStory?.isCloseFriends && (
                  <View style={styles.closeFriendsBadge}>
                    <Heart size={10} color="#FFF" fill="#FFF" />
                    <Text style={styles.closeFriendsText}>Close Friends</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timestamp}>
                {viewCount} views • {Math.floor((Date.now() - new Date(currentStory?.createdAt || Date.now())) / (1000 * 60 * 60))}h ago
              </Text>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            {(currentStory?.user?._id === user?._id || currentStory?.user === user?._id) && (
              <TouchableOpacity onPress={handleDeleteStory}>
                <Trash2 color="#FF4B4B" size={22} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <X color={THEME.colors.text} size={24} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Story Content */}
      <TouchableOpacity 
        style={styles.storyContainer} 
        activeOpacity={1}
        onPress={handleStoryPress}
      >
        {renderStoryContent()}
        
        {/* Caption */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.captionGradient}>
              <Text style={styles.caption}>{currentStory.caption}</Text>
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            if (currentStory?.user?._id === user?._id || currentStory?.user === user?._id) {
              fetchViewers();
            }
          }}
        >
          <Eye color={THEME.colors.text} size={24} />
          <Text style={styles.actionText}>{viewCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowEmojiPicker(true)}>
          <Heart color={THEME.colors.text} size={24} />
          {reactions.length > 0 && <Text style={styles.actionText}>{reactions.length}</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowReplyModal(true)}>
          <MessageCircle color={THEME.colors.text} size={24} />
          {replies.length > 0 && <Text style={styles.actionText}>{replies.length}</Text>}
        </TouchableOpacity>
      </View>

      {/* Emoji Picker Modal */}
      <Modal visible={showEmojiPicker} transparent animationType="fade">
        <BlurView intensity={60} tint="dark" style={styles.modalOverlayPremium}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEmojiPicker(false)} />
          <View style={styles.emojiPickerContainerPremium}>
            <View style={styles.modalGrabberPremium} />
            <Text style={styles.emojiPickerTitlePremium}>Fast Reactions</Text>
            <View style={styles.emojiGridPremium}>
              {['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉', '💯', '✨'].map(emoji => (
                <TouchableOpacity 
                  key={emoji} 
                  style={styles.emojiButtonPremium}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.emojiTextPremium}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={showReplyModal} transparent animationType="slide">
        <BlurView intensity={80} tint="dark" style={styles.modalOverlayPremium}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <TouchableOpacity style={styles.replyDismissOverlay} onPress={() => setShowReplyModal(false)} />
            <LinearGradient colors={['rgba(30,30,30,0.95)', 'rgba(20,20,20,0.98)']} style={styles.replyContainerPremium}>
              <View style={styles.modalGrabberPremium} />
              <Text style={styles.replyTitlePremium}>Reply to {currentStory?.user?.username}</Text>
              <TextInput
                style={styles.replyInputPremium}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                autoFocus
                value={replyText}
                onChangeText={setReplyText}
                maxLength={500}
              />
              <View style={styles.replyActionsPremium}>
                <TouchableOpacity style={styles.replyCloseBtn} onPress={() => setShowReplyModal(false)}>
                  <X size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.storySendBtn, !replyText.trim() && { opacity: 0.5 }]} 
                   onPress={handleReply}
                   disabled={!replyText.trim()}
                >
                  <LinearGradient colors={['#7B61FF', '#3DDCFF']} style={styles.sendGrad}>
                    <Send size={20} color="#000" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>

        {/* Story Viewers Modal */}
        <Modal 
          visible={showViewersModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowViewersModal(false)}
        >
          <BlurView intensity={90} tint="dark" style={styles.viewersModalContainer}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowViewersModal(false)} />
            <View style={styles.viewersContent}>
              <View style={styles.modalGrabberPremium} />
              <View style={styles.viewersHeader}>
                <Text style={styles.viewersTitle}>Story Viewers</Text>
                <TouchableOpacity onPress={() => setShowViewersModal(false)}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              
              {loadingViewers ? (
                <View style={{ padding: 50 }}>
                  <ActivityIndicator color={THEME.colors.primary} size="large" />
                </View>
              ) : (
                <FlatList
                  data={viewers}
                  keyExtractor={(v) => v._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.viewerItem} 
                      onPress={() => {
                          setShowViewersModal(false);
                          navigation.navigate('ProfileScreen', { userId: item._id });
                      }}
                    >
                      <Image source={{ uri: item.profilePhoto }} style={styles.viewerAvatar} />
                      <Text style={styles.viewerName}>{item.username}</Text>
                      <View style={styles.viewerDot} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyViewers}>
                      <User size={40} color="rgba(255,255,255,0.2)" />
                      <Text style={styles.noViewersText}>No views yet. Share it with friends!</Text>
                    </View>
                  }
                  contentContainerStyle={{ paddingBottom: 30 }}
                />
              )}
            </View>
          </BlurView>
        </Modal>
      </View>
    );
  };

// End of StoryScreen component

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  username: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestamp: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.text,
    borderRadius: 1,
  },
  storyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  media: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  captionGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 40,
  },
  caption: {
    color: THEME.colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: THEME.colors.text,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerContainer: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    padding: 20,
    width: Dimensions.get('window').width * 0.8,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  emojiPickerTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  emojiButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.glass,
    borderRadius: 25,
  },
  emojiText: {
    fontSize: 24,
  },
  replyContainer: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    padding: 20,
    width: Dimensions.get('window').width * 0.9,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  replyTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  replyInput: {
    backgroundColor: '#1E1E1E',
    color: THEME.colors.text,
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: THEME.colors.textDim,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  sendButtonText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeFriendsBadge: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeFriendsText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlayPremium: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emojiPickerContainerPremium: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 30,
    padding: 24,
    width: Dimensions.get('window').width * 0.9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalGrabberPremium: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  emojiPickerTitlePremium: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },
  emojiGridPremium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  emojiButtonPremium: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
  },
  emojiTextPremium: {
    fontSize: 30,
  },
  replyDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  replyContainerPremium: {
    width: Dimensions.get('window').width * 0.95,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyTitlePremium: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 15,
  },
  replyInputPremium: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#FFF',
    fontSize: 16,
    padding: 18,
    borderRadius: 20,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  replyActionsPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  replyCloseBtn: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
  },
  storySendBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    width: 100,
  },
  sendGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  viewersModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  viewersContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '60%',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  viewersTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  viewerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  viewerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  emptyViewers: {
    alignItems: 'center',
    marginTop: 50,
    gap: 15,
  },
  noViewersText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default StoryScreen;
