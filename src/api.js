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
    console.error(`[API] ${method} ${path} no pudo conectarse al servidor.`);
    throw new ApiError('No se pudo cargar la información. Inténtalo de nuevo.', 0, {});
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && data?.error === 'auth_required' || res.status === 401 && data?.error === 'invalid_token') {
    setToken(null);
  }
  if (!res.ok) {
    const safeMessage = res.status >= 500
      ? 'No se pudo cargar la información. Inténtalo de nuevo.'
      : typeof data?.message === 'string' && !/<\s*(!doctype|html|head|body|script)\b/i.test(data.message)
        ? data.message
        : 'Ocurrió un error inesperado.';
    console.error(`[API] ${method} ${path} respondió ${res.status}.`, {
      contentType,
      errorCode: typeof data?.error === 'string' ? data.error : undefined,
    });
    throw new ApiError(safeMessage, res.status, data || {});
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
