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
        const updated = prev.map(chat => {
          if (chat._id === newMessage.chat._id) {
            return { ...chat, latestMessage: newMessage };
          }
          return chat;
        });
        // Sort so latest message chat comes on top
        return updated.sort((a, b) =>
          new Date(b.latestMessage?.createdAt || b.updatedAt) -
          new Date(a.latestMessage?.createdAt || a.updatedAt)
        );
      });
    };

    socket.on('message_received', handleNewMessage);
    return () => socket.off('message_received', handleNewMessage);
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
      ? { uri: 'https://i.pravatar.cc/150?u=group' } 
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
          avatar: avatarInfo.uri 
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

      {loading ? <ActivityIndicator size="large" color={THEME.colors.primary} style={{marginTop: 50}} /> : (
        <FlatList
          data={chats}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{color: THEME.colors.textDim, textAlign: 'center'}}>No chats yet. Click the + to start chatting!</Text>}
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
  }
});
