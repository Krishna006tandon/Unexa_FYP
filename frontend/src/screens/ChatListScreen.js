import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
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

  useEffect(() => {
    fetchChats();
    // Add focus listener to refresh when navigating back
    const unsubscribe = navigation.addListener('focus', () => {
      fetchChats();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchChats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/chat`, config);
      console.log('📡 [FRONTEND-CHATLIST] Received Data:', JSON.stringify(data, null, 2));
      setChats(data);
    } catch (e) {
      console.log("Error fetching chats", e);
    }
    setLoading(false);
  };

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
  container: { flex: 1, backgroundColor: THEME.colors.background },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  header: { color: THEME.colors.text, fontSize: 28, fontWeight: 'bold' },
  fab: { backgroundColor: THEME.colors.primary, padding: 10, borderRadius: 20 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: THEME.colors.glassBorder },
  avatarGradient: { width: 54, height: 54, borderRadius: 27, padding: 2, marginRight: 15, position: 'relative' },
  avatar: { width: '100%', height: '100%', borderRadius: 27, backgroundColor: '#1E1E1E' },
  statusBadge: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: THEME.colors.background },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatName: { color: THEME.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 5 },
  lastMessage: { color: THEME.colors.textDim, fontSize: 14 },
  metaData: { alignItems: 'flex-end', justifyContent: 'center' },
  timestamp: { color: THEME.colors.textDim, fontSize: 12, marginBottom: 5 }
});
