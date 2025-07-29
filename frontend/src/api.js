import axios from 'axios';


function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use((config) => {
  const token = getCookie('csrftoken');
  if (token) config.headers['X-CSRFToken'] = token;
  return config;
});

export const getIndoorNavigationPath = (startRoomId, endRoomId) => {
  return api.get(`/indoor-navigation/?start_room_id=${startRoomId}&end_room_id=${endRoomId}`);
};


/* export const api = axios.create({
  baseURL: 'http://localhost:8000/api',  // or your backend origin
  withCredentials: true, // crucial for sending cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
}); */

export { api };