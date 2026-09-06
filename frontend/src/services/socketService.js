import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    const url = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
    socket = io(url, {
      auth: { token }
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('token');
  const baseUrl = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };
  const res = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi server');
  return data;
};
