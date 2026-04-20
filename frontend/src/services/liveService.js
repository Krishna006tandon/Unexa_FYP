import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENVIRONMENT from '../config/environment';

const API_URL = ENVIRONMENT.API_URL;

async function getAuthToken() {
  const userInfo = await AsyncStorage.getItem('userInfo');
  const user = userInfo ? JSON.parse(userInfo) : null;
  return user?.token || null;
}

async function authHeaders() {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class LiveService {
  async create(title) {
    const headers = await authHeaders();
    const res = await axios.post(
      `${API_URL}/api/live/create`,
      { title },
      { headers, timeout: 60000 }
    );
    return res.data;
  }

  async start(streamKey) {
    const headers = await authHeaders();
    const res = await axios.post(
      `${API_URL}/api/live/start`,
      { streamKey },
      { headers, timeout: 60000 }
    );
    return res.data;
  }

  async end(streamKey) {
    const headers = await authHeaders();
    const res = await axios.post(
      `${API_URL}/api/live/end`,
      { streamKey },
      { headers, timeout: 60000 }
    );
    return res.data;
  }

  async active() {
    const res = await axios.get(`${API_URL}/api/live/active`, { timeout: 60000 });
    return res.data;
  }

  async getById(id) {
    const headers = await authHeaders();
    const res = await axios.get(`${API_URL}/api/live/${id}`, { headers, timeout: 60000 });
    return res.data;
  }
}

export default new LiveService();

