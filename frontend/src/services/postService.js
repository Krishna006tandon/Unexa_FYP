import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENVIRONMENT from '../config/environment';
import { Platform } from 'react-native';

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

class PostService {
  async create({ caption, imageUri, imageName, imageType }) {
    const headers = await authHeaders();
    const form = new FormData();
    if (caption) form.append('caption', caption);

    if (imageUri) {
      const filename = imageName || `post_${Date.now()}.jpg`;
      const contentType = imageType || 'image/jpeg';
      const part = await toUploadPart(imageUri, filename, contentType);
      if (part.blob) form.append('image', part.blob, filename);
      else form.append('image', part.file);
    }

    if (Platform.OS !== 'web') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      const resp = await fetch(`${API_URL}/api/posts/create`, {
        method: 'POST',
        headers: {
          ...(headers || {}),
          // do not set Content-Type for multipart
        },
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await resp.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (_) {}
      if (!resp.ok) {
        const err = new Error(json?.error || json?.message || `HTTP ${resp.status}`);
        err.response = { status: resp.status, data: json };
        throw err;
      }
      return json;
    }

    const res = await axios.post(`${API_URL}/api/posts/create`, form, { headers, timeout: 120000 });
    return res.data;
  }

  async feed({ page = 1, limit = 10 } = {}) {
    const res = await axios.get(`${API_URL}/api/posts/feed`, { params: { page, limit }, timeout: 60000 });
    return res.data;
  }

  async getById(id) {
    const res = await axios.get(`${API_URL}/api/posts/${id}`, { timeout: 60000 });
    return res.data;
  }

  async like(postId) {
    const headers = await authHeaders();
    const res = await axios.post(`${API_URL}/api/posts/like`, { postId }, { headers, timeout: 60000 });
    return res.data;
  }

  async comment(postId, content) {
    const headers = await authHeaders();
    const res = await axios.post(`${API_URL}/api/posts/comment`, { postId, content }, { headers, timeout: 60000 });
    return res.data;
  }

  async update(id, { caption, imageUri, imageName, imageType } = {}) {
    const headers = await authHeaders();
    const form = new FormData();
    if (caption != null) form.append('caption', caption);

    if (imageUri) {
      const filename = imageName || `post_${Date.now()}.jpg`;
      const contentType = imageType || 'image/jpeg';
      const part = await toUploadPart(imageUri, filename, contentType);
      if (part.blob) form.append('image', part.blob, filename);
      else form.append('image', part.file);
    }

    if (Platform.OS !== 'web') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      const resp = await fetch(`${API_URL}/api/posts/${id}`, {
        method: 'PUT',
        headers: { ...(headers || {}) },
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await resp.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (_) {}
      if (!resp.ok) {
        const err = new Error(json?.error || json?.message || `HTTP ${resp.status}`);
        err.response = { status: resp.status, data: json };
        throw err;
      }
      return json;
    }

    const res = await axios.put(`${API_URL}/api/posts/${id}`, form, { headers, timeout: 120000 });
    return res.data;
  }

  async delete(id) {
    const headers = await authHeaders();
    const res = await axios.delete(`${API_URL}/api/posts/${id}`, { headers, timeout: 60000 });
    return res.data;
  }
}

export default new PostService();
