import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('exam_ops_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const sessionId = localStorage.getItem('exam_ops_session_id');
  if (sessionId && !config.url?.startsWith('/sessions') && !config.url?.startsWith('/auth')) {
    if (config.method === 'get') {
      config.params = { ...config.params, session_id: sessionId };
    } else if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = { ...config.data, session_id: sessionId };
    }
  }

  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('exam_ops_token');
      if (!window.location.pathname.startsWith('/lookup') && !window.location.pathname.startsWith('/login'))
        window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
