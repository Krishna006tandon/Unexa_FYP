import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, MessageSquare, Clock } from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ENVIRONMENT from '../config/environment';
import { LinearGradient } from 'expo-linear-gradient';

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

const StarredMessagesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStarredMessages();
  }, []);

  const fetchStarredMessages = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/message/starred`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(data);
    } catch (error) {
      console.error('Fetch starred messages error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStarredMessages();
  };

  const renderStarredMessage = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageCard}
      onPress={() => navigation.navigate('ChatScreen', { 
        chatId: item.chat._id, 
        name: item.chat.chatName || item.sender.username 
      })}
    >
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.sender.profilePhoto }} style={styles.avatar} />
        <View style={styles.cardInfo}>
          <Text style={styles.senderName}>{item.sender.username}</Text>
          <Text style={styles.chatName}>in {item.chat.chatName || 'Direct Chat'}</Text>
        </View>
        <Star color={THEME.colors.primary} size={16} fill={THEME.colors.primary} />
      </View>
      
      <View style={styles.cardBody}>
        {item.messageType === 'text' ? (
          <Text style={styles.messageText}>{item.content}</Text>
        ) : (
          <View style={styles.mediaPlaceholder}>
            <MessageSquare color={THEME.colors.textDim} size={20} />
            <Text style={styles.mediaText}>Media Content ({item.messageType})</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardFooter}>
        <Clock color={THEME.colors.textDim} size={12} />
        <Text style={styles.footerText}>
          {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={THEME.colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Starred Messages</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={THEME.colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderStarredMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.iconCircle}>
                <Star color={THEME.colors.textDim} size={40} />
              </View>
              <Text style={styles.emptyTitle}>No Starred Messages</Text>
              <Text style={styles.emptySub}>Long-press any message in a chat and select "Star" to save it here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder
  },
  headerTitle: { color: THEME.colors.text, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  listContent: { padding: 20 },
  messageCard: {
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  cardInfo: { flex: 1 },
  senderName: { color: THEME.colors.text, fontSize: 15, fontWeight: 'bold' },
  chatName: { color: THEME.colors.textDim, fontSize: 12 },
  cardBody: { marginBottom: 12, paddingLeft: 48 },
  messageText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  mediaPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 12 },
  mediaText: { color: THEME.colors.textDim, fontSize: 13 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  footerText: { color: THEME.colors.textDim, fontSize: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: THEME.colors.textDim, marginTop: 15 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 50 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.colors.glass, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: THEME.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptySub: { color: THEME.colors.textDim, textAlign: 'center', lineHeight: 20 }
});

export default StarredMessagesScreen;
