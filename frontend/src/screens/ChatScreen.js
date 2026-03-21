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
import { Audio } from 'expo-audio';
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
    readBlue: '#34B7F1'
  }
};

const ChatScreen = ({ route, navigation }) => {
  const { chatId, name } = route.params;
  const { user } = useContext(AuthContext);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [recording, setRecording] = useState();
  const [recordingDuration, setRecordingDuration] = useState(0);

  const flatListRef = useRef(null);
  let recordingTimer = useRef(null);

  const [modalImage, setModalImage] = useState(null);

  const playAudio = async (url) => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
    } catch (err) {
      console.log('Error playing audio', err);
      Alert.alert('Audio Error', 'Could not play audio from: ' + url);
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
      const fileData = {
        uri: uri,
        type: mimeType,
        name: filename,
      };
      
      // Create proper file object for React Native
      console.log('📝 Creating FormData...');
      formData.append('media', {
        uri: uri,
        type: mimeType,
        name: filename,
      }, filename);
      
      console.log('� FormData entries count:', formData._parts.length);
      console.log('📋 FormData content:');
      for (let [key, value] of formData._parts) {
        console.log(`  ${key}:`, value);
      }
      
      console.log('�📡 Sending request to:', `${ENVIRONMENT.API_URL}/api/upload`);
      console.log('📦 FormData prepared:', fileData);
      
      const { data } = await axios.post(`${ENVIRONMENT.API_URL}/api/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}` 
        },
        timeout: 30000, // 30 seconds timeout for large files
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
    try {
      socket.emit("stop_typing", chatId);
      const text = newMessage;
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
             <TouchableOpacity style={styles.audioContainer} onPress={() => playAudio(item.mediaUrl)}>
                <Play color={THEME.colors.text} size={20} />
                <View style={styles.waveform} />
                <Text style={styles.messageText}>{item.voiceDuration}s</Text>
             </TouchableOpacity>
          )}
          
          {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}

          <View style={styles.metaContainer}>
            <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            {isMine && <CheckCheck color={item.seenBy?.length > 0 ? THEME.colors.readBlue : THEME.colors.textDim} size={14} style={{marginLeft: 4}} />}
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
          inverted={true}
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
  container: { flex: 1, backgroundColor: THEME.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: THEME.colors.glassBorder, backgroundColor: '#0A0A0A', marginTop: Platform.OS === 'android' ? 25 : 0 },
  backButton: { color: THEME.colors.primary, fontSize: 24, marginRight: 15 },
  headerInfo: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerName: { color: THEME.colors.text, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { color: THEME.colors.secondary, fontSize: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end', maxWidth: '100%' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { padding: 10, borderRadius: 20, maxWidth: '75%', minWidth: 80 },
  bubbleMine: { backgroundColor: THEME.colors.glass, borderWidth: 1, borderColor: THEME.colors.primary, borderBottomRightRadius: 5 },
  bubbleTheirs: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: THEME.colors.glassBorder, borderBottomLeftRadius: 5 },
  mediaPreview: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  fileContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, marginBottom: 5 },
  audioContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 20, marginBottom: 5 },
  waveform: { flex: 1, height: 2, backgroundColor: THEME.colors.primary, marginHorizontal: 10, width: 100 },
  messageText: { color: THEME.colors.text, fontSize: 16 },
  metaContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timestamp: { color: THEME.colors.textDim, fontSize: 11 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: THEME.colors.background, borderTopWidth: 1, borderColor: THEME.colors.glassBorder },
  textInput: { flex: 1, backgroundColor: THEME.colors.glass, color: THEME.colors.text, borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, marginHorizontal: 5, borderWidth: 1, borderColor: THEME.colors.glassBorder, maxHeight: 100 },
  recordingBar: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' },
  recordingText: { color: THEME.colors.danger, fontWeight: 'bold' },
  iconButton: { padding: 8 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  modalCloseText: { color: THEME.colors.primary, fontSize: 18, fontWeight: 'bold' },
  fullImage: { width: '100%', height: '80%' }
});
