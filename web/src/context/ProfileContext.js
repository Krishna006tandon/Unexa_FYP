import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import profileService from '../services/profileService';
import { AuthContext } from './AuthContext';
import ENVIRONMENT from '../config/environment';

const API_URL = ENVIRONMENT.API_URL;

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
  const initializeSocket = useCallback(async (userId) => {
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
          socket.emit('user_connected', userId);
        });

        // Notifications import
        const Notifications = require('expo-notifications');

        socket.on('media-received', async (data) => {
          console.log('📬 NEW MEDIA:', data);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `New ${data.mediaType === 'video' ? 'Video' : 'Image'} Received!`,
              body: `${data.senderName} sent you a view-once media. Open to view it!`,
              sound: true,
              data: { route: 'MediaShareScreen' },
            },
            trigger: null,
          });
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
  }, []);

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.getMyProfile();
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      
      if (response.data.user?._id) {
        await initializeSocket(response.data.user._id);
      }
    } catch (error) {
      if (error.message === 'Profile not found' || error.status === 404) {
        console.log('📝 Profile not found, creating default profile...');
          try {
            const userInfo = await AsyncStorage.getItem('userInfo');
            const user = userInfo ? JSON.parse(userInfo) : null;
            
            if (user && user._id) {
              const baseUsername =
                (user.username && String(user.username).trim()) ||
                (user.name && String(user.name).replace(/\s+/g, '').toLowerCase()) ||
                `user${String(user._id).slice(-6)}`;

              const defaultProfileData = {
                username: baseUsername,
                fullName: user.name || user.username || 'User',
                email: user.email,
                bio: 'Welcome to my profile!'
              };

              const tryCreate = async (payload) => {
                const createResponse = await profileService.createOrUpdateProfile(payload);
                dispatch({ type: 'SET_PROFILE', payload: createResponse.data });

                if (createResponse.data.user?._id) {
                  await initializeSocket(createResponse.data.user._id);
                }
              };

              try {
                await tryCreate(defaultProfileData);
              } catch (createError) {
                console.log('âŒ Auto-profile create failed:', createError);
                const createMessage = createError?.message || createError?.error || createError?.msg;

                if (
                  String(createMessage || '').toLowerCase().includes('username') &&
                  String(createMessage || '').toLowerCase().includes('taken')
                ) {
                  const retryUsername = `${baseUsername}_${String(user._id).slice(-5)}`;
                  await tryCreate({ ...defaultProfileData, username: retryUsername });
                } else {
                  throw createError;
                }
              }
            }
          } catch (createError) {
            dispatch({
              type: 'SET_ERROR',
              payload:
                createError?.message ||
                createError?.error ||
                createError?.msg ||
                'Failed to create profile'
            });
          }
        } else {
          dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load profile' });
        }
      }
  }, [initializeSocket]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.createOrUpdateProfile(profileData);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      
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
  }, [state.socket]);

  const uploadAvatar = useCallback(async (imageUri) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.uploadAvatar(imageUri);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to upload avatar' });
      throw error;
    }
  }, []);

  const uploadCoverImage = useCallback(async (imageUri) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.uploadCoverImage(imageUri);
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to upload cover image' });
      throw error;
    }
  }, []);

  const searchProfiles = useCallback(async (query, limit = 10, page = 1) => {
    try {
      dispatch({ type: 'SET_SEARCHING', payload: true });
      if (state.socket) {
        state.socket.emit('searchProfiles', { query, limit, page });
      } else {
        const response = await profileService.searchProfiles(query, limit, page);
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: response.data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to search profiles' });
    }
  }, [state.socket]);

  const toggleVisibility = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await profileService.toggleVisibility();
      dispatch({ type: 'SET_PROFILE', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to toggle visibility' });
      throw error;
    }
  }, []);

  const getProfileByIdentifier = useCallback(async (identifier) => {
    try {
      const response = await profileService.getProfileByIdentifier(identifier);
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to get profile' });
      throw error;
    }
  }, []);

  const deleteProfile = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await profileService.deleteProfile();
      dispatch({ type: 'RESET_STATE' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to delete profile' });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const trackProfileView = useCallback((profileId) => {
    if (state.socket) {
      state.socket.emit('viewProfile', {
        profileId,
        viewerId: state.profile?.user?._id
      });
    }
  }, [state.socket, state.profile]);

  const emitTyping = useCallback((isTyping) => {
    if (state.socket) {
      state.socket.emit('typingProfileUpdate', {
        userId: state.profile?.user?._id,
        isTyping
      });
    }
  }, [state.socket, state.profile]);

  const updateStatus = useCallback((status) => {
    if (state.socket) {
      state.socket.emit('profileStatusChange', {
        userId: state.profile?.user?._id,
        status
      });
    }
  }, [state.socket, state.profile]);

  const { user: authUser } = useContext(AuthContext);

  const value = useMemo(() => ({
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
  }), [state, loadProfile, updateProfile, uploadAvatar, uploadCoverImage, searchProfiles, toggleVisibility, getProfileByIdentifier, deleteProfile, clearError, trackProfileView, emitTyping, updateStatus]);

  useEffect(() => {
    if (authUser) {
      loadProfile();
    } else if (!state.profile && !state.loading) {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [authUser, loadProfile]);

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
