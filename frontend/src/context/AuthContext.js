import React, { createContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NotificationService from '../services/NotificationService';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isSyncingToken = useRef(false);

  const syncPushToken = async (tokenAuth, retryCount = 0) => {
    if (!tokenAuth || isSyncingToken.current) return;
    isSyncingToken.current = true;

    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        console.log('⚠️ [AUTH] Notification permission not granted yet');
        isSyncingToken.current = false;
        return null;
      }

      const pushToken = await NotificationService.getPushToken();
      if (pushToken) {
        await axios.post(
          `${ENVIRONMENT.API_URL}/api/auth/push-token`,
          { token: pushToken },
          {
            headers: { Authorization: `Bearer ${tokenAuth}` },
            timeout: 10000,
          }
        );
        console.log('✅ [AUTH] Push token registered with backend successfully');
      } else if (retryCount < 2) {
        // Retry once after 3 seconds if token was temporarily unavailable
        setTimeout(() => {
          isSyncingToken.current = false;
          syncPushToken(tokenAuth, retryCount + 1);
        }, 3000);
        return;
      }
    } catch (err) {
      console.log('Push token background sync notice:', err?.response?.data?.error || err?.message || err);
      if (retryCount < 1) {
        setTimeout(() => {
          isSyncingToken.current = false;
          syncPushToken(tokenAuth, retryCount + 1);
        }, 3000);
        return;
      }
    } finally {
      isSyncingToken.current = false;
    }
  };

  useEffect(() => {
    checkContext();
  }, []);

  // ⚡ Keep push token active and sync whenever app comes to foreground or user returns
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user?.token) {
        syncPushToken(user.token);
      }
    });

    return () => subscription.remove();
  }, [user]);

  const checkContext = async () => {
    try {
      const data = await AsyncStorage.getItem('userInfo');
      if (data) {
        const userData = JSON.parse(data);
        setUser(userData);
        setLoading(false); // ⚡ Instant startup: Unblock UI without waiting for network
        
        // ⚡ Run push token update in the background
        syncPushToken(userData.token);
        return;
      }
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  };

  const login = async (userData) => {
    try {
      console.log('🔐 Login attempt:', userData.email);
      await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
      setUser(userData);
      
      // ⚡ Register Push Token in background
      syncPushToken(userData.token);

      console.log('✅ Login successful, user data stored:', userData.username);
    } catch (error) {
      console.error('❌ Login error in AuthContext:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userInfo');
    setUser(null);
  };

  const authContextValue = React.useMemo(() => ({
    user,
    login,
    logout,
    loading,
    syncPushToken
  }), [user, loading]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
