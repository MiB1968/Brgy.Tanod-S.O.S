import * as api from "../lib/api";

export const dbService = {
  list: async (endpoint: string, params?: Record<string, string>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params).toString()}` 
      : '';
    return await api.generic.list(`${endpoint}${queryString}`);
  },
  create: async (endpoint: string, data: any) => {
    return await api.generic.create(endpoint, data);
  },
  update: async (endpoint: string, id: string, data: any) => {
    return await api.generic.update(`${endpoint}/${id}`, data);
  },
  delete: async (endpoint: string, id: string) => {
    return await api.generic.delete(`${endpoint}/${id}`);
  }
};
