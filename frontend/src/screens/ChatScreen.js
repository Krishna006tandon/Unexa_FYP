import React, { useState, useEffect, useRef, useContext } from 'react'; // Updated UI and Reactions
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking, Modal, Alert, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenCapture from 'expo-screen-capture';
import { Send, Image as ImageIcon, Mic, Check, CheckCheck, Play, Paperclip, Square, Video, Phone, Clock, Star, X, Trash2, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { useUI } from '../context/UIContext';
import ENVIRONMENT from '../config/environment';



// Removed local socket variable - using socket from ProfileContext now

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.1)',
    readBlue: '#34B7F1',
    danger: '#FF4B4B',
  }
};

const ChatScreen = ({ route, navigation }) => {
  const { chatId, name, receiverId: passedReceiverId, avatar, isGroupChat } = route.params;
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);
  const { showAlert } = useUI();

  const getSenderColor = (username) => {
    const colors = ['#FF8A65', '#4DB6AC', '#9575CD', '#F06292', '#AED581', '#FFD54F', '#4FC3F7'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash % colors.length)];
  };
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [recording, setRecording] = useState(undefined);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [msgToForward, setMsgToForward] = useState(null);
  const [availableChats, setAvailableChats] = useState([]);
  const [vanishMode, setVanishMode] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [receiverStatus, setReceiverStatus] = useState("offline");
  const [lastSeen, setLastSeen] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const flatListRef = useRef(null);
  let recordingTimer = useRef(null);
  const audioTimer = useRef(null);

  const playAudio = async (url) => {
    try {
      console.log('🎵 Playing audio from:', url);
      await Audio.setAudioModeAsync({ 
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false
      });
      
      // Reset audio state
      setCurrentAudioTime(0);
      setIsPlayingAudio(true);
      
      // Create and play sound with proper format support
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: 1.0
        }
      );
      
      // Set up playback status updates
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.isPlaying) {
            // Update current time every 100ms
            if (audioTimer.current) clearInterval(audioTimer.current);
            audioTimer.current = setInterval(() => {
              sound.getStatusAsync().then((currentStatus) => {
                if (currentStatus.isLoaded && currentStatus.isPlaying) {
                  setCurrentAudioTime(Math.floor(currentStatus.positionMillis / 1000));
                }
              });
            }, 100);
          } else if (status.didJustFinish) {
            // Audio finished playing
            setIsPlayingAudio(false);
            setCurrentAudioTime(0);
            if (audioTimer.current) clearInterval(audioTimer.current);
          }
        }
      });
      
      await sound.playAsync();
      console.log('✅ Audio playing successfully');
    } catch (err) {
      console.error('❌ Error playing audio:', err);
      setIsPlayingAudio(false);
      showAlert('Audio Error', 'Could not play audio: ' + err.message, 'error');
    }
  };

  const openFile = async (url) => {
    try {
       await Linking.openURL(url);
    } catch (err) {
       Alert.alert('File Error', 'Could not open file from: ' + url);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const fetchChatInfo = async () => {
      try {
        const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/chat/${chatId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setChatUsers(data.users || []);
      } catch (e) { console.warn('Error fetching chat info in chatScreen', e); }
    };
    fetchChatInfo();

    // Join room for real-time messages
    socket.emit("join_chat", chatId);

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));

    const handleMessageReceived = (msg) => {
      const receivedChatId = (msg.chat?._id || msg.chat || '').toString();
      if (chatId.toString() === receivedChatId) {
        setMessages(prev => [msg, ...prev]); 
        socket.emit("measure_read", { messageId: msg._id, userId: user._id, chatId: chatId.toString() });
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true, content: "Message vanished" } : m));
    };

    const handleMessageEdited = ({ messageId, content }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content } : m));
    };

    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };

    socket.on("message_received", handleMessageReceived);
    socket.on("message_deleted_update", handleMessageDeleted);
    socket.on("message_edited_update", handleMessageEdited);
    socket.on("message_reacted_update", handleMessageReacted);

    fetchMessages();
    fetchReceiverStatus();
    
    // Also fetch messages when screen is focused to stay synced
    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchMessages();
      fetchReceiverStatus();
      socket.emit("join_chat", chatId);
    });

    socket.on('user_online_status', (data) => {
      if (data.userId === passedReceiverId) {
        setReceiverStatus(data.isOnline ? "online" : "offline");
        if (data.lastSeen) setLastSeen(data.lastSeen);
      }
    });

    return () => {
      socket.off('typing');
      socket.off('stop_typing');
      socket.off('message_received', handleMessageReceived);
      socket.off('message_deleted_update', handleMessageDeleted);
      socket.off('message_edited_update', handleMessageEdited);
      socket.off('message_reacted_update', handleMessageReacted);
      socket.off('user_online_status');
      socket.emit("leave_chat", chatId);
      unsubscribeFocus();
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [chatId, socket]);

  useEffect(() => {
    if (modalImage) {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }
    return () => ScreenCapture.allowScreenCaptureAsync();
  }, [modalImage]);

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/message/${chatId}`, { headers: { Authorization: `Bearer ${user.token}` }});
      setMessages(data);
    } catch (e) { console.log(e); }
    setFetching(false);
  };

  const fetchReceiverStatus = async () => {
    try {
      if (!passedReceiverId) return;
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/profile/${passedReceiverId}`, { headers: { Authorization: `Bearer ${user.token}` }});
      if (data.data && data.data.user) {
        setReceiverStatus(data.data.user.isOnline ? "online" : "offline");
        if (data.data.user.lastSeen) setLastSeen(data.data.user.lastSeen);
      }
    } catch (e) { console.log("Error fetching receiver status", e); }
  };

  const uploadMediaAPI = async (uri, mimeType, filename) => {
    try {
      console.log('📤 Starting upload...');
      console.log('📁 File info:', { uri, mimeType, filename });
      console.log('🔑 Token:', user.token ? '✅ Present' : '❌ Missing');
      
      const formData = new FormData();
      
      // React Native specific format for file upload
      console.log('📝 Creating FormData...');
      
      let fileObject;
      if (Platform.OS === 'web') {
        // Web - fetch the file and create File object
        const response = await fetch(uri);
        const blob = await response.blob();
        fileObject = new File([blob], filename, { type: mimeType });
        formData.append('media', fileObject);
      } else {
        // React Native - use the format we had
        fileObject = {
          uri: uri,
          type: mimeType,
          name: filename,
        };
        formData.append('media', fileObject, filename);
      }
      
      // Debug FormData (works for both web and React Native)
      console.log('📦 FormData entries count:', formData.entries ? Array.from(formData.entries()).length : 'N/A');
      console.log('📋 FormData content:');
      if (formData.entries) {
        for (let [key, value] of formData.entries()) {
          console.log(`  ${key}:`, value);
        }
      } else {
        console.log('  FormData not iterable');
      }
      
      console.log('� Sending request to:', `${ENVIRONMENT.API_URL}/api/upload`);
      
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}` 
        },
        timeout: 60000, // 60 seconds timeout for large files
      });
      
      console.log('✅ Upload successful:', data);
      return data.mediaUrl;
    } catch (error) {
      console.log('❌ Upload error:', error);
      console.log('Error response:', error.response);
      console.log('Error status:', error.response?.status);
      console.log('Error data:', error.response?.data);
      throw error;
    }
  };

  const sendMediaMessage = async (mediaUrl, type, duration = null) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: user,
      content: '',
      chat: chatId,
      messageType: type,
      mediaUrl: mediaUrl,
      voiceDuration: duration,
      sending: true,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [optimisticMsg, ...prev]);

    try {
      const msgPayload = { chatId, messageType: type, mediaUrl: mediaUrl, voiceDuration: duration };
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message`, msgPayload, { headers: { Authorization: `Bearer ${user.token}` }});
      
      setMessages(prev => prev.map(m => m._id === tempId ? data : m));
      socket.emit("new_message", data);
    } catch(err) { 
      console.log(err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      showAlert("Error", "Failed to send media", 'error');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage;
    const tempId = `temp_${Date.now()}`;
    
    socket.emit("stop_typing", chatId);
    setNewMessage("");

    const optimisticMsg = {
      _id: tempId,
      sender: user,
      content: text,
      chat: chatId,
      messageType: 'text',
      sending: true,
      createdAt: new Date().toISOString()
    };

    if (vanishMode) {
      optimisticMsg.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    }

    setMessages(prev => [optimisticMsg, ...prev]);

    try {
      const payload = { chatId, content: text, messageType: 'text' };
      if (vanishMode) payload.expiresAt = optimisticMsg.expiresAt;

      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message`, payload, { headers: { Authorization: `Bearer ${user.token}` }});
      
      setMessages(prev => prev.map(m => m._id === tempId ? data : m));
      socket.emit("new_message", data);
    } catch(err) { 
      console.log(err); 
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMessage(text); 
    }
  };

  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowOptionsModal(true);
  };

  const handleReact = async (emoji, msgIdArg) => {
    const msgId = msgIdArg || reactionMsgId;
    if (!msgId) return;

    try {
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message/react`, 
        { messageId: msgId, emoji },
        { headers: { Authorization: `Bearer ${user.token}` }}
      );
      
      setMessages(prev => prev.map(m => m._id === msgId ? data : m));
      socket.emit("message_reacted", { messageId: msgId, reactions: data.reactions, chatId });
    } catch(e) { 
      console.log("Reaction error:", e);
      showAlert("Error", "Failed to add reaction", 'error');
    } finally {
      setReactionMsgId(null);
    }
  };

  const toggleStar = async (msgId) => {
    try {
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message/star`, { messageId: msgId }, { headers: { Authorization: `Bearer ${user.token}` }});
      if (data.success) {
        setMessages(prev => prev.map(m => m._id === msgId ? {
          ...m, 
          isStarredBy: data.isStarred 
            ? [...(m.isStarredBy || []), user._id] 
            : (m.isStarredBy || []).filter(id => id !== user._id)
        } : m));
      }
    } catch(e) { console.log(e); }
  };

  const openForwardModal = async (msg) => {
    setMsgToForward(msg);
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/chat`, { headers: { Authorization: `Bearer ${user.token}` }});
      setAvailableChats(data);
      setShowForwardModal(true);
    } catch(e) { console.log(e); }
  };

  const forwardMsgToChat = async (targetChatId) => {
    try {
      await axios.post(`${ENVIRONMENT.API_URL}/api/message/forward`, { 
        messageId: msgToForward._id, 
        chatIds: [targetChatId] 
      }, { headers: { Authorization: `Bearer ${user.token}` }});
      setShowForwardModal(false);
      showAlert("Success", "Message forwarded!", 'success');
      
      // If we are currently in the target chat, we should refresh (highly unlikely in current navigation flow but good practice)
      if (targetChatId === chatId) fetchMessages();
    } catch(e) { 
      console.log(e); 
      showAlert("Error", "Forwarding failed", 'error');
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      const { data } = await axios.delete(`${ENVIRONMENT.API_URL}/api/message/${msgId}`, { headers: { Authorization: `Bearer ${user.token}` }});
      if (data.success) {
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deleted: true, content: "This message was deleted" } : m));
        socket.emit("message_deleted", { messageId: msgId, chatId });
      }
    } catch(e) { 
      console.log(e);
      showAlert("Error", "Cannot delete message", "error");
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    socket.emit('typing', chatId);
    // Debounce stop typing would be better, but simple timeout for now
  };

  // --- MEDIA PICKERS --- //
  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.8,
        allowsEditing: true
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 Image selected:', asset);
        
        const mimeType = asset.mimeType || 'image/jpeg';
        const filename = asset.fileName || `photo_${Date.now()}.jpg`;
        
        const url = await uploadMediaAPI(asset.uri, mimeType, filename);
        await sendMediaMessage(url, 'image');
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      showAlert('Error', 'Failed to pick image: ' + error.message, 'error');
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled) {
       const asset = result.assets[0];
       const url = await uploadMediaAPI(asset.uri, asset.mimeType || 'application/octet-stream', asset.name);
       sendMediaMessage(url, 'file');
    }
  };

  // --- CAMERA FUNCTION --- //
  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📷 Camera photo captured:', asset);
        
        const mimeType = asset.mimeType || 'image/jpeg';
        const filename = asset.fileName || `camera_${Date.now()}.jpg`;
        
        const url = await uploadMediaAPI(asset.uri, mimeType, filename);
        await sendMediaMessage(url, 'image');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      showAlert('Error', 'Failed to capture photo: ' + error.message, 'error');
    }
  };

  // --- UPDATE STREAK FUNCTION --- //
  const updateStreakWithChat = async () => {
    try {
      // Get other user in this chat
      const chatResponse = await axios.get(`${ENVIRONMENT.API_URL}/api/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      const chat = chatResponse.data;
      const otherUser = chat.users.find(u => u._id !== user._id);
      
      if (otherUser) {
        // Share media with this friend to update streak
        const formData = new FormData();
        formData.append('recipients', JSON.stringify([otherUser._id]));
        formData.append('caption', 'Shared via chat 📸');
        
        await axios.post(`${ENVIRONMENT.API_URL}/api/media/share`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data', 
            Authorization: `Bearer ${user.token}` 
          }
        });
      }
    } catch (error) {
      console.log('Streak update error:', error);
      // Don't show error to user, just log it
    }
  };

  // --- AUDIO LOGIC --- //
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async () => {
    try {
      clearInterval(recordingTimer.current);
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const url = await uploadMediaAPI(uri, 'audio/m4a', 'voice.m4a');
      sendMediaMessage(url, 'audio', recordingDuration);
    } catch (err) {
      console.error('Failed to send recording', err);
      showAlert('Voice Chat Error', 'Could not send voice message: ' + err.message, 'error');
    }
  };

  const renderBubble = ({ item }) => {
    const isMine = item.sender._id === user._id || item.sender === user._id;

    return (
      <View style={[
        styles.messageRow, 
        isMine ? styles.rowMine : styles.rowTheirs,
        item.sending && { opacity: 0.7 }
      ]}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onLongPress={() => !item.sending && handleLongPress(item)}
          style={{ width: '82%' }}
        >
          <LinearGradient
            colors={isMine ? ['#7B61FF', '#5A4FCF'] : ['#1E1E1E', '#161616']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
               styles.bubble,
               isMine ? styles.bubbleMine : styles.bubbleTheirs,
               item.expiresAt && styles.vanishBubble
            ]}
          >
            {item.isForwarded && (
              <View style={styles.forwardedHeader}>
                <Text style={styles.forwardedText}>Forwarded</Text>
              </View>
            )}
  
            {isGroupChat && (
              <Text style={[
                styles.senderName, 
                { color: isMine ? '#A0A0A0' : getSenderColor(item.sender?.username || item.sender?._id || 'User') }
              ]}>
                {isMine ? 'You' : (item.sender?.username || 'User')}
              </Text>
            )}
  
            {item.messageType === 'image' && (
               <TouchableOpacity onPress={() => setModalImage(item.mediaUrl)} style={styles.mediaContainer}>
                 <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} />
               </TouchableOpacity>
            )}
            
            {item.messageType === 'file' && (
               <TouchableOpacity style={styles.fileContainer} onPress={() => openFile(item.mediaUrl)}>
                  <Paperclip color="#FFF" size={20} />
                  <Text style={styles.messageText}> Open File</Text>
               </TouchableOpacity>
            )}
  
            {item.messageType === 'audio' && (
               <View style={styles.audioContainer}>
                 <TouchableOpacity 
                   style={styles.playButton} 
                   onPress={() => playAudio(item.mediaUrl)}
                 >
                   <Play color="#FFF" size={20} />
                 </TouchableOpacity>
                 <View style={styles.waveformContainer}>
                   <View style={styles.waveformBase} />
                   <View style={[styles.waveformProgress, { width: `${(currentAudioTime / (item.voiceDuration || 1)) * 100}%` }]} />
                   <View style={styles.waveformBars}>
                     {[...Array(15)].map((_, i) => (
                       <View key={i} style={[styles.waveformBar, { height: Math.random() * 15 + 8 }]} />
                     ))}
                   </View>
                 </View>
                 <Text style={styles.durationText}>{isPlayingAudio ? currentAudioTime : item.voiceDuration}s</Text>
               </View>
            )}
            
            {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
  
            {item.reactions && item.reactions.length > 0 && (
              <View style={[styles.reactionsContainer, isMine ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>
                 {Array.from(new Set(item.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, idx) => (
                   <Text key={idx} style={styles.reactionEmoji}>{emoji}</Text>
                 ))}
                 <Text style={styles.reactionCount}>{item.reactions.length}</Text>
              </View>
            )}
  
            <View style={styles.metaContainer}>
              {item.sending ? (
                <Clock size={12} color="rgba(255,255,255,0.5)" />
              ) : (
                <>
                  {item.isStarredBy?.includes(user._id) && <Star size={10} color="#FFD700" style={{marginRight: 4}} />}
                  <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {isMine && (
                    <CheckCheck 
                      color={item.seenBy?.length > 0 ? THEME.colors.readBlue : 'rgba(255,255,255,0.5)'} 
                      size={14} 
                    />
                  )}
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Full Screen Image Modal */}
      <Modal visible={modalImage !== null} transparent={true} animationType="fade" onRequestClose={() => setModalImage(null)}>
        <BlurView intensity={100} tint="dark" style={styles.modalContainer}>
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity style={styles.modalCloseBtnCircle} onPress={() => setModalImage(null)}>
              <X color="#FFF" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtnCircle} onPress={() => {}}>
               {/* Could add download icon here */}
            </TouchableOpacity>
          </View>
          {modalImage && <Image source={{ uri: modalImage }} style={styles.fullImageStyled} resizeMode="contain" />}
        </BlurView>
      </Modal>

      {/* Forward Modal */}
      <Modal visible={showForwardModal} animationType="slide" transparent={true}>
        <BlurView intensity={90} tint="dark" style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeaderExtended}>
              <View style={styles.modalGrabber} />
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitlePremium}>Forward Message</Text>
                <TouchableOpacity onPress={() => setShowForwardModal(false)} style={styles.modalCloseBtn}>
                  <X size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              <TextInput 
                style={styles.modalSearch} 
                placeholder="Search chats..." 
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
            <FlatList 
              data={availableChats}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({item}) => {
                const chatName = item.isGroupChat ? item.chatName : item.users.find(u => u._id !== user._id)?.username;
                const chatAvatar = item.isGroupChat ? 'https://via.placeholder.com/150' : item.users.find(u => u._id !== user._id)?.profilePhoto;
                return (
                  <TouchableOpacity style={styles.forwardItemPremium} onPress={() => forwardMsgToChat(item._id)}>
                    <Image source={{ uri: chatAvatar || 'https://i.pravatar.cc/150' }} style={styles.forwardAvatarPremium} />
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={styles.forwardNamePremium}>{chatName}</Text>
                      <Text style={styles.forwardSubtext}>{item.isGroupChat ? 'Group' : 'Direct Message'}</Text>
                    </View>
                    <LinearGradient colors={['#7B61FF', '#3DDCFF']} style={styles.sendIconWrapper}>
                      <Send size={16} color="#000" />
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </BlurView>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backContainer} onPress={() => navigation.goBack()}>
           <ChevronLeft color="#FFF" size={28} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerProfile} 
          onPress={() => {
            if (isGroupChat) {
               navigation.navigate('GroupChatDetailScreen', { chatId });
            } else {
               const receiverId = passedReceiverId || messages.find(m => m.sender?._id !== user?._id)?.sender?._id || messages.find(m => typeof m.sender === 'string' && m.sender !== user?._id)?.sender;
               if (receiverId) navigation.navigate('ProfileScreen', { userId: receiverId });
               else showAlert("Error", "Could not identify user profile.", "error");
            }
          }}
        >
           <Image 
             source={{ uri: avatar || 'https://i.pravatar.cc/150' }} 
             style={styles.headerAvatar} 
           />
           <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              <Text style={[
                styles.headerStatus, 
                receiverStatus === 'offline' && { color: THEME.colors.textDim }
              ]}>
                {isTyping ? "typing..." : receiverStatus}
              </Text>
           </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
           <TouchableOpacity onPress={() => setVanishMode(!vanishMode)}>
              <Clock color={vanishMode ? THEME.colors.danger : THEME.colors.textDim} size={24} style={{ marginRight: 20 }} />
           </TouchableOpacity>
           
            {/* Passing receiverId or participants to CallScreen for initiating invitations */}
            <TouchableOpacity onPress={() => {
               const receivers = isGroupChat 
                 ? chatUsers.filter(u => u._id !== user._id).map(u => u._id)
                 : [passedReceiverId || messages.find(m => m.sender?._id !== user?._id)?.sender?._id || messages.find(m => typeof m.sender === 'string' && m.sender !== user?._id)?.sender];
               
               console.log(`[FRONTEND] Starting Video Call with ${receivers.length} recipients`);
               if (receivers.length === 0 || !receivers[0]) showAlert("Error", "Could not identify users to call.", "error");
               else navigation.navigate('CallScreen', { chatId, type: 'video', name, receivers, isIncoming: false });
            }}>
               <Video color={THEME.colors.primary} size={24} style={{ marginRight: 20 }} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => {
               const receivers = isGroupChat 
                 ? chatUsers.filter(u => u._id !== user._id).map(u => u._id)
                 : [passedReceiverId || messages.find(m => m.sender?._id !== user?._id)?.sender?._id || messages.find(m => typeof m.sender === 'string' && m.sender !== user?._id)?.sender];
               
               console.log(`[FRONTEND] Starting Audio Call with ${receivers.length} recipients`);
               if (receivers.length === 0 || !receivers[0]) showAlert("Error", "Could not identify users to call.", "error");
               else navigation.navigate('CallScreen', { chatId, type: 'audio', name, receivers, isIncoming: false });
            }}>
               <Phone color={THEME.colors.secondary} size={24} style={{ marginRight: 10 }} />
            </TouchableOpacity>
        </View>
      </View>

      {fetching ? <ActivityIndicator style={{marginTop: 50}} color={THEME.colors.primary} /> : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderBubble}
          contentContainerStyle={{ padding: 15 }}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          inverted
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={styles.keyboardView}
      >
        <LinearGradient
            colors={['rgba(20,20,20,0.8)', 'rgba(10,10,10,1)']}
            style={styles.inputAreaGradient}
        >
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={pickDocument}><Paperclip color={THEME.colors.textDim} size={24} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={pickImage}><ImageIcon color={THEME.colors.textDim} size={24} /></TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={openCamera}><Video color={THEME.colors.primary} size={24} /></TouchableOpacity>
              
              {recording ? (
                 <View style={styles.recordingBar}>
                    <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
                 </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="Message..."
                  placeholderTextColor={THEME.colors.textDim}
                  value={newMessage}
                  onChangeText={handleTyping}
                  multiline
                />
              )}

              {newMessage.trim() ? (
                <TouchableOpacity onPress={sendMessage} style={[styles.iconButton, { backgroundColor: THEME.colors.primary, borderRadius: 25, padding: 8 }]}><Send color="#FFF" size={20} /></TouchableOpacity>
              ) : recording ? (
                <TouchableOpacity onPress={stopRecording} style={[styles.iconButton, { backgroundColor: THEME.colors.danger, borderRadius: 25, padding: 8 }]}><Square color="#FFF" size={20} /></TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startRecording} style={styles.iconButton}><Mic color={THEME.colors.textDim} size={24} /></TouchableOpacity>
              )}
            </View>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* NEW: Premium Message Options & Reaction Modal */}
      <Modal visible={showOptionsModal} transparent animationType="slide" onRequestClose={() => setShowOptionsModal(false)}>
         <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
           <View style={styles.optionsContent}>
              <View style={styles.reactionRow}>
                 {['❤️', '😂', '👍', '😮', '😢', '🙏'].map((emoji) => (
                   <TouchableOpacity key={emoji} onPress={() => { handleReact(emoji, selectedMessage?._id); setShowOptionsModal(false); }}>
                      <Text style={styles.reactionEmojiBtn}>{emoji}</Text>
                   </TouchableOpacity>
                 ))}
              </View>

              <View style={styles.optionsList}>
                 <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsModal(false); openForwardModal(selectedMessage); }}>
                    <View style={[styles.optionIcon, { backgroundColor: 'rgba(61, 220, 255, 0.1)' }]}><Send color={THEME.colors.secondary} size={20} /></View>
                    <Text style={styles.optionText}>Forward Message</Text>
                 </TouchableOpacity>

                 <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsModal(false); toggleStar(selectedMessage?._id); }}>
                    <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}><Star color="#FFD700" size={20} /></View>
                    <Text style={styles.optionText}>{selectedMessage?.isStarredBy?.includes(user._id) ? "Remove Star" : "Star Message"}</Text>
                 </TouchableOpacity>

                 <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsModal(false); deleteMessage(selectedMessage?._id); }}>
                    <View style={[styles.optionIcon, { backgroundColor: 'rgba(255, 75, 75, 0.1)' }]}><Trash2 color={THEME.colors.danger} size={20} /></View>
                    <Text style={[styles.optionText, { color: THEME.colors.danger }]}>Delete Message</Text>
                 </TouchableOpacity>
              </View>
           </View>
         </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: THEME.colors.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 12,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: { 
    color: '#FFF', 
    fontSize: 17, 
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerStatus: { 
    color: THEME.colors.primary, 
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  backContainer: {
    padding: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  messageRow: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    alignItems: 'flex-end', 
    maxWidth: '100%',
    paddingHorizontal: 20,
  },
  rowMine: { 
    justifyContent: 'flex-end' 
  },
  rowTheirs: { 
    justifyContent: 'flex-start' 
  },
  bubble: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    marginVertical: 4,
  },
  bubbleMine: { 
    borderBottomRightRadius: 4,
    borderWidth: 0,
  },
  bubbleTheirs: { 
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.9,
  },
  mediaPreview: { 
    width: 220, 
    height: 220, 
    borderRadius: 15, 
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fileContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  audioContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flex: 1,
    height: 40,
    position: 'relative',
    justifyContent: 'center',
  },
  waveformBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  waveformProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: THEME.colors.primary,
    borderRadius: 1,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  waveformBar: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  durationText: {
    color: THEME.colors.textDim,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 12,
    minWidth: 40,
  },
  messageText: { 
    color: '#FFFFFF', 
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  metaContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    marginTop: 6,
    gap: 4,
  },
  timestamp: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 10,
    fontWeight: '600',
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    padding: 12, 
    backgroundColor: 'transparent', 
    gap: 8,
  },
  keyboardView: {
    width: '100%',
  },
  inputAreaGradient: {
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  textInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.06)', 
    color: THEME.colors.text, 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    maxHeight: 120,
    fontSize: 16,
  },
  recordingBar: { 
    flex: 1, 
    padding: 15, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 20,
    marginHorizontal: 10,
  },
  recordingText: { 
    color: THEME.colors.danger, 
    fontWeight: '600',
    fontSize: 16,
  },
  iconButton: { 
    padding: 10,
    borderRadius: 20,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalHeaderRow: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  modalCloseBtnCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fullImageStyled: { 
    width: Dimensions.get('window').width, 
    height: Dimensions.get('window').height * 0.8,
  },
  modalHeaderExtended: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitlePremium: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalSearch: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  forwardItemPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  forwardAvatarPremium: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(123, 97, 255, 0.3)',
  },
  forwardNamePremium: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  forwardSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  sendIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  forwardedHeader: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 2,
  },
  forwardedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  vanishBubble: {
    backgroundColor: 'rgba(255, 75, 75, 0.2)',
    borderColor: '#FF4B4B',
    borderWidth: 1,
  },
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionEmoji: { fontSize: 12, marginRight: 2 },
  reactionCount: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  reactionPickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  reactionPickerContent: { 
    flexDirection: 'row', 
    backgroundColor: '#1E1E1E', 
    padding: 15, 
    borderRadius: 30, 
    gap: 15,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    elevation: 10
  },
  reactionEmojiBtn: { fontSize: 28 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  optionsContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 20,
    marginBottom: 24,
  },
  optionsList: {
    gap: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
