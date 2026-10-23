import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NotificationService from '../services/NotificationService';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkContext();
  }, []);

  const syncPushToken = (tokenAuth) => {
    NotificationService.requestPermissions()
      .then((hasPermission) => {
        if (!hasPermission) return null;
        return NotificationService.getPushToken();
      })
      .then((token) => {
        if (token && tokenAuth) {
          return axios.post(`${ENVIRONMENT.API_URL}/api/auth/push-token`, { token }, {
            headers: { Authorization: `Bearer ${tokenAuth}` },
            timeout: 10000,
          });
        }
      })
      .then(() => {
        console.log('✅ [AUTH] Push token registered in background');
      })
      .catch((err) => {
        console.log('Push token background sync notice:', err?.message || err);
      });
  };

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
    loading
  }), [user, loading]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
