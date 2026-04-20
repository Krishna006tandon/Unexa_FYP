import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENVIRONMENT from '../config/environment';

const API_URL = ENVIRONMENT.API_URL;

async function getAuthToken() {
  const userInfo = await AsyncStorage.getItem('userInfo');
  const user = userInfo ? JSON.parse(userInfo) : null;
  return user?.token || null;
}

async function authHeaders(extra = {}) {
  const token = await getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function toUploadPart(uri, nameFallback, typeFallback) {
  if (uri.startsWith('blob:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return { blob, name: nameFallback, type: blob.type || typeFallback };
  }

  return {
    file: {
      uri,
      name: nameFallback,
      type: typeFallback,
    },
  };
}

class VideoService {
  async upload({ uri, title, description }) {
    const headers = await authHeaders({ 'Content-Type': 'multipart/form-data' });

    const form = new FormData();
    form.append('title', title);
    if (description) form.append('description', description);

    const filename = `video_${Date.now()}.mp4`;
    const type = 'video/mp4';
    const part = await toUploadPart(uri, filename, type);
    if (part.blob) form.append('video', part.blob, filename);
    else form.append('video', part.file);

    const res = await axios.post(`${API_URL}/api/video/upload`, form, {
      headers,
      timeout: 300000,
    });
    return res.data;
  }

  async feed({ page = 1, limit = 10 } = {}) {
    const res = await axios.get(`${API_URL}/api/video/feed`, {
      params: { page, limit },
      timeout: 60000,
    });
    return res.data;
  }

  async search(q) {
    const res = await axios.get(`${API_URL}/api/video/search`, { params: { q }, timeout: 60000 });
    return res.data;
  }

  async getById(id, { incrementView = true } = {}) {
    const res = await axios.get(`${API_URL}/api/video/${id}`, {
      params: { incrementView: incrementView ? 'true' : 'false' },
      timeout: 60000,
    });
    return res.data;
  }

  async like(videoId) {
    const headers = await authHeaders();
    const res = await axios.post(`${API_URL}/api/video/like`, { videoId }, { headers, timeout: 60000 });
    return res.data;
  }

  async comment(videoId, content) {
    const headers = await authHeaders();
    const res = await axios.post(
      `${API_URL}/api/video/comment`,
      { videoId, content },
      { headers, timeout: 60000 }
    );
    return res.data;
  }
}

export default new VideoService();

