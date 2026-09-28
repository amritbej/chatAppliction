import { apiClient } from "./apiClient";
import { User } from "../../types";

export const userApi = {
  async getUsers(): Promise<User[]> {
    const res = await apiClient.get("/users");
    return res.data;
  },

  async searchUsers(query: string): Promise<User[]> {
    const res = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const res = await apiClient.patch("/users/me", updates);
    return res.data;
  },
};
