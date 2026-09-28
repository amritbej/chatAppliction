import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useSocket } from "../../src/context/SocketContext";
import { roomApi } from "../../src/services/api/roomApi";
import { Room } from "../../src/types";

export default function ChatsScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const router = useRouter();

  const fetchRooms = async () => {
    try {
      const data = await roomApi.getMyRooms();
      setRooms(data);
    } catch (e) {
      console.warn("Failed to load rooms", e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = (message: any) => {
      setRooms((prev) =>
        prev
          .map((r) => (r._id === message.room ? { ...r, lastMessage: message } : r))
          .sort((a, b) => {
            const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
            const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
            return bTime - aTime;
          })
      );
    };

    socket.on("message:receive", handleMessageReceive);
    return () => {
      socket.off("message:receive", handleMessageReceive);
    };
  }, [socket]);

  const getOtherMember = (room: Room) =>
    room.members.find((m) => m._id !== user?._id);

  const getRoomTitle = (room: Room) => {
    if (room.isGroup) return room.name || "Group chat";
    return getOtherMember(room)?.displayName || getOtherMember(room)?.username || "User";
  };

  const getLastMessageText = (room: Room) => {
    const msg = room.lastMessage;
    if (!msg) return "No messages yet";
    if (msg.type === "payment") {
      const amt = msg.payment?.amount ? `₹${(msg.payment.amount / 100).toFixed(2)}` : "Payment";
      return `💰 ${amt}`;
    }
    if (msg.type === "image") return "📷 Image";
    if (msg.type === "file") return `📎 ${msg.fileName || "File"}`;
    return msg.content;
  };

  const filteredRooms = rooms.filter((r) =>
    getRoomTitle(r).toLowerCase().includes(search.toLowerCase())
  );

  const renderRoomItem = ({ item }: { item: Room }) => {
    const other = getOtherMember(item);
    const isOnline = other ? onlineUsers.has(other._id) : false;
    const title = getRoomTitle(item);
    const lastMsgText = getLastMessageText(item);
    const timeStr = item.lastMessage?.createdAt
      ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => router.push(`/chat/${item._id}`)}
      >
        <View style={styles.avatarWrapper}>
          {other?.avatar ? (
            <Image source={{ uri: other.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{title[0]?.toUpperCase() || "U"}</Text>
            </View>
          )}
          {!item.isGroup && isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.roomDetails}>
          <View style={styles.topRow}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMsgText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor="#64748b"
        />
      </View>

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoomItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Head over to the People tab to start chatting or send payments!
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push("/(tabs)/people")}
            >
              <Text style={styles.startBtnText}>Find People</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  searchInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
  },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#020617",
  },
  roomDetails: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 13,
    color: "#94a3b8",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  startBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  startBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
