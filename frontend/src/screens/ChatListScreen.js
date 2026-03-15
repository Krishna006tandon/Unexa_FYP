import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Mock Data for UI demonstration since Database isn't hooked up yet
const mockChats = [
  {
    _id: '1',
    chatName: 'Sender',
    isGroupChat: false,
    users: [{ _id: '2', username: 'Alex Johnson', profilePhoto: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }],
    latestMessage: { content: 'Hey, did you see the new feature?', createdAt: new Date().toISOString() }
  },
  {
    _id: '2',
    chatName: 'Design Team',
    isGroupChat: true,
    users: [],
    latestMessage: { content: 'Alex sent an image', createdAt: new Date(Date.now() - 3600000).toISOString() }
  }
];

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
  const [chats, setChats] = useState(mockChats);

  // In production:
  // useEffect(() => { fetchChats() }, [])

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    const isGroup = item.isGroupChat;
    const name = isGroup ? item.chatName : item.users[0].username;
    const avatarInfo = isGroup 
        ? null // Add group placeholder icon here
        : { uri: item.users[0].profilePhoto };

    return (
      <TouchableOpacity 
        style={styles.chatCard} 
        onPress={() => navigation.navigate('ChatScreen', { chatId: item._id, name: name })}
      >
        <LinearGradient
            colors={[THEME.colors.primary, THEME.colors.secondary]}
            style={styles.avatarGradient}
        >
            <Image 
               source={avatarInfo} 
               style={styles.avatar} 
            />
        </LinearGradient>

        <View style={styles.chatDetails}>
          <Text style={styles.chatName}>{name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.latestMessage?.content}
          </Text>
        </View>

        <View style={styles.metaData}>
          <Text style={styles.timestamp}>{formatTime(item.latestMessage?.createdAt)}</Text>
          {/* Unread badge mock */}
          <View style={styles.unreadBadge}>
             <Text style={styles.unreadText}>2</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
      />
    </View>
  );
};

export default ChatListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    color: THEME.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 20,
    marginTop: 60,
    marginBottom: 10,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    marginRight: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#1E1E1E',
  },
  chatDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  lastMessage: {
    color: THEME.colors.textDim,
    fontSize: 14,
  },
  metaData: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timestamp: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: THEME.colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
