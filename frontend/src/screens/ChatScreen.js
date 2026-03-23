import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenCapture from 'expo-screen-capture';
import { Send, Image as ImageIcon, Mic, Check, CheckCheck, Play, Paperclip, Square, Video, Phone, Clock, Star, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
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
  const { chatId, name, receiverId: passedReceiverId, avatar } = route.params;
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);
  
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
      Alert.alert('Audio Error', 'Could not play audio: ' + err.message);
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

    // Join room for real-time messages
    socket.emit("join_chat", chatId);

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));

    const handleMessageReceived = (msg) => {
      if (chatId === msg.chat._id || chatId === msg.chat) {
        setMessages(prev => [msg, ...prev]); 
        socket.emit("measure_read", { messageId: msg._id, userId: user._id, chatId });
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true, content: "Message vanished" } : m));
    };

    const handleMessageEdited = ({ messageId, content }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content } : m));
    };

    socket.on("message_received", handleMessageReceived);
    socket.on("message_deleted_update", handleMessageDeleted);
    socket.on("message_edited_update", handleMessageEdited);

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
      Alert.alert("Error", "Failed to send media");
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
    Alert.alert(
      "Message Options",
      "Choose an action",
      [
        { text: "Forward", onPress: () => openForwardModal(msg) },
        { text: msg.isStarredBy?.includes(user._id) ? "Unstar" : "Star", onPress: () => toggleStar(msg._id) },
        { text: "Delete", style: "destructive", onPress: () => deleteMessage(msg._id) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const toggleStar = async (msgId) => {
    try {
      await axios.post(`${ENVIRONMENT.API_URL}/api/advanced/chat/${msgId}/star`, {}, { headers: { Authorization: `Bearer ${user.token}` }});
      fetchMessages(); // Refresh star state
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
      await axios.post(`${ENVIRONMENT.API_URL}/api/advanced/chat/forward`, { 
        messageId: msgToForward._id, 
        chatIds: [targetChatId] 
      }, { headers: { Authorization: `Bearer ${user.token}` }});
      setShowForwardModal(false);
      Alert.alert("Success", "Message forwarded!");
    } catch(e) { console.log(e); }
  };

  const deleteMessage = async (msgId) => {
    // Delete logic existing or new
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    socket.emit('typing', chatId);
    setTimeout(() => socket.emit("stop_typing", chatId), 3000);
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
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
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
      Alert.alert('Error', 'Failed to capture photo: ' + error.message);
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
      Alert.alert('Voice Chat Error', 'Could not send voice message: ' + err.message);
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
          activeOpacity={0.8}
          onLongPress={() => !item.sending && handleLongPress(item)}
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
          
          {item.messageType === 'image' && (
             <TouchableOpacity onPress={() => setModalImage(item.mediaUrl)}>
               <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} />
             </TouchableOpacity>
          )}
          {item.messageType === 'file' && (
             <TouchableOpacity style={styles.fileContainer} onPress={() => openFile(item.mediaUrl)}>
                <Paperclip color={THEME.colors.text} size={20} />
                <Text style={styles.messageText}> Open File</Text>
             </TouchableOpacity>
          )}
          {item.messageType === 'audio' && (
             <View style={styles.audioContainer}>
               <TouchableOpacity 
                 style={styles.playButton} 
                 onPress={() => playAudio(item.mediaUrl)}
               >
                 <Play color={THEME.colors.text} size={20} />
               </TouchableOpacity>
               
               {/* Waveform visualization */}
               <View style={styles.waveformContainer}>
                 <View style={styles.waveformBase} />
                 <View style={[styles.waveformProgress, { width: `${(currentAudioTime / (item.voiceDuration || 1)) * 100}%` }]} />
                 {/* Simulated waveform bars */}
                 <View style={styles.waveformBars}>
                   {[...Array(20)].map((_, i) => (
                     <View 
                       key={i} 
                       style={[
                         styles.waveformBar,
                         { height: Math.random() * 20 + 10 }
                       ]} 
                     />
                   ))}
                 </View>
               </View>
               
               <Text style={styles.durationText}>
                 {isPlayingAudio ? currentAudioTime : item.voiceDuration}s
               </Text>
             </View>
          )}
          
          {item.content ? <Text style={[styles.messageText, isMine && { color: '#FFF' }]}>{item.content}</Text> : null}

          <View style={styles.metaContainer}>
            {item.sending ? (
              <Clock size={12} color="rgba(255,255,255,0.5)" />
            ) : (
              <>
                {item.isStarredBy?.includes(user._id) && <Star size={10} color="#FFD700" style={{marginRight: 4}} />}
                <Text style={[styles.timestamp, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMine && (
                  <CheckCheck 
                    color={item.seenBy?.length > 0 ? THEME.colors.readBlue : 'rgba(255,255,255,0.7)'} 
                    size={14} 
                  />
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Full Screen Image Modal */}
      <Modal visible={modalImage !== null} transparent={true} onRequestClose={() => setModalImage(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setModalImage(null)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
          {modalImage && <Image source={{ uri: modalImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Forward Modal */}
      <Modal visible={showForwardModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Forward to...</Text>
            <TouchableOpacity onPress={() => setShowForwardModal(false)}>
              <X size={24} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList 
            data={availableChats}
            keyExtractor={item => item._id}
            renderItem={({item}) => (
              <TouchableOpacity style={styles.forwardItem} onPress={() => forwardMsgToChat(item._id)}>
                <Image source={{ uri: item.isGroupChat ? 'https://via.placeholder.com/150' : item.users.find(u => u._id !== user._id)?.profilePhoto }} style={styles.forwardAvatar} />
                <Text style={styles.forwardName}>{item.isGroupChat ? item.chatName : item.users.find(u => u._id !== user._id)?.username}</Text>
                <Send size={18} color={THEME.colors.primary} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backContainer} onPress={() => navigation.goBack()}>
           <Text style={styles.backButton}>{"<"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerProfile} 
          onPress={() => {
            const receiverId = passedReceiverId || messages.find(m => m.sender?._id !== user?._id)?.sender?._id || messages.find(m => typeof m.sender === 'string' && m.sender !== user?._id)?.sender;
            if (receiverId) navigation.navigate('ProfileScreen', { userId: receiverId });
            else Alert.alert("Error", "Could not identify user profile.");
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
           
           {/* Passing receiverId to CallScreen for initiating invitations */}
           <TouchableOpacity onPress={() => {
              const receiverId = passedReceiverId || messages.find(m => m.sender._id !== user._id)?.sender?._id || messages.find(m => m.sender !== user._id)?.sender;
              console.log(`[FRONTEND] Starting Video Call with Receiver ID: ${receiverId}`);
              if (!receiverId) Alert.alert("Error", "Could not identify the user to call.");
              else navigation.navigate('CallScreen', { chatId, type: 'video', name, receiverId, isIncoming: false });
           }}>
              <Video color={THEME.colors.primary} size={24} style={{ marginRight: 20 }} />
           </TouchableOpacity>
           
           <TouchableOpacity onPress={() => {
              const receiverId = passedReceiverId || messages.find(m => m.sender._id !== user._id)?.sender?._id || messages.find(m => m.sender !== user._id)?.sender;
              console.log(`[FRONTEND] Starting Audio Call with Receiver ID: ${receiverId}`);
              if (!receiverId) Alert.alert("Error", "Could not identify the user to call.");
               else navigation.navigate('CallScreen', { chatId, type: 'audio', name, receiverId, isIncoming: false });
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      </KeyboardAvoidingView>
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
    padding: 14, 
    borderRadius: 22, 
    maxWidth: '82%', 
    minWidth: 85,
    marginVertical: 4,
  },
  bubbleMine: { 
    backgroundColor: THEME.colors.primary, 
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleTheirs: { 
    backgroundColor: 'rgba(255, 255, 255, 0.08)', 
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    color: THEME.colors.text, 
    fontSize: 16,
    lineHeight: 22,
  },
  metaContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    marginTop: 8,
    gap: 4,
  },
  timestamp: { 
    color: THEME.colors.textDim, 
    fontSize: 11,
    fontWeight: '500',
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    padding: 15, 
    backgroundColor: 'transparent', 
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 8,
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
    backgroundColor: 'rgba(0,0,0,0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalClose: { 
    position: 'absolute', 
    top: 60, 
    right: 20, 
    zIndex: 10, 
    padding: 10,
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalCloseText: { 
    color: THEME.colors.text, 
    fontSize: 16, 
    fontWeight: '600' 
  },
  fullImage: { 
    width: '100%', 
    height: '80%',
    borderRadius: 20,
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
  forwardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  forwardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  forwardName: {
    color: THEME.colors.text,
    fontSize: 16,
    flex: 1,
    fontWeight: '600',
  },
});
