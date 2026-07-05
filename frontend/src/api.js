import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('exam_ops_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('exam_ops_token');
      if (!window.location.pathname.startsWith('/lookup'))
        window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
