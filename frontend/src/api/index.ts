import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL+'/api';
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth');
  if (auth) {
    const { token } = JSON.parse(auth);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const login = (email: string, password: string) =>
  api.post('/users/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post('/users/register', { name, email, password });

export const getEvents = (params?: {
  category?: string;
  date?: string;
  page?: number;
  limit?: number;
}) => api.get('/events', { params });

export const searchEvents = (params: { search?: string; location?: string }) =>
  api.get('/events/search', { params });

export const getEvent = (id: string) => api.get(`/events/${id}`);

export const createEvent = (eventData: FormData) =>
  api.post('/events', eventData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const updateEvent = (id: string, eventData: FormData) =>
  api.put(`/events/${id}`, eventData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteEvent = (id: string) => api.delete(`/events/${id}`);

export const joinEvent = (id: string) => api.post(`/events/${id}/join`);

export const leaveEvent = (id: string) => api.post(`/events/${id}/leave`);