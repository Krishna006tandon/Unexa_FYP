import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';
import { Plus } from 'lucide-react-native';
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

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
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
    setLoading(false);
  }, [user.token]);

  useEffect(() => {
    fetchChats();
    // Refresh on tab focus
    const unsubscribe = navigation.addListener('focus', fetchChats);
    return unsubscribe;
  }, [navigation, fetchChats]);

  // ⚡ REAL-TIME: Update chat list when a new message arrives
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      setChats(prev => {
        const chatIdx = prev.findIndex(c => c._id === (newMessage.chat._id || newMessage.chat));
        if (chatIdx === -1) return prev;
        
        const updatedChats = [...prev];
        updatedChats[chatIdx] = { 
          ...updatedChats[chatIdx], 
          latestMessage: newMessage,
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    const isGroup = item.isGroupChat;
    // Get sender who is not the logged in user
    const otherUser = item.users.find(u => u._id !== user._id) || item.users[0];
    
    const name = isGroup ? item.chatName : otherUser.username;
    // Real avatar from backend avatar field
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
            <View style={[styles.statusBadge, { backgroundColor: otherUser.isOnline ? '#00FF00' : '#808080' }]} />
        </LinearGradient>

        <View style={styles.chatDetails}>
          <Text style={styles.chatName}>{name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMsgContent}</Text>
        </View>

        <View style={styles.metaData}>
          <Text style={styles.timestamp}>{formatTime(item.latestMessage?.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
         <Text style={styles.header}>Chats</Text>
         <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewChat')}>
            <Plus color="#FFF" size={24} />
         </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[styles.chatCard, { opacity: 0.3 }]}>
              <View style={[styles.avatarGradient, { backgroundColor: '#222' }]} />
              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ height: 15, width: '40%', backgroundColor: '#222', borderRadius: 4 }} />
                <View style={{ height: 12, width: '70%', backgroundColor: '#222', borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>No conversations yet.</Text>
               <Text style={styles.emptySubText}>Start a new chat to begin!</Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={5}
        />
      )}
    </View>
  );
};

export default ChatListScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: THEME.colors.background 
  },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 65, 
    paddingHorizontal: 25,
    marginBottom: 10
  },
  header: { 
    color: THEME.colors.text, 
    fontSize: 32, 
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  fab: { 
    backgroundColor: THEME.colors.primary, 
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)'
  },
  avatarGradient: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    padding: 2, 
    marginRight: 16, 
    position: 'relative' 
  },
  avatar: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 28, 
    backgroundColor: '#1E1E1E' 
  },
  statusBadge: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    borderWidth: 2, 
    borderColor: THEME.colors.background 
  },
  chatDetails: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  chatName: { 
    color: THEME.colors.text, 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  lastMessage: { 
    color: THEME.colors.textDim, 
    fontSize: 14,
    lineHeight: 18
  },
  metaData: { 
    alignItems: 'flex-end', 
    justifyContent: 'flex-start',
    height: '100%',
    paddingTop: 5,
    paddingLeft: 10
  },
  timestamp: { 
    color: THEME.colors.textDim, 
    fontSize: 12, 
    fontWeight: '500'
  },
  emptyContainer: {
    padding: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubText: {
    color: THEME.colors.textDim,
    fontSize: 14,
    textAlign: 'center',
  }
});
