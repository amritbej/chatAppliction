import { apiClient } from "./apiClient";
import { Message } from "../../types";

export const messageApi = {
  async getMessages(roomId: string, limit = 50, before?: string): Promise<Message[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append("before", before);
    const res = await apiClient.get(`/messages/${roomId}?${params.toString()}`);
    return res.data;
  },

  async editMessage(messageId: string, content: string): Promise<Message> {
    const res = await apiClient.patch(`/messages/${messageId}`, { content });
    return res.data.data;
  },

  async deleteMessage(messageId: string, mode: "for_me" | "for_everyone" = "for_me"): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`, { data: { mode } });
  },

  async reactToMessage(messageId: string, emoji: string) {
    const res = await apiClient.post(`/messages/${messageId}/react`, { emoji });
    return res.data.data;
  },

  async togglePinMessage(messageId: string) {
    const res = await apiClient.post(`/messages/${messageId}/pin`);
    return res.data;
  },

  async searchMessages(query: string): Promise<Message[]> {
    const res = await apiClient.get(`/messages/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },
};
