import { fetchAPI } from './apiBase';

export const authService = {
  login: (credentials: any) => fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  register: (data: any) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getProfile: (id: string) => fetchAPI(`/users/${id}`),
  updateProfile: (id: string, data: any) => fetchAPI(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  me: () => fetchAPI('/auth/me'),
};
