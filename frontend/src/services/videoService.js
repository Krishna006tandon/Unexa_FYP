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
  async upload({ uri, title, description, name, type, kind }) {
    // NOTE: Do not force `Content-Type: multipart/form-data` in React Native.
    // Axios will set the correct boundary automatically; forcing it can break uploads on Android.
    const headers = await authHeaders();

    const form = new FormData();
    form.append('title', title);
    if (description) form.append('description', description);
    if (kind) form.append('kind', kind);

    const filename = name || `video_${Date.now()}.mp4`;
    const contentType = type || 'video/mp4';
    const part = await toUploadPart(uri, filename, contentType);
    if (part.blob) form.append('video', part.blob, filename);
    else form.append('video', part.file);

    const res = await axios.post(`${API_URL}/api/video/upload`, form, {
      headers,
      timeout: 300000,
    });
    return res.data;
  }

  async feed({ page = 1, limit = 10, kind } = {}) {
    const res = await axios.get(`${API_URL}/api/video/feed`, {
      params: { page, limit, ...(kind ? { kind } : {}) },
      timeout: 60000,
    });
    return res.data;
  }

  async search(q, { kind } = {}) {
    const res = await axios.get(`${API_URL}/api/video/search`, { params: { q, ...(kind ? { kind } : {}) }, timeout: 60000 });
    return res.data;
  }

  async getById(id, { incrementView = true } = {}) {
    const res = await axios.get(`${API_URL}/api/video/${id}`, {
      params: { incrementView: incrementView ? 'true' : 'false' },
      timeout: 60000,
    });
    return res.data;
  }

  async related(id, { limit = 10, kind } = {}) {
    const res = await axios.get(`${API_URL}/api/video/related/${id}`, {
      params: { limit, ...(kind ? { kind } : {}) },
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
