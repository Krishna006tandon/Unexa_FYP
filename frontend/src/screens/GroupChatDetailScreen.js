import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Edit3, UserPlus, LogOut, Trash2, Camera, Shield, User, MoreVertical, CheckCircle, XCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
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
    success: '#00E676',
  }
};

const GroupChatDetailScreen = ({ route, navigation }) => {
  const { chatId } = route.params;
  const { user } = useContext(AuthContext);

  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchChatDetails();
  }, [chatId]);

  const fetchChatDetails = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setChat(data);
      setNewName(data.chatName);
    } catch (error) {
      console.log('Error fetching chat details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await axios.put(
        `${ENVIRONMENT.API_URL}/api/chat/rename`,
        { chatId, chatName: newName },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setChat(data);
      setIsRenaming(false);
      Alert.alert('Success', 'Group renamed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to rename group');
    }
  };

  const handleLeaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.put(
                `${ENVIRONMENT.API_URL}/api/chat/remove`,
                { chatId, userId: user._id },
                { headers: { Authorization: `Bearer ${user.token}` } }
              );
              navigation.navigate('ChatList');
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const removeFromGroup = async (targetUserId) => {
     if (chat.groupAdmin !== user._id && user._id !== targetUserId) {
        Alert.alert("Denied", "Only administrators can remove members.");
        return;
     }

     Alert.alert(
      'Remove Member',
      'Remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await axios.put(
                `${ENVIRONMENT.API_URL}/api/chat/remove`,
                { chatId, userId: targetUserId },
                { headers: { Authorization: `Bearer ${user.token}` } }
              );
              setChat(data);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleSearchUsers = async (query) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/auth?search=${query}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSearchResults(data);
    } catch (error) {
      console.log('Search error:', error);
    }
  };

  const addToGroup = async (targetUserId) => {
    try {
      const { data } = await axios.put(
        `${ENVIRONMENT.API_URL}/api/chat/add`,
        { chatId, userId: targetUserId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setChat(data);
      setIsAddingMember(false);
      Alert.alert('Success', 'Member added');
    } catch (error) {
      Alert.alert('Error', 'User might already be in the group');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleUploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadPhoto = async (uri) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', {
        uri,
        name: 'group_photo.jpg',
        type: 'image/jpeg',
      });

      const uploadRes = await axios.post(`${ENVIRONMENT.API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      const { data } = await axios.put(
        `${ENVIRONMENT.API_URL}/api/chat/update-photo`,
        { chatId, groupPhoto: uploadRes.data.mediaUrl },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setChat(data);
      Alert.alert('Success', 'Group photo updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleAdmin = async (targetUserId) => {
    try {
      const { data } = await axios.put(
        `${ENVIRONMENT.API_URL}/api/chat/toggle-admin`,
        { chatId, userId: targetUserId },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setChat(data);
      Alert.alert('Success', 'Admin status updated');
    } catch (error) {
      Alert.alert('Error', error.response?.data || 'Failed to update admin status');
    }
  };

  const showMemberOptions = (member) => {
    if (member._id === user._id) return;
    
    const isTargetAdmin = chat?.admins?.some(a => (a._id || a) === member._id) || false;
    const isAdmin = chat?.admins?.some(a => (a._id || a) === user._id) || false;
    
    if (!isAdmin) return;

    Alert.alert(
      'Member Options',
      `Manage ${member.username}`,
      [
        { text: isTargetAdmin ? 'Dismiss as Admin' : 'Make Admin', onPress: () => handleToggleAdmin(member._id) },
        { text: 'Remove from Group', style: 'destructive', onPress: () => removeFromGroup(member._id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  const isAdmin = chat?.admins?.some(a => (a._id || a) === user._id) || chat?.groupAdmin === user._id || chat?.groupAdmin?._id === user._id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={THEME.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: chat?.groupPhoto || 'https://i.pravatar.cc/150?u=group' }}
              style={styles.avatar}
            />
            {isAdmin && (
              <TouchableOpacity style={styles.cameraIcon} onPress={pickImage} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color="#FFF" /> : <Camera color="#FFF" size={16} />}
              </TouchableOpacity>
            )}
          </View>
          
          {isRenaming ? (
            <View style={styles.renameContainer}>
              <TextInput
                style={styles.renameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity onPress={handleRenameGroup} style={styles.saveBtn}>
                 <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.groupName}>{chat?.chatName}</Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => setIsRenaming(true)}>
                  <Edit3 color={THEME.colors.textDim} size={18} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={styles.memberCount}>{chat?.users.length} members</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingMember(true)}>
                <UserPlus color={THEME.colors.primary} size={20} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {chat?.users.map((item) => (
            <TouchableOpacity 
              key={item._id} 
              style={styles.userCard}
              onLongPress={() => showMemberOptions(item)}
              activeOpacity={0.7}
            >
               <Image source={{ uri: item.profilePhoto || 'https://i.pravatar.cc/150' }} style={styles.userAvatar} />
               <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.username} {item._id === user._id && '(You)'}</Text>
                  {chat?.admins?.some(a => (a._id || a) === item._id) && (
                    <View style={styles.adminBadge}>
                       <Shield size={10} color={THEME.colors.secondary} />
                       <Text style={styles.adminLabel}>Admin</Text>
                    </View>
                  )}
               </View>
               
               {isAdmin && item._id !== user._id && (
                 <TouchableOpacity onPress={() => showMemberOptions(item)}>
                    <MoreVertical color={THEME.colors.textDim} size={20} />
                 </TouchableOpacity>
               )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsSection}>
           <TouchableOpacity style={styles.actionItem} onPress={handleLeaveGroup}>
              <LogOut color={THEME.colors.danger} size={20} />
              <Text style={[styles.actionText, { color: THEME.colors.danger }]}>Leave Group</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={isAddingMember} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Add Members</Text>
             <TouchableOpacity onPress={() => setIsAddingMember(false)}>
                <Text style={styles.closeBtn}>Close</Text>
             </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={THEME.colors.textDim}
            value={search}
            onChangeText={handleSearchUsers}
          />

          <FlatList
            data={searchResults}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultCard} onPress={() => addToGroup(item._id)}>
                 <Image source={{ uri: item.profilePhoto }} style={styles.userAvatar} />
                 <Text style={styles.userName}>{item.username}</Text>
                 <View style={styles.plusIcon}>
                   <UserPlus size={18} color={THEME.colors.primary} />
                 </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 20 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default GroupChatDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  scrollContent: { paddingBottom: 40 },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWide: 3, borderColor: THEME.colors.primary },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.colors.primary,
    padding: 8,
    borderRadius: 20,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  memberCount: { color: THEME.colors.textDim, fontSize: 14, marginTop: 5 },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: THEME.colors.textDim, fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnText: { color: THEME.colors.primary, fontWeight: '700' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  adminLabel: { color: THEME.colors.secondary, fontSize: 10, fontWeight: '800' },
  actionsSection: { marginTop: 30, borderTopWidth: 1, borderTopColor: THEME.colors.glassBorder },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20 },
  actionText: { fontSize: 16, fontWeight: '600' },
  renameContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  renameInput: { 
    flex: 1, 
    backgroundColor: THEME.colors.glass, 
    color: '#FFF', 
    padding: 10, 
    borderRadius: 8, 
    fontSize: 18, 
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: THEME.colors.primary
  },
  saveBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: THEME.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { color: THEME.colors.primary, fontSize: 16, fontWeight: '700' },
  searchInput: {
    backgroundColor: THEME.colors.glass,
    color: '#FFF',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  plusIcon: { marginLeft: 'auto' },
});
