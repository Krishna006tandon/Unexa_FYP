import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ProfileContext, { useProfile } from '../context/ProfileContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUI } from '../context/UIContext';
import ENVIRONMENT from '../config/environment';
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
  Share2,
  Scan,
  Plus,
  UserPlus,
  Lock,
  MessageSquare,
  Video
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';



const THEME = {
  colors: {
    background: '#0A0A0A',
    primary: '#edeaeaff',
    secondary: '#160d0dff',
    text: '#FFFFFF',
    textDim: '#A0A0A0',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800'
  }
};

const ProfileScreen = ({ navigation, route }) => {
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
  const { showAlert } = useUI();

  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [insights, setInsights] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [archivedStories, setArchivedStories] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedArchiveStories, setSelectedArchiveStories] = useState([]);
  const [hlTitle, setHlTitle] = useState("");
  const [otherProfile, setOtherProfile] = useState(null);
  const scrollViewRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const isMyProfile = !route.params?.userId || route.params?.userId === user?._id;
  const displayProfile = isMyProfile ? profile : otherProfile;

  useEffect(() => {
    if (!isMyProfile) {
      console.log('👤 [PROFILE-VIEW] Loading profile for ID:', route.params?.userId);
      fetchOtherProfile(route.params.userId);
    } else {
      loadProfile();
      fetchInsights();
      fetchHighlights();
    }
  }, [route.params?.userId]);

  const fetchOtherProfile = async (id) => {
    try {
      const res = await axios.get(`${ENVIRONMENT.API_URL}/api/profile/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      const { data, isLocked } = res.data;
      setOtherProfile(data);
      setIsFollowing(data.isFollowing);
      setIsCloseFriend(data.isCloseFriend);
      setIsProfileLocked(isLocked || false);
      // Track view
      axios.post(`${ENVIRONMENT.API_URL}/api/advanced/profile/${id}/view`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
      // Fetch mutuals
      const mutRes = await axios.get(`${ENVIRONMENT.API_URL}/api/advanced/profile/${id}/mutuals`, { headers: { Authorization: `Bearer ${user.token}` } });
      setMutualFriends(mutRes.data);
      
      // Fetch highlights for other user
      fetchHighlights(id);
    } catch (e) { console.log(e); }
  };

  const fetchInsights = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/advanced/profile/insights`, { headers: { Authorization: `Bearer ${user.token}` } });
      setInsights(data);
    } catch (e) { console.log(e); }
  };

  const fetchHighlights = async (id) => {
    try {
      const targetId = id || user._id;
      const hlRes = await axios.get(`${ENVIRONMENT.API_URL}/api/advanced/profile/${targetId}/highlights`, { headers: { Authorization: `Bearer ${user.token}` } });
      setHighlights(hlRes.data);
    } catch (e) {
      console.log('Error fetching highlights:', e);
    }
  };

  const fetchArchive = async () => {
    try {
      const { data } = await axios.get(`${ENVIRONMENT.API_URL}/api/story/archived`, { headers: { Authorization: `Bearer ${user.token}` } });
      setArchivedStories(data);
      setShowArchive(true);
    } catch (e) { console.log(e); }
  };

  const handleCreateHighlight = async () => {
    if (!hlTitle || selectedArchiveStories.length === 0) return showAlert("Required", "Title and stories selection required", "warning");
    try {
      await axios.post(`${ENVIRONMENT.API_URL}/api/advanced/profile/highlights`, {
        title: hlTitle,
        stories: selectedArchiveStories,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setShowArchive(false);
      setHlTitle("");
      setSelectedArchiveStories([]);
      fetchHighlights(); // Refresh highlights
    } catch (e) { console.log(e); }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        return showAlert("Permission Required", "Please allow camera access to scan profile QR codes.", "warning");
      }
    }
    setShowScanner(true);
  };

  const handleShareLink = async () => {
    try {
      const userId = displayProfile?.user?._id || displayProfile?.user || user?._id;
      const shareUrl = `unexa://profile/${userId}`;
      const webUrl = `${ENVIRONMENT.API_URL}/profile/${userId}`;
      
      await Share.share({
        message: `Connect with me on Unexa! 🚀\nProfile: ${shareUrl}\nWeb: ${webUrl}`,
        url: shareUrl, 
        title: 'Unexa Profile Share'
      });
    } catch (error) {
      console.log('Share Error:', error.message);
    }
  };

  const onBarCodeScanned = ({ data }) => {
    if (!showScanner) return;
    setShowScanner(false);
    console.log('📸 [SCANNER] Scanned content:', data);
    try {
      // Handle unexa://profile/ID, http://.../profile/ID, or just ID
      let userId = '';
      if (data.includes('profile/')) {
        userId = data.split('profile/')[1].split('/')[0].split('?')[0];
      } else {
        // Fallback: If it's a URL, take the last part. If not, take it as is.
        const parts = data.split('/');
        userId = parts[parts.length - 1].split('?')[0] || data;
      }
      
      userId = userId.trim();

      if (userId.length === 24) { // MongoDB ID length
        navigation.push('ProfileScreen', { userId });
      } else {
        showAlert("Invalid QR", "This does not look like a valid Unexa profile QR.", "error");
      }
    } catch (e) {
      console.log('❌ [SCANNER] Error processing QR:', e.message);
      showAlert("Error", "Failed to process QR code.", "error");
    }
  };

  const handleFollow = async () => {
    const targetUserId = displayProfile?.user?._id || displayProfile?.user;
    if (!targetUserId) return Alert.alert("Error", "Target user ID not found");

    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const url = `${ENVIRONMENT.API_URL}/api/profile/${targetUserId}/${endpoint}`;
      console.log('📡 [FOLLOW] Sending request to:', url);

      await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Update follow count in UI immediately
      if (!isMyProfile) {
        setOtherProfile(prev => ({
          ...prev,
          followersCount: isFollowing ? (prev.followersCount - 1) : (prev.followersCount + 1)
        }));
      }

      setIsFollowing(!isFollowing);
    } catch (e) {
      console.log('❌ [FOLLOW] Error:', e.response?.status, e.message);
      showAlert("Error", e.response?.data?.message || "Failed to update following status", "error");
    }
  };

  const handleToggleCloseFriend = async () => {
    const targetUserId = displayProfile?.user?._id || displayProfile?.user;
    if (!targetUserId) return Alert.alert("Error", "Target user ID not found");

    try {
      const url = `${ENVIRONMENT.API_URL}/api/profile/${targetUserId}/close-friend`;
      console.log('📡 [CLOSE-FRIEND] Sending request to:', url);

      const res = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setIsCloseFriend(res.data.isCloseFriend);
    } catch (e) {
      console.log('❌ [CLOSE-FRIEND] Error:', e.response?.status, e.message);
      showAlert("Error", "Failed to update close friend status", "error");
    }
  };

  const toggleArchiveSelection = (id) => {
    if (selectedArchiveStories.includes(id)) {
      setSelectedArchiveStories(selectedArchiveStories.filter(s => s !== id));
    } else {
      setSelectedArchiveStories([...selectedArchiveStories, id]);
    }
  };

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
        showAlert('Permission Required', 'Please grant camera roll permissions', 'warning');
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
      showAlert('Success', `${type === 'avatar' ? 'Avatar' : 'Cover image'} updated successfully`, 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('Error', `Failed to upload ${type}`, 'error');
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
      showAlert('Success', 'Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error', error.message || 'Failed to update profile', 'error');
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
        {displayProfile?.coverImage ? (
          <Image source={{ uri: displayProfile.coverImage }} style={styles.coverImage} />
        ) : (
          <LinearGradient
            colors={[THEME.colors.primary, THEME.colors.secondary]}
            style={styles.coverPlaceholder}
          />
        )}

        {isMyProfile && (
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={() => pickImage('cover')}
            disabled={uploading}
          >
            <Camera size={20} color={THEME.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          {displayProfile?.avatar ? (
            <Image source={{ uri: displayProfile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={40} color={THEME.colors.textDim} />
            </View>
          )}

          {displayProfile?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Star size={12} color={THEME.colors.text} />
            </View>
          )}

          {isMyProfile && (
            <TouchableOpacity
              style={styles.avatarCameraButton}
              onPress={() => pickImage('avatar')}
              disabled={uploading}
            >
              <Camera size={16} color={THEME.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.fullName}>{displayProfile?.fullName}</Text>
          {isMyProfile && (
            <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editButton}>
              <Edit3 size={20} color={THEME.colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.username}>@{displayProfile?.username}</Text>

        {displayProfile?.bio && (
          <Text style={styles.bio}>{displayProfile.bio}</Text>
        )}

        {mutualFriends.length > 0 && !editMode && (
          <View style={styles.mutualsRow}>
            <Users size={14} color={THEME.colors.textDim} />
            <Text style={styles.mutualsText}>
              Followed by {mutualFriends[0].username} {mutualFriends.length > 1 ? `and ${mutualFriends.length - 1} others` : ''}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{displayProfile?.postsCount || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{displayProfile?.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statNumber}>{displayProfile?.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>🔥 {displayProfile?.totalStreaks || 0}</Text>
            <Text style={styles.statLabel}>Streaks</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {!isMyProfile ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <UserPlus size={20} color={isFollowing ? THEME.colors.textDim : THEME.colors.text} />
                <Text style={styles.actionButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, isCloseFriend && styles.closeFriendActiveButton]}
                onPress={handleToggleCloseFriend}
              >
                <Heart size={20} color={isCloseFriend ? '#1DB954' : THEME.colors.text} fill={isCloseFriend ? '#1DB954' : 'transparent'} />
                <Text style={styles.actionButtonText}>Close Friend</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleToggleProfileVisibility}>
                {displayProfile?.isPrivate ? (
                  <EyeOff size={20} color={THEME.colors.text} />
                ) : (
                  <Eye size={20} color={THEME.colors.text} />
                )}
                <Text style={styles.actionButtonText}>
                  {displayProfile?.isPrivate ? 'Private' : 'Public'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
                <Settings size={20} color={THEME.colors.text} />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.qrShareButton} onPress={() => setShowQR(true)}>
          <Scan size={20} color={THEME.colors.primary} />
          <Text style={styles.qrShareText}>My Profile QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.qrScanButton} onPress={handleOpenScanner}>
          <Camera size={20} color={THEME.colors.secondary} />
          <Text style={styles.qrScanText}>Scan Profile QR</Text>
        </TouchableOpacity>

        {isProfileLocked && (
          <View style={styles.lockedContainer}>
            <Lock size={60} color={THEME.colors.textDim} />
            <Text style={styles.lockedTitle}>Private Profile</Text>
            <Text style={styles.lockedSubtitle}>Follow this user to see their full profile and interaction stats.</Text>
          </View>
        )}

        {/* Highlights Section (Hidden for locked accounts) */}
        {!isProfileLocked && (
          <View style={styles.highlightsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {!route.params?.userId && (
                <TouchableOpacity style={styles.addHighlightBtn} onPress={fetchArchive}>
                  <View style={styles.addHighlightCircle}>
                    <Plus size={24} color={THEME.colors.primary} />
                  </View>
                  <Text style={styles.highlightTitle}>New</Text>
                </TouchableOpacity>
              )}
              {highlights.map((hl, i) => (
                <TouchableOpacity 
                   key={i} 
                   style={styles.highlightItem}
                   onPress={() => {
                     if (hl.stories && hl.stories.length > 0) {
                        const owner = isMyProfile ? { 
                          _id: user._id, 
                          username: profile?.username, 
                          profilePhoto: profile?.avatar 
                        } : { 
                          _id: otherProfile?.user?._id || otherProfile?.user, 
                          username: otherProfile?.username, 
                          profilePhoto: otherProfile?.avatar 
                        };
                        
                        navigation.navigate('StoryScreen', { 
                          stories: hl.stories, 
                          user: owner
                        });
                     } else {
                        showAlert('Empty Highlight', 'This highlight contains no stories.', 'info');
                     }
                   }}
                >
                  <Image source={{ uri: hl.coverImage || hl.stories[0]?.mediaUrl }} style={styles.highlightCircle} />
                  <Text style={styles.highlightTitle} numberOfLines={1}>{hl.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
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

      {insights.length > 0 && !route.params?.userId && !profile?.isPrivate && (
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Profile Insights</Text>
          <View style={styles.chartContainer}>
            {insights.map((day, idx) => (
              <View key={idx} style={styles.chartBarWrapper}>
                <View style={[styles.chartBar, { height: Math.min(day.views * 10, 100) }]} />
                <Text style={styles.chartLabel}>{day._id.split('-')[2]}</Text>
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
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <BlurView intensity={95} tint="dark" style={{ flex: 1 }}>
          <View style={styles.modalHeaderPremium}>
            <View style={styles.modalGrabberLine} />
            <View style={styles.modalHeaderRowText}>
              <Text style={styles.modalTitleLarge}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.modalCloseCircle}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.settingsContentPremium}>
            <TouchableOpacity 
              style={styles.settingItemPremium} 
              onPress={() => {
                setShowSettings(false);
                navigation.navigate('StarredMessagesScreen');
              }}
            >
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                <Star size={22} color="#FFD700" fill="#FFD700" />
              </View>
              <Text style={styles.settingTextPremium}>Starred Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItemPremium}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(123, 97, 255, 0.1)' }]}>
                <MessageCircle size={22} color="#7B61FF" />
              </View>
              <Text style={styles.settingTextPremium}>Message Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItemPremium}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(61, 220, 255, 0.1)' }]}>
                <Users size={22} color="#3DDCFF" />
              </View>
              <Text style={styles.settingTextPremium}>Privacy Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItemPremium}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(255, 75, 75, 0.1)' }]}>
                <Heart size={22} color="#FF4B4B" />
              </View>
              <Text style={styles.settingTextPremium}>Notification Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItemPremium} onPress={handleShareLink}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                <Share2 size={22} color="#FFF" />
              </View>
              <Text style={styles.settingTextPremium}>Share Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingItemPremium, { marginTop: 40 }]} onPress={logout}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(255, 75, 75, 0.1)' }]}>
                <X size={22} color="#FF4B4B" />
              </View>
              <Text style={[styles.settingTextPremium, { color: '#FF4B4B' }]}>Logout Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </BlurView>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQR(false)}
      >
        <BlurView intensity={100} tint="dark" style={styles.qrModalContainer}>
          <TouchableOpacity style={styles.qrCloseOverlay} onPress={() => setShowQR(false)} />
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
            style={styles.qrModalContentStyled}
          >
            <TouchableOpacity style={styles.qrCloseBtnInner} onPress={() => setShowQR(false)}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.qrUserHeader}>
              <Image source={{ uri: profile?.avatar }} style={styles.qrAvatarMini} />
              <View>
                <Text style={styles.qrTitleLarge}>@{profile?.username}</Text>
                <Text style={styles.qrSubtitleSmall}>Scan to connect</Text>
              </View>
            </View>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={`unexa://profile/${displayProfile?.user?._id || displayProfile?.user || user?._id}`}
                size={220}
                color="#7B61FF"
                backgroundColor="transparent"
              />
            </View>

            <TouchableOpacity style={styles.qrShareBtnPremium} onPress={handleShareLink}>
              <LinearGradient colors={['#7B61FF', '#3DDCFF']} style={styles.qrShareGradient}>
                <Share2 size={20} color="#000" />
                <Text style={styles.qrShareBtnTextPremium}>Share Profile Link</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Modal>

      {/* Archive Modal */}
      <Modal visible={showArchive} animationType="slide">
        <View style={{ flex: 1, backgroundColor: THEME.colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Highlight</Text>
            <TouchableOpacity onPress={() => setShowArchive(false)}>
              <X size={24} color={THEME.colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.hlInput}
            placeholder="Highlight Title"
            placeholderTextColor={THEME.colors.textDim}
            value={hlTitle}
            onChangeText={setHlTitle}
          />
          <FlatList
            numColumns={3}
            data={archivedStories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleArchiveSelection(item._id)}
                style={[styles.archiveItem, selectedArchiveStories.includes(item._id) && { borderColor: THEME.colors.primary, borderWidth: 2 }]}
              >
                <Image source={{ uri: item.mediaUrl }} style={styles.archiveThumb} />
                {item.mediaType === 'video' && (
                  <View style={styles.videoIndicator}>
                    <Video color="#FFF" size={20} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.createHlBtn} onPress={handleCreateHighlight}>
            <Text style={styles.createHlText}>Create Highlight</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={styles.scannerModal}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={onBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget} />
            <Text style={styles.scannerText}>Align QR code within the frame</Text>
          </View>
          <TouchableOpacity
            style={styles.scannerClose}
            onPress={() => setShowScanner(false)}
          >
            <X size={32} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>
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
    paddingHorizontal: 25,
    paddingTop: 65,
    paddingBottom: 20,
    backgroundColor: THEME.colors.background,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 75, 75, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.15)',
  },
  logoutText: {
    color: '#FF4B4B',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    marginBottom: 20,
  },
  coverContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -60,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: THEME.colors.background,
    borderRadius: 60,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    backgroundColor: THEME.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.background,
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
  },
  profileInfo: {
    paddingHorizontal: 25,
    marginTop: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  fullName: {
    color: THEME.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  username: {
    color: THEME.colors.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  bio: {
    color: THEME.colors.textDim,
    fontSize: 14,
    marginTop: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
    marginBottom: 25,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: THEME.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: THEME.colors.textDim,
    fontSize: 9.5,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  qrShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    backgroundColor: THEME.colors.glass,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.primary + '50',
    gap: 10,
  },
  qrShareText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
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
  qrModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '80%',
    backgroundColor: THEME.colors.background,
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  qrCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  qrTitle: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  qrSubtitle: {
    color: THEME.colors.textDim,
    fontSize: 14,
    marginBottom: 30,
    marginTop: 5,
  },
  qrCodeWrapper: {
    backgroundColor: THEME.colors.primary,
    padding: 15,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  qrShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.glass,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
  },
  qrShareBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
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
  mutualsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  mutualsText: {
    color: THEME.colors.textDim,
    fontSize: 13,
  },
  analyticsSection: {
    marginTop: 25,
    paddingBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    backgroundColor: THEME.colors.glass,
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
  },
  chartBarWrapper: {
    alignItems: 'center',
    width: 30,
  },
  chartBar: {
    width: 6,
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  chartLabel: {
    color: THEME.colors.textDim,
    fontSize: 10,
    marginTop: 5,
  },
  highlightsContainer: {
    marginTop: 20,
    paddingLeft: 0,
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 65,
  },
  highlightCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: THEME.colors.glassBorder,
    marginBottom: 5,
  },
  addHighlightBtn: {
    alignItems: 'center',
    marginRight: 15,
  },
  addHighlightCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  highlightTitle: {
    color: THEME.colors.text,
    fontSize: 11,
    textAlign: 'center',
  },
  hlInput: {
    backgroundColor: THEME.colors.glass,
    margin: 20,
    padding: 15,
    borderRadius: 15,
    color: '#FFF',
    fontSize: 16,
  },
  archiveItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  archiveThumb: {
    width: '100%',
    height: '100%',
  },
  createHlBtn: {
    backgroundColor: THEME.colors.primary,
    margin: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  createHlText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  followingButton: {
    borderColor: THEME.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeFriendActiveButton: {
    borderColor: '#1DB954',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  qrScanButton: {
    backgroundColor: THEME.colors.glass,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    gap: 12,
  },
  qrScanText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  lockedContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    marginTop: 20,
    backgroundColor: THEME.colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.glassBorder,
    paddingHorizontal: 30,
  },
  lockedTitle: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
  },
  lockedSubtitle: {
    color: THEME.colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scannerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerText: {
    color: '#FFF',
    marginTop: 30,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderPremium: {
    paddingTop: 20,
    backgroundColor: 'rgba(123, 97, 255, 0.05)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalGrabberLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeaderRowText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  modalTitleLarge: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  modalCloseCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContentPremium: {
    padding: 24,
  },
  settingItemPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextPremium: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  qrModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCloseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  qrModalContentStyled: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: 'rgba(15, 15, 20, 0.95)',
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 20,
  },
  qrCloseBtnInner: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 5,
  },
  qrUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 15,
    alignSelf: 'flex-start',
  },
  qrAvatarMini: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#7B61FF',
  },
  qrTitleLarge: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  qrSubtitleSmall: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 30,
    marginBottom: 30,
  },
  qrShareBtnPremium: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  qrShareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  qrShareBtnTextPremium: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ProfileScreen;
