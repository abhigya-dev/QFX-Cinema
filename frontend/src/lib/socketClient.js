import { API_BASE_URL } from './api';

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socketInstance = null;

export const getSocket = () => {
  if (typeof window === 'undefined') return null;
  if (!window.io) return null;

  if (!socketInstance) {
    socketInstance = window.io(SOCKET_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socketInstance;
};

export const closeSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
};

