import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Image as ImageIcon, Mic, Check, CheckCheck, Play, Paperclip, Square, Video, Phone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ENVIRONMENT from '../config/environment';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

let socket;

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
  const { chatId, name } = route.params;
  const { user } = useContext(AuthContext);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [recording, setRecording] = useState(undefined);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [modalImage, setModalImage] = useState(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
    socket = io(ENVIRONMENT.API_URL);
    socket.emit("setup", user);
    socket.emit("join_chat", chatId);

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));

    socket.on("message_received", (msg) => {
      if (chatId === msg.chat._id || chatId === msg.chat) {
        setMessages(prev => [msg, ...prev]); 
        socket.emit("measure_read", { messageId: msg._id, userId: user._id, chatId });
      }
    });

    fetchMessages();

    return () => {
      socket.disconnect();
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/message/${chatId}`, { headers: { Authorization: `Bearer ${user.token}` }});
      setMessages(data);
    } catch (e) { console.log(e); }
    setFetching(false);
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
    try {
      const msgPayload = { chatId, messageType: type, mediaUrl: mediaUrl, voiceDuration: duration };
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message`, msgPayload, { headers: { Authorization: `Bearer ${user.token}` }});
      socket.emit("new_message", data);
      setMessages(prev => [data, ...prev]);
    } catch(err) { console.log(err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage; // declare before try so catch can access it
    try {
      socket.emit("stop_typing", chatId);
      setNewMessage(""); // optimistic clear

      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/message`, { chatId, content: text, messageType: 'text' }, { headers: { Authorization: `Bearer ${user.token}` }});
      socket.emit("new_message", data);
      setMessages(prev => [data, ...prev]);
    } catch(err) { console.log(err); setNewMessage(text); } // restore if fail
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
      <View style={[styles.messageRow, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          
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
            <Text style={[styles.timestamp, isMine && { color: 'rgba(255,255,255,0.7)' }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            {isMine && <CheckCheck color={item.seenBy?.length > 0 ? THEME.colors.readBlue : 'rgba(255,255,255,0.7)'} size={14} style={{marginLeft: 4}} />}
          </View>
        </View>
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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>{"< "}</Text></TouchableOpacity>
        <View style={styles.headerInfo}>
           <Text style={styles.headerName}>{name}</Text>
           <Text style={styles.headerStatus}>{isTyping ? "typing..." : "online"}</Text>
        </View>
        <View style={styles.headerActions}>
           <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { chatId, type: 'video', name, profilePhoto: 'https://i.pravatar.cc/300' })}>
              <Video color={THEME.colors.primary} size={24} style={{ marginRight: 20 }} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { chatId, type: 'audio', name, profilePhoto: 'https://i.pravatar.cc/300' })}>
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
    padding: 20, 
    borderBottomWidth: 1, 
    borderColor: THEME.colors.border, 
    backgroundColor: THEME.colors.glass, 
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { 
    color: THEME.colors.primary, 
    fontSize: 24, 
    marginRight: 15,
    fontWeight: '600',
  },
  headerInfo: { 
    flex: 1 
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 15,
  },
  headerName: { 
    color: THEME.colors.text, 
    fontSize: 18, 
    fontWeight: '700' 
  },
  headerStatus: { 
    color: THEME.colors.secondary, 
    fontSize: 13,
    fontWeight: '500',
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
    padding: 15, 
    borderRadius: 20, 
    maxWidth: '75%', 
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bubbleMine: { 
    backgroundColor: THEME.colors.primary, 
    borderBottomRightRadius: 5,
    borderWidth: 0,
  },
  bubbleTheirs: { 
    backgroundColor: THEME.colors.glass, 
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: THEME.colors.glass, 
    borderTopWidth: 1, 
    borderColor: THEME.colors.border,
    gap: 10,
  },
  textInput: { 
    flex: 1, 
    backgroundColor: THEME.colors.background, 
    color: THEME.colors.text, 
    borderRadius: 25, 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 12, 
    borderWidth: 1, 
    borderColor: THEME.colors.border, 
    maxHeight: 100,
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
  }
});
