const TOKEN_KEY = 'organizador_token';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://organizador-eventos-api.onrender.com/api'
    : '/api');

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}
export { ApiError };

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = token || getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.', 0, {});
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 401 && data?.error === 'auth_required' || res.status === 401 && data?.error === 'invalid_token') {
    setToken(null);
  }
  if (!res.ok) {
    throw new ApiError(data?.message || 'Ocurrió un error inesperado.', res.status, data || {});
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};