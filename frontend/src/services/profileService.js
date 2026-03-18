import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import API_URL from AuthScreen
const API_URL = 'http://192.168.29.104:5000'; //wifi4g

class ProfileService {
  // Get current user's profile
  async getMyProfile() {
    try {
      console.log('🔍 Fetching profile from service...');
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      console.log('📱 User info found:', !!user);
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('No authentication token found');
      }
      
      console.log('🌐 Making API call to:', `${API_URL}/api/profile/me`);
      
      const response = await axios.get(`${API_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 Profile API response status:', response.status);
      console.log('📊 Profile API response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Profile service error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      throw error.response?.data || error;
    }
  }

  // Get profile by username or ID
  async getProfileByIdentifier(identifier) {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/profile/${identifier}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Create or update profile
  async createOrUpdateProfile(profileData) {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${API_URL}/api/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Upload avatar
  async uploadAvatar(imageUri) {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `avatar_${Date.now()}.jpg`,
      });

      const response = await axios.post(`${API_URL}/api/profile/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Upload cover image
  async uploadCoverImage(imageUri) {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      
      formData.append('coverImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `cover_${Date.now()}.jpg`,
      });

      const response = await axios.post(`${API_URL}/api/profile/cover`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Search profiles
  async searchProfiles(query, limit = 10, page = 1) {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/api/profile/search`, {
        params: { q: query, limit, page },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Delete profile
  async deleteProfile() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Toggle profile visibility
  async toggleVisibility() {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const user = userInfo ? JSON.parse(userInfo) : null;
      const token = user ? user.token : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.patch(`${API_URL}/api/profile/visibility`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new ProfileService();
