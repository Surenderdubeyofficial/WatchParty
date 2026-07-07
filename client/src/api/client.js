import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin),
  withCredentials: true
});
