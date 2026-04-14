const API_ERROR_FALLBACK = 'Ocurrio un error inesperado.';

export async function apiRequest(path, options = {}, token = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof data === 'string' ? data : data.error || data.message || API_ERROR_FALLBACK;
    throw new Error(errorMessage);
  }

  return data;
}

export const authApi = {
  login: (payload) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  register: (payload) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getCurrentUser: (token) => apiRequest('/private', {}, token)
};

export const dashboardApi = {
  getSummary: (token) => apiRequest('/api/dashboard/me', {}, token),
  getRelationships: (token) => apiRequest('/api/dashboard/relationships', {}, token),
  getOptimizedPayments: (token, groupId = '') =>
    apiRequest(`/api/balances/optimize${groupId ? `?group_id=${encodeURIComponent(groupId)}` : ''}`, {}, token)
};

export const groupsApi = {
  getMine: (token, search = '') =>
    apiRequest(`/api/groups/me${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token),
  getPublic: (token, search = '') =>
    apiRequest(`/api/groups/public${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token),
  getInvitations: (token) => apiRequest('/api/groups/invitations/me', {}, token),
  getDetails: (token, groupId) => apiRequest(`/api/groups/${groupId}`, {}, token),
  getMessages: (token, groupId) => apiRequest(`/api/groups/${groupId}/messages`, {}, token),
  create: (token, payload) =>
    apiRequest(
      '/api/groups',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      token
    ),
  join: (token, groupId) =>
    apiRequest(`/api/groups/${groupId}/join`, { method: 'POST' }, token),
  respondInvitation: (token, invitationId, action) =>
    apiRequest(
      `/api/groups/invitations/${invitationId}/respond`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action })
      },
      token
    ),
  sendMessage: (token, groupId, message) =>
    apiRequest(
      `/api/groups/${groupId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message })
      },
      token
    )
};

export const socialApi = {
  getUsers: (token, search = '') =>
    apiRequest(`/api/social/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token),
  getFriends: (token) => apiRequest('/api/social/friends', {}, token),
  getRequests: (token) => apiRequest('/api/social/friend-requests', {}, token),
  sendRequest: (token, receiverId) =>
    apiRequest(
      '/api/social/friend-requests',
      {
        method: 'POST',
        body: JSON.stringify({ receiver_id: receiverId })
      },
      token
    ),
  cancelRequest: (token, requestId) =>
    apiRequest(
      `/api/social/friend-requests/${requestId}`,
      {
        method: 'DELETE'
      },
      token
    ),
  respondRequest: (token, requestId, action) =>
    apiRequest(
      `/api/social/friend-requests/${requestId}/respond`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action })
      },
      token
    ),
  removeFriend: (token, friendId) =>
    apiRequest(
      `/api/social/friends/${friendId}`,
      {
        method: 'DELETE'
      },
      token
    )
};
