import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import profileService from '../services/profileService';

// Import API_URL from AuthScreen
const API_URL = 'https://unexa-fyp.onrender.com'; // Production backend

const ProfileContext = createContext();

const initialState = {
  profile: null,
  loading: false,
  error: null,
  socket: null,
  onlineUsers: [],
  searchResults: [],
  searching: false,
};

const profileReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload, loading: false, error: null };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, searching: false };
    case 'SET_SEARCHING':
      return { ...state, searching: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

export const ProfileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  // Initialize socket connection
  const initializeSocket = async (userId) => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (token && userId) {
        const socket = io(API_URL, {
          auth: { token }
        });

        socket.on('connect', () => {
          console.log('Profile socket connected');
          socket.emit('joinProfileRoom', userId);
        });

        socket.on('profileUpdated', (data) => {
          dispatch({ type: 'UPDATE_PROFILE', payload: data.profile });
        });

        socket.on('avatarUpdated', (data) => {
          dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: data.avatarUrl } });
        });

        socket.on('coverImageUpdated', (data) => {
          dispatch({ type: 'UPDATE_PROFILE', payload: { coverImage: data.coverImageUrl } });
        });

        socket.on('profileViewed', (data) => {
          console.log('Profile viewed by:', data.viewerId);
        });

        socket.on('profileStatusUpdated', (data) => {
          // Update online users list
          dispatch({ type: 'SET_ONLINE_USERS', payload: data });
        });

        socket.on('searchResults', (data) => {
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: data.profiles });
        });

        socket.on('searchError', (data) => {
          dispatch({ type: 'SET_ERROR', payload: data.message });
        });

        dispatch({ type: 'SET_SOCKET', payload: socket });
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  // Load profile
  const loadProfile = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.getMyProfile();
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      
      // Initialize socket with user ID
      if (response.data.user?._id) {
        await initializeSocket(response.data.user._id);
      }
    } catch (error) {
      // If profile not found (404), create a default profile
      if (error.message === 'Profile not found' || error.status === 404) {
        console.log('📝 Profile not found, creating default profile...');
        try {
          const userInfo = await AsyncStorage.getItem('userInfo');
          const user = userInfo ? JSON.parse(userInfo) : null;
          
          if (user && user._id) {
            // Create minimal profile with user data
            const defaultProfileData = {
              username: user.name?.replace(/\s+/g, '').toLowerCase() || `user${Date.now()}`,
              fullName: user.name || 'User',
              email: user.email || '',
              bio: 'Welcome to my profile!'
            };
            
            const createResponse = await profileService.createOrUpdateProfile(defaultProfileData);
            dispatch({ type: 'SET_PROFILE', payload: createResponse.data });
            
            // Initialize socket with user ID
            if (createResponse.data.user?._id) {
              await initializeSocket(createResponse.data.user._id);
            }
            
            console.log('✅ Default profile created successfully');
          }
        } catch (createError) {
          console.error('❌ Failed to create default profile:', createError);
          dispatch({ type: 'SET_ERROR', payload: createError.message || 'Failed to create profile' });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load profile' });
      }
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.createOrUpdateProfile(profileData);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      
      // Emit real-time update
      if (state.socket) {
        state.socket.emit('profileUpdate', {
          userId: response.data.user?._id,
          updateData: profileData
        });
      }
      
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update profile' });
      throw error;
    }
  };

  // Upload avatar
  const uploadAvatar = async (imageUri) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.uploadAvatar(imageUri);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to upload avatar' });
      throw error;
    }
  };

  // Upload cover image
  const uploadCoverImage = async (imageUri) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.uploadCoverImage(imageUri);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to upload cover image' });
      throw error;
    }
  };

  // Search profiles
  const searchProfiles = async (query, limit = 10, page = 1) => {
    try {
      dispatch({ type: 'SET_SEARCHING', payload: true });
      
      // Use socket for real-time search if available
      if (state.socket) {
        state.socket.emit('searchProfiles', { query, limit, page });
      } else {
        // Fallback to HTTP request
        const response = await profileService.searchProfiles(query, limit, page);
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: response.data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to search profiles' });
    }
  };

  // Toggle profile visibility
  const toggleVisibility = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.toggleVisibility();
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to toggle visibility' });
      throw error;
    }
  };

  // Get profile by identifier
  const getProfileByIdentifier = async (identifier) => {
    try {
      const response = await profileService.getProfileByIdentifier(identifier);
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to get profile' });
      throw error;
    }
  };

  // Delete profile
  const deleteProfile = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await profileService.deleteProfile();
      dispatch({ type: 'RESET_STATE' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to delete profile' });
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Track profile view
  const trackProfileView = (profileId) => {
    if (state.socket) {
      state.socket.emit('viewProfile', {
        profileId,
        viewerId: state.profile?.user?._id
      });
    }
  };

  // Emit typing indicator
  const emitTyping = (isTyping) => {
    if (state.socket) {
      state.socket.emit('typingProfileUpdate', {
        userId: state.profile?.user?._id,
        isTyping
      });
    }
  };

  // Update profile status
  const updateStatus = (status) => {
    if (state.socket) {
      state.socket.emit('profileStatusChange', {
        userId: state.profile?.user?._id,
        status
      });
    }
  };

  const value = {
    ...state,
    loadProfile,
    updateProfile,
    uploadAvatar,
    uploadCoverImage,
    searchProfiles,
    toggleVisibility,
    getProfileByIdentifier,
    deleteProfile,
    clearError,
    trackProfileView,
    emitTyping,
    updateStatus,
  };

  useEffect(() => {
    console.log('🔄 ProfileContext useEffect triggered');
    loadProfile();
  }, []);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export default ProfileContext;
