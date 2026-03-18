import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert, TextInput, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, AVPlaybackStatus } from 'expo-av';
import { X, Send, Eye, Heart, MessageCircle, Smile } from 'lucide-react-native';
import axios from 'axios';
import { API_URL } from './AuthScreen';

const { width, height } = Dimensions.get('window');

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
  const { stories, initialIndex = 0 } = route.params;
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
      await axios.post(`${API_URL}/api/story/${currentStory._id}/view`, {}, {
        headers: { Authorization: `Bearer ${route.params.token}` }
      });
      
      // Load story interactions
      const interactionsResponse = await axios.get(`${API_URL}/api/story/${currentStory._id}/interactions`, {
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
      setIsPlaying(false);
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
      const response = await axios.post(`${API_URL}/api/story/${currentStory._id}/react`, 
        { emoji }, 
        { headers: { Authorization: `Bearer ${route.params.token}` }}
      );
      setReactions(response.data.reactions);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error reacting to story:', error);
      Alert.alert('Error', 'Failed to react to story');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      const response = await axios.post(`${API_URL}/api/story/${currentStory._id}/reply`, 
        { content: replyText.trim() }, 
        { headers: { Authorization: `Bearer ${route.params.token}` }}
      );
      setReplies(response.data.replies);
      setReplyText('');
      setShowReplyModal(false);
      Alert.alert('Success', 'Reply sent successfully!');
    } catch (error) {
      console.error('Error replying to story:', error);
      Alert.alert('Error', 'Failed to send reply');
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
          <View style={styles.userInfo}>
            <Image source={{ uri: currentStory.user.profilePhoto }} style={styles.avatar} />
            <View style={styles.userText}>
              <Text style={styles.username}>{currentStory.user.username}</Text>
              <Text style={styles.timestamp}>
                {viewCount} views • {Math.floor((Date.now() - new Date(currentStory.createdAt)) / (1000 * 60 * 60))}h ago
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X color={THEME.colors.text} size={24} />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.actionButton}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.emojiPickerContainer}>
            <Text style={styles.emojiPickerTitle}>React to story</Text>
            <View style={styles.emojiGrid}>
              {['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '🎉', '💯'].map(emoji => (
                <TouchableOpacity 
                  key={emoji} 
                  style={styles.emojiButton}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEmojiPicker(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={showReplyModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <View style={styles.replyContainer}>
            <Text style={styles.replyTitle}>Reply to story</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              placeholderTextColor={THEME.colors.textDim}
              multiline
              value={replyText}
              onChangeText={setReplyText}
              maxLength={500}
            />
            <View style={styles.replyActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowReplyModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={handleReply}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default StoryScreen;

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
    width: width,
    height: height * 0.7,
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
    width: width * 0.8,
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
    width: width * 0.9,
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
});
