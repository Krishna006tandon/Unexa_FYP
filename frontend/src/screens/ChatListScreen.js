import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { Plus, Phone, PhoneMissed, PhoneOutgoing, PhoneIncoming, MessageSquare } from 'lucide-react-native';
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
    danger: '#FF4B4B',
  }
};

const ChatListScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'calls'
  const [chats, setChats] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const { socket } = useContext(ProfileContext);

  const fetchChats = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/chat`, config);
      setChats(data);
    } catch (e) {
      console.log("Error fetching chats", e);
    }
  }, [user.token]);

  const fetchCalls = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/webrtc/calls`, config);
      setCalls(data);
    } catch (e) {
      console.log("Error fetching calls", e);
    }
  }, [user.token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchChats(), fetchCalls()]);
      setLoading(false);
    };
    init();

    const unsubscribe = navigation.addListener('focus', init);
    return unsubscribe;
  }, [navigation, fetchChats, fetchCalls]);

  // ⚡ REAL-TIME: Update chat list and call logs
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      setChats(prev => {
        const receivedChatId = (newMessage.chat?._id || newMessage.chat || '').toString();
        const chatIdx = prev.findIndex(c => c._id.toString() === receivedChatId);
        if (chatIdx === -1) return prev;
        
        const updatedChats = [...prev];
        const isCurrentChat = false; // We don't know if it's current from here, but backend logic handles seenBy

        updatedChats[chatIdx] = { 
          ...updatedChats[chatIdx], 
          latestMessage: newMessage,
          unreadCount: (updatedChats[chatIdx].unreadCount || 0) + 1,
          updatedAt: new Date().toISOString() 
        };
        
        const chat = updatedChats.splice(chatIdx, 1)[0];
        updatedChats.unshift(chat);
        return updatedChats;
      });
    };

    const handlePresence = (data) => {
      setChats(prev => prev.map(chat => ({
        ...chat,
        users: chat.users.map(u => u._id === data.userId ? { ...u, isOnline: data.isOnline } : u)
      })));
    };

    socket.on('message_received', handleNewMessage);
    socket.on('user_online_status', handlePresence);

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('user_online_status', handlePresence);
    };
  }, [socket]);

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChatItem = ({ item }) => {
    const isGroup = item.isGroupChat;
    const otherUser = item.users.find(u => u._id !== user._id) || item.users[0];
    const name = isGroup ? item.chatName : otherUser.username;
    const avatarInfo = isGroup 
      ? { uri: item.groupPhoto || 'https://via.placeholder.com/150?text=Group' } 
      : { uri: otherUser.avatar || otherUser.profilePhoto || 'https://i.pravatar.cc/150' };

    const lastMsgContent = item.latestMessage 
       ? (item.latestMessage.messageType !== 'text' ? `[${item.latestMessage.messageType}]` : item.latestMessage.content)
       : "No messages yet";

    return (
      <TouchableOpacity 
        style={styles.chatCard} 
        onPress={() => navigation.navigate('ChatScreen', { 
          chatId: item._id, 
          name: name, 
          receiverId: otherUser._id,
          avatar: avatarInfo.uri,
          isGroupChat: item.isGroupChat
        })}
      >
        <LinearGradient colors={[THEME.colors.primary, THEME.colors.secondary]} style={styles.avatarGradient}>
            <Image source={avatarInfo} style={styles.avatar} />
            {!isGroup && <View style={[styles.statusBadge, { backgroundColor: otherUser.isOnline ? '#00FF00' : '#808080' }]} />}
        </LinearGradient>

        <View style={styles.chatDetails}>
          <Text style={styles.chatName}>{name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMsgContent}</Text>
        </View>

        <View style={styles.metaData}>
          <Text style={styles.timestamp}>{formatTime(item.latestMessage?.createdAt || item.updatedAt)}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCallItem = ({ item }) => {
    const isOutgoing = item.caller._id === user._id;
    const otherParty = isOutgoing ? (item.receivers[0] || {}) : item.caller;
    const avatarUri = otherParty.profilePhoto || 'https://i.pravatar.cc/150';
    
    let Icon = PhoneIncoming;
    let iconColor = THEME.colors.secondary;

    if (isOutgoing) {
      Icon = PhoneOutgoing;
      iconColor = THEME.colors.primary;
    } else if (item.status === 'missed') {
      Icon = PhoneMissed;
      iconColor = THEME.colors.danger;
    }

    return (
      <TouchableOpacity style={styles.chatCard}>
        <Image source={{ uri: avatarUri }} style={styles.callAvatar} />
        <View style={styles.chatDetails}>
           <Text style={styles.chatName}>{otherParty.username || 'System'}</Text>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon size={14} color={iconColor} style={{ marginRight: 5 }} />
              <Text style={styles.lastMessage}>{item.type === 'video' ? 'Video' : 'Voice'} Call • {formatTime(item.startedAt)}</Text>
           </View>
        </View>
        <TouchableOpacity style={styles.callBackBtn} onPress={() => {
            navigation.navigate('CallScreen', {
                chatId: item.chatId,
                type: item.type,
                name: otherParty.username,
                receiverId: otherParty._id,
                avatar: avatarUri,
                isIncoming: false
            });
        }}>
           <Phone size={20} color={THEME.colors.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
         <Text style={styles.header}>{activeTab === 'chats' ? 'Messages' : 'Calls'}</Text>
         <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewChat')}>
            <Plus color="#FFF" size={24} />
         </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]} 
          onPress={() => setActiveTab('chats')}
        >
          <MessageSquare size={20} color={activeTab === 'chats' ? THEME.colors.primary : THEME.colors.textDim} />
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'calls' && styles.activeTab]} 
          onPress={() => setActiveTab('calls')}
        >
          <Phone size={20} color={activeTab === 'calls' ? THEME.colors.primary : THEME.colors.textDim} />
          <Text style={[styles.tabText, activeTab === 'calls' && styles.activeTabText]}>Calls</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'chats' ? chats : calls}
          keyExtractor={item => item._id}
          renderItem={activeTab === 'chats' ? renderChatItem : renderCallItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No {activeTab} yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ChatListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 65, paddingHorizontal: 25, marginBottom: 10 },
  header: { color: THEME.colors.text, fontSize: 32, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', marginHorizontal: 25, marginVertical: 15, backgroundColor: THEME.colors.glass, borderRadius: 15, padding: 5 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: 'rgba(123, 97, 255, 0.1)' },
  tabText: { color: THEME.colors.textDim, marginLeft: 8, fontWeight: '600' },
  activeTabText: { color: THEME.colors.primary },
  fab: { backgroundColor: THEME.colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  avatarGradient: { width: 56, height: 56, borderRadius: 28, padding: 2, marginRight: 15 },
  avatar: { width: '100%', height: '100%', borderRadius: 26, backgroundColor: '#1E1E1E' },
  callAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 15, backgroundColor: '#1E1E1E' },
  statusBadge: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: THEME.colors.background },
  chatDetails: { flex: 1 },
  chatName: { color: THEME.colors.text, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  lastMessage: { color: THEME.colors.textDim, fontSize: 13 },
  metaData: { alignItems: 'flex-end' },
  timestamp: { color: THEME.colors.textDim, fontSize: 12, marginBottom: 5 },
  unreadBadge: { backgroundColor: THEME.colors.primary, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  callBackBtn: { padding: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: THEME.colors.textDim, fontSize: 16 }
});
