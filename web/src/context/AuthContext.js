import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkContext();
  }, []);

  const checkContext = async () => {
    try {
      const data = await AsyncStorage.getItem('userInfo');
      if (data) setUser(JSON.parse(data));
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
