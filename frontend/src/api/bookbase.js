/**
 * BookBase REST API Client
 * Strict API Boundary: All state operations communicate directly via /api/v1/ REST endpoints.
 */

const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('bb_token');
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
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, enrollment_no: identifier, password, role }),
    }),

  register: (registrationData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    }),

  getDemoUsers: () => request('/auth/demo-users'),

  getCurrentUser: (userId) => request(`/auth/me?user_id=${userId}`),

  // Books & Inventory
  getBooks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
    if (params.userId) query.set('user_id', params.userId);
    return request(`/books?${query.toString()}`);
  },

  getBookDetail: (bookId, userId) => {
    const query = userId ? `?user_id=${userId}` : '';
    return request(`/books/${bookId}${query}`);
  },

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
  checkoutBook: (userId, bookId, copyId = null) =>
    request('/circulation/checkout', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, book_id: bookId, copy_id: copyId }),
    }),

  joinWaitlist: (userId, bookId) =>
    request('/circulation/waitlist', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, book_id: bookId }),
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

  resetDemoDb: () =>
    request('/admin/reset-demo', {
      method: 'POST',
    }),

  // Student Book Procurement Requests
  getBookRequests: (userId = null) => {
    const query = userId ? `?user_id=${userId}` : '';
    return request(`/requests${query}`);
  },

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
