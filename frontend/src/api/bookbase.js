/**
 * BookBase REST API Client
 * Strict API Boundary: All state operations communicate directly via /api/v1/ REST endpoints.
 */

const BASE_URL = '/api/v1';
// Each portal keeps its own sign-in, even when several are hosted on one domain
const STORAGE_TOKEN = `bb_token_${import.meta.env.VITE_PORTAL}`;

let onSessionExpired = () => {};

export const getAuthToken = () => localStorage.getItem(STORAGE_TOKEN);
export const setAuthToken = (token) => localStorage.setItem(STORAGE_TOKEN, token);
export const clearAuthToken = () => localStorage.removeItem(STORAGE_TOKEN);

/** Registers what to do when the server stops accepting the stored session token. */
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

async function request(endpoint, { skipAuth = false, ...options } = {}) {
  const token = skipAuth ? null : getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  // Only if the rejected token is still the stored one: a late reply must not end a newer session
  if (response.status === 401 && token && token === getAuthToken()) {
    clearAuthToken();
    onSessionExpired();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (identifier, password, role) =>
    request('/auth/login', {
      skipAuth: true,
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, enrollment_no: identifier, password, role }),
    }),

  register: (registrationData) =>
    request('/auth/register', {
      skipAuth: true,
      method: 'POST',
      body: JSON.stringify(registrationData),
    }),

  getDemoUsers: () => request('/auth/demo-users', { skipAuth: true }),

  getCurrentUser: () => request('/auth/me'),

  // Books & Inventory
  getBooks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
    return request(`/books?${query.toString()}`);
  },

  getBookDetail: (bookId) => request(`/books/${bookId}`),

  createBook: (bookData) =>
    request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    }),

  addCopy: (bookId, copyData) =>
    request(`/books/${bookId}/copies`, {
      method: 'POST',
      body: JSON.stringify(copyData),
    }),

  // Circulation & Waitlist Engine
  checkoutBook: (bookId, copyId = null) =>
    request('/circulation/checkout', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, copy_id: copyId }),
    }),

  joinWaitlist: (bookId) =>
    request('/circulation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId }),
    }),

  cancelWaitlist: (reservationId) =>
    request(`/circulation/waitlist/${reservationId}`, {
      method: 'DELETE',
    }),

  returnBook: (loanId = null, copyId = null) =>
    request('/circulation/return', {
      method: 'POST',
      body: JSON.stringify({ loan_id: loanId, copy_id: copyId }),
    }),

  getLendingPolicy: () => request('/policy'),

  // Dashboards & Admin
  getUserDashboard: (userId) => request(`/users/${userId}/dashboard`),

  getAdminOverview: () => request('/admin/overview'),

  getGroupedBooks: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/admin/grouped-books${query}`);
  },

  settleFine: (userId, amountSettled = null) =>
    request('/admin/settle-fine', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, amount_settled: amountSettled }),
    }),

  // Resetting recreates every account, so the reply carries a new token for this librarian
  resetDemoDb: async () => {
    const resp = await request('/admin/reset-demo', { method: 'POST' });
    if (resp.token) setAuthToken(resp.token);
    return resp;
  },

  // Student Book Procurement Requests
  getBookRequests: () => request('/requests'),

  createBookRequest: (requestData) =>
    request('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  updateBookRequestStatus: (requestId, status) =>
    request(`/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // DBMS Telemetry
  getTelemetryLogs: (limit = 40, operationType = null) => {
    const query = new URLSearchParams({ limit });
    if (operationType && operationType !== 'ALL') {
      query.set('operation_type', operationType);
    }
    return request(`/telemetry/logs?${query.toString()}`);
  },
};
