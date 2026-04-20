import axios from 'axios';

const defaultApiUrl = '/api';
const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const baseURL = (envApiUrl || defaultApiUrl).replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  timeout: 60000, // Increase timeout to 60 seconds for AI features
});

console.log('API Base URL:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
