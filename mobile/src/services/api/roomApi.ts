import { apiClient } from "./apiClient";
import { Room } from "../../types";

export const roomApi = {
  async getMyRooms(): Promise<Room[]> {
    const res = await apiClient.get("/rooms");
    return res.data;
  },

  async getOrCreateDirectRoom(userId: string): Promise<Room> {
    const res = await apiClient.post("/rooms", { userId });
    return res.data;
  },

  async createGroupRoom(name: string, userIds: string[]): Promise<Room> {
    const res = await apiClient.post("/rooms", { name, userIds });
    return res.data;
  },
};
