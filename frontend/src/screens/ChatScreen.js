import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Image, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Image as ImageIcon, Mic, Check, CheckCheck, Play, Paperclip, MoreVertical, X, Edit2, Trash2, CornerUpLeft } from 'lucide-react-native';
import io from 'socket.io-client';

const ENDPOINT = "http://localhost:5000"; // Fallback URL
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
    danger: '#FF4A4A',
    readBlue: '#34B7F1' // WhatsApp style blue tick
  }
};

const ChatScreen = ({ route, navigation }) => {
  const { chatId, name } = route?.params || { chatId: 'mockId_1', name: 'Alex Johnson' };
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);

  const user = { _id: 'myUserId123' }; 
  const flatListRef = useRef(null);

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.emit("join_chat", chatId);

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));

    socket.on("message_received", (msg) => {
      // If we receive a message in this active chat, emit Read Receipt
      if (chatId === msg.chat._id || chatId === msg.chat) {
        setMessages(prev => [msg, ...prev]); 
        socket.emit("measure_read", { messageId: msg._id, userId: user._id, chatId });
      }
    });

    socket.on('message_edited_update', ({ messageId, content }) => {
       setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content, edited: true } : m));
    });

    socket.on('message_deleted_update', ({ messageId }) => {
       setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true, content: "This message was deleted", mediaUrl: null } : m));
    });

    socket.on('message_read', ({ messageId, userId }) => {
       setMessages(prev => prev.map(m => m._id === messageId ? { ...m, seenBy: [...(m.seenBy||[]), userId] } : m));
    });

    return () => {
      socket.disconnect();
    };
  }, [chatId]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      socket.emit("stop_typing", chatId);
      
      if (editingMsg) {
         socket.emit("message_edited", { messageId: editingMsg._id, content: newMessage, chatId });
         setMessages(prev => prev.map(m => m._id === editingMsg._id ? { ...m, content: newMessage, edited: true } : m));
         setEditingMsg(null);
         setNewMessage("");
         return;
      }

      const msgData = {
        _id: Math.random().toString(),
        content: newMessage,
        sender: user,
        chat: { _id: chatId },
        createdAt: new Date().toISOString(),
        replyTo: replyingTo,
        seenBy: [],
        deliveredTo: []
      };
      
      socket.emit("new_message", msgData);
      setMessages(prev => [msgData, ...prev]);
      setNewMessage("");
      setReplyingTo(null);
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    if (!typing) {
      setTyping(true);
      socket.emit('typing', chatId);
    }
    
    // Auto stop if idle
    let lastTypingTime = new Date().getTime();
    setTimeout(() => {
      var timeDiff = new Date().getTime() - lastTypingTime;
      if (timeDiff >= 3000 && typing) {
        socket.emit("stop_typing", chatId);
        setTyping(false);
      }
    }, 3000);
  };

  const deleteMsg = (msgId) => {
      socket.emit("message_deleted", { messageId: msgId, chatId });
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deleted: true, content: "This message was deleted", mediaUrl: null } : m));
  };

  const renderBubble = ({ item }) => {
    const isMine = item.sender._id === user._id || item.sender === user._id; // fallback if unpopulated
    const isRead = item.seenBy && item.seenBy.length > 0;
    const isDelivered = item.deliveredTo && item.deliveredTo.length > 0;

    return (
      <View style={[styles.messageRow, isMine ? styles.rowMine : styles.rowTheirs]}>
        
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs, item.deleted && styles.bubbleDeleted]}>
          
          {/* Reply Context */}
          {item.replyTo && (
            <View style={styles.replyPreview}>
               <Text style={styles.replySender}>{isMine ? 'You' : name}</Text>
               <Text style={styles.replyText} numberOfLines={1}>{item.replyTo.content || 'Media'}</Text>
            </View>
          )}

          {/* Media Visuals Mock */}
          {item.mediaUrl && !item.deleted && (
             <Image source={{ uri: item.mediaUrl }} style={styles.mediaPreview} />
          )}

          {/* Text Content */}
          <Text style={[styles.messageText, item.deleted && { fontStyle: 'italic', color: THEME.colors.textDim }]}>
             {item.content}
          </Text>

          {/* Meta Data (Time + Ticks) */}
          <View style={styles.metaContainer}>
            <Text style={styles.timestamp}>
               {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.edited && <Text style={styles.editedText}> (edited)</Text>}
            
            {isMine && !item.deleted && (
               <View style={styles.receiptContainer}>
                 {isRead ? (
                   <CheckCheck color={THEME.colors.readBlue} size={14} />
                 ) : isDelivered ? (
                   <CheckCheck color={THEME.colors.textDim} size={14} />
                 ) : (
                   <Check color={THEME.colors.textDim} size={14} />
                 )}
               </View>
            )}
          </View>
        </View>

        {/* Action Menu Hack for Demo */}
        {isMine && !item.deleted && (
            <View style={styles.msgActions}>
              <TouchableOpacity onPress={() => setReplyingTo(item)}><CornerUpLeft color={THEME.colors.textDim} size={16} /></TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingMsg(item); setNewMessage(item.content); }}><Edit2 color={THEME.colors.textDim} size={16} style={{marginVertical: 5}}/></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteMsg(item._id)}><Trash2 color={THEME.colors.danger} size={16} /></TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{"< "}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
           <Text style={styles.headerName}>{name}</Text>
           <Text style={styles.headerStatus}>{isTyping ? "typing..." : "online"}</Text>
        </View>
        <TouchableOpacity>
           <MoreVertical color={THEME.colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={renderBubble}
        inverted={true}  /* Reverses the list so newest is bottom automatically */
        contentContainerStyle={{ padding: 15 }}
      />

      {/* REPLING / EDITING PREVIEW */}
      {(replyingTo || editingMsg) && (
         <View style={styles.activeActionBanner}>
            <View>
               <Text style={styles.actionTitle}>{editingMsg ? 'Editing Message' : `Replying to ${replyingTo.sender._id === user._id ? 'yourself' : name}`}</Text>
               <Text style={styles.actionPreview} numberOfLines={1}>{editingMsg ? editingMsg.content : replyingTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMsg(null); setNewMessage(""); }}>
               <X color={THEME.colors.textDim} size={20} />
            </TouchableOpacity>
         </View>
      )}

      {/* INPUT */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.iconButton}>
             <Paperclip color={THEME.colors.textDim} size={24} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={THEME.colors.textDim}
            value={newMessage}
            onChangeText={handleTyping}
            multiline
          />
          {newMessage.trim() ? (
            <TouchableOpacity onPress={sendMessage} style={[styles.iconButton, { backgroundColor: THEME.colors.primary, borderRadius: 25, padding: 8 }]}>
               <Send color="#FFF" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconButton}>
               <Mic color={THEME.colors.textDim} size={24} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    borderBottomWidth: 1, borderColor: THEME.colors.glassBorder,
    backgroundColor: '#0A0A0A', marginTop: Platform.OS === 'android' ? 25 : 0
  },
  backButton: { color: THEME.colors.primary, fontSize: 24, marginRight: 15 },
  headerInfo: { flex: 1 },
  headerName: { color: THEME.colors.text, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { color: THEME.colors.secondary, fontSize: 12 },
  
  messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end', maxWidth: '100%' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  
  bubble: { padding: 12, borderRadius: 20, maxWidth: '75%', minWidth: 80 },
  bubbleMine: { backgroundColor: THEME.colors.glass, borderWidth: 1, borderColor: THEME.colors.primary, borderBottomRightRadius: 5 },
  bubbleTheirs: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: THEME.colors.glassBorder, borderBottomLeftRadius: 5 },
  bubbleDeleted: { backgroundColor: 'transparent', borderColor: THEME.colors.glassBorder, borderStyle: 'dashed' },
  
  replyPreview: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: THEME.colors.primary, marginBottom: 8 },
  replySender: { color: THEME.colors.primary, fontSize: 12, fontWeight: 'bold' },
  replyText: { color: THEME.colors.textDim, fontSize: 14 },

  mediaPreview: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  
  messageText: { color: THEME.colors.text, fontSize: 16, lineHeight: 22 },
  
  metaContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timestamp: { color: THEME.colors.textDim, fontSize: 11 },
  editedText: { color: THEME.colors.textDim, fontSize: 11, fontStyle: 'italic', marginHorizontal: 4 },
  receiptContainer: { marginLeft: 5 },
  
  msgActions: { width: 25, alignItems: 'center', marginLeft: 10, marginRight: 10, justifyContent: 'space-around' },
  
  activeActionBanner: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 12, borderTopWidth: 1, borderColor: THEME.colors.primary },
  actionTitle: { color: THEME.colors.primary, fontSize: 14, fontWeight: 'bold' },
  actionPreview: { color: THEME.colors.textDim, fontSize: 13, marginTop: 2, maxWidth: 300 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: THEME.colors.background, borderTopWidth: 1, borderColor: THEME.colors.glassBorder },
  textInput: { flex: 1, backgroundColor: THEME.colors.glass, color: THEME.colors.text, borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, marginHorizontal: 10, borderWidth: 1, borderColor: THEME.colors.glassBorder, maxHeight: 100 },
  iconButton: { padding: 8, marginBottom: 4 }
});
