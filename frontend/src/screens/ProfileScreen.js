import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ProfileContext, useProfile } from '../context/ProfileContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from './AuthScreen';
import {
  User,
  Edit3,
  Camera,
  MapPin,
  Link,
  Calendar,
  Settings,
  Eye,
  EyeOff,
  Check,
  X,
  Upload,
  Globe,
  Mail,
  Phone,
  Star,
  Users,
  MessageCircle,
  Heart,
  Share2
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#7B61FF',
    secondary: '#3DDCFF',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800'
  }
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const {
    profile,
    loading,
    error,
    uploading,
    loadProfile,
    updateProfile,
    uploadAvatar,
    uploadCoverImage,
    toggleVisibility,
    clearError
  } = useProfile();
  
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error]);

  useEffect(() => {
    if (profile) {
      setEditForm(profile);
    }
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile().finally(() => setRefreshing(false));
  };

  const pickImage = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0], type);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (image, type) => {
    try {
      if (type === 'avatar') {
        await uploadAvatar(image.uri);
      } else {
        await uploadCoverImage(image.uri);
      }
      Alert.alert('Success', `${type === 'avatar' ? 'Avatar' : 'Cover image'} updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to upload ${type}`);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const updateData = {
        username: editForm.username,
        fullName: editForm.fullName,
        bio: editForm.bio,
        email: editForm.email,
        phone: editForm.phone,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender,
        location: editForm.location,
        website: editForm.website,
        socialLinks: editForm.socialLinks,
        interests: editForm.interests,
        skills: editForm.skills,
        notificationSettings: editForm.notificationSettings,
        privacySettings: editForm.privacySettings,
      };

      await updateProfile(updateData);
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleToggleProfileVisibility = async () => {
    try {
      await toggleVisibility();
      Alert.alert('Success', `Profile is now ${profile?.isPrivate ? 'private' : 'public'}`);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Error', 'Failed to update visibility');
    }
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {profile?.coverImage ? (
          <Image source={{ uri: `${API_URL}${profile.coverImage}` }} style={styles.coverImage} />
        ) : (
          <LinearGradient
            colors={[THEME.colors.primary, THEME.colors.secondary]}
            style={styles.coverPlaceholder}
          />
        )}
        
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => pickImage('cover')}
          disabled={uploading}
        >
          <Camera size={20} color={THEME.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          {profile?.avatar ? (
            <Image source={{ uri: `${API_URL}${profile.avatar}` }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={40} color={THEME.colors.textDim} />
            </View>
          )}
          
          {profile?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Star size={12} color={THEME.colors.text} />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.avatarCameraButton}
            onPress={() => pickImage('avatar')}
            disabled={uploading}
          >
            <Camera size={16} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.fullName}>{profile?.fullName}</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editButton}>
            <Edit3 size={20} color={THEME.colors.textDim} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.username}>@{profile?.username}</Text>
        
        {profile?.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.postsCount || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleProfileVisibility}>
            {profile?.isPrivate ? (
              <EyeOff size={20} color={THEME.colors.text} />
            ) : (
              <Eye size={20} color={THEME.colors.text} />
            )}
            <Text style={styles.actionButtonText}>
              {profile?.isPrivate ? 'Private' : 'Public'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
            <Settings size={20} color={THEME.colors.text} />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEditForm = () => (
    <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={editForm.fullName || ''}
            onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
            placeholder="Enter your full name"
            placeholderTextColor={THEME.colors.textDim}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={editForm.username || ''}
            onChangeText={(text) => setEditForm({ ...editForm, username: text })}
            placeholder="Enter username"
            placeholderTextColor={THEME.colors.textDim}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={editForm.bio || ''}
            onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
            placeholder="Tell us about yourself"
            placeholderTextColor={THEME.colors.textDim}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={editForm.email || ''}
            onChangeText={(text) => setEditForm({ ...editForm, email: text })}
            placeholder="Enter your email"
            placeholderTextColor={THEME.colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={editForm.phone || ''}
            onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
            placeholder="Enter your phone number"
            placeholderTextColor={THEME.colors.textDim}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={editForm.website || ''}
            onChangeText={(text) => setEditForm({ ...editForm, website: text })}
            placeholder="Enter your website"
            placeholderTextColor={THEME.colors.textDim}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderProfileDetails = () => (
    <ScrollView style={styles.profileDetails} showsVerticalScrollIndicator={false}>
      {profile?.location?.city && (
        <View style={styles.detailItem}>
          <MapPin size={20} color={THEME.colors.textDim} />
          <Text style={styles.detailText}>
            {profile.location.city}, {profile.location.country}
          </Text>
        </View>
      )}

      {profile?.website && (
        <View style={styles.detailItem}>
          <Link size={20} color={THEME.colors.textDim} />
          <Text style={styles.detailText}>{profile.website}</Text>
        </View>
      )}

      {profile?.dateOfBirth && (
        <View style={styles.detailItem}>
          <Calendar size={20} color={THEME.colors.textDim} />
          <Text style={styles.detailText}>
            Born {new Date(profile.dateOfBirth).toLocaleDateString()}
          </Text>
        </View>
      )}

      {profile?.interests && profile.interests.length > 0 && (
        <View style={styles.interestsSection}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsContainer}>
            {profile.interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {profile?.skills && profile.skills.length > 0 && (
        <View style={styles.skillsSection}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsContainer}>
            {profile.skills.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {editMode ? renderEditForm() : renderProfileHeader()}
        {!editMode && renderProfileDetails()}
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <X size={24} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.settingsContent}>
            <TouchableOpacity style={styles.settingItem}>
              <MessageCircle size={20} color={THEME.colors.textDim} />
              <Text style={styles.settingText}>Message Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Users size={20} color={THEME.colors.textDim} />
              <Text style={styles.settingText}>Privacy Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Heart size={20} color={THEME.colors.textDim} />
              <Text style={styles.settingText}>Notification Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem}>
              <Share2 size={20} color={THEME.colors.textDim} />
              <Text style={styles.settingText}>Share Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.text,
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  logoutText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    marginBottom: 20,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: THEME.colors.primary,
    borderRadius: 25,
    padding: 12,
    borderWidth: 2,
    borderColor: THEME.colors.background,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -50,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: THEME.colors.background,
  },
  avatarPlaceholder: {
    backgroundColor: THEME.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.colors.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.background,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileInfo: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullName: {
    color: THEME.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  username: {
    color: THEME.colors.textDim,
    fontSize: 16,
    marginTop: 5,
  },
  bio: {
    color: THEME.colors.text,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.glass,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    gap: 8,
  },
  actionButtonText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  profileDetails: {
    paddingHorizontal: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 15,
  },
  detailText: {
    color: THEME.colors.text,
    fontSize: 14,
    flex: 1,
  },
  interestsSection: {
    marginTop: 30,
  },
  skillsSection: {
    marginTop: 30,
  },
  sectionTitle: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: THEME.colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  interestText: {
    color: THEME.colors.text,
    fontSize: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: THEME.colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  skillText: {
    color: THEME.colors.primary,
    fontSize: 12,
  },
  editForm: {
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.colors.glass,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: THEME.colors.text,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: THEME.colors.glass,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  cancelButtonText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
  },
  modalTitle: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.glassBorder,
    gap: 15,
  },
  settingText: {
    color: THEME.colors.text,
    fontSize: 16,
    flex: 1,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadingText: {
    color: THEME.colors.text,
    marginTop: 10,
    fontSize: 16,
  },
});

export default ProfileScreen;
