import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSocket } from "../../src/context/SocketContext";
import { userApi } from "../../src/services/api/userApi";
import { roomApi } from "../../src/services/api/roomApi";
import { User } from "../../src/types";

export default function PeopleScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { onlineUsers } = useSocket();
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (e) {
      console.warn("Failed to load users", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openDirectChat = async (targetUserId: string) => {
    try {
      const room = await roomApi.getOrCreateDirectRoom(targetUserId);
      router.push(`/chat/${room._id}`);
    } catch (e) {
      console.warn("Failed to open chat", e);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const room = await roomApi.createGroupRoom(
        groupName || "Group chat",
        selectedUserIds
      );
      setGroupMode(false);
      setGroupName("");
      setSelectedUserIds([]);
      router.push(`/chat/${room._id}`);
    } catch (e) {
      console.warn("Failed to create group", e);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.displayName || u.username).toLowerCase().includes(search.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: User }) => {
    const isOnline = onlineUsers.has(item._id);
    const isSelected = selectedUserIds.includes(item._id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() =>
          groupMode ? toggleSelectUser(item._id) : openDirectChat(item._id)
        }
      >
        <View style={styles.avatarWrapper}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {(item.displayName || item.username)[0]?.toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.details}>
          <Text style={styles.name}>{item.displayName || item.username}</Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>

        {groupMode ? (
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() =>
                router.push({
                  pathname: "/payment/send",
                  params: {
                    recipientId: item._id,
                    recipientUsername: item.username,
                  },
                })
              }
            >
              <Text style={styles.payBtnText}>₹ Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or username..."
          placeholderTextColor="#64748b"
        />
        <TouchableOpacity
          style={[styles.groupToggleBtn, groupMode && styles.groupToggleBtnActive]}
          onPress={() => {
            setGroupMode(!groupMode);
            setSelectedUserIds([]);
          }}
        >
          <Text style={styles.groupToggleText}>
            {groupMode ? "Cancel" : "+ Group"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Create Controls */}
      {groupMode && (
        <View style={styles.groupCreatePanel}>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name..."
            placeholderTextColor="#64748b"
          />
          <View style={styles.groupCreateFooter}>
            <Text style={styles.selectedCount}>
              {selectedUserIds.length} selected (max 15)
            </Text>
            <TouchableOpacity
              style={[
                styles.createBtn,
                selectedUserIds.length === 0 && styles.createBtnDisabled,
              ]}
              onPress={handleCreateGroup}
              disabled={selectedUserIds.length === 0}
            >
              <Text style={styles.createBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  headerBar: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#ffffff",
    fontSize: 14,
  },
  groupToggleBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
  },
  groupToggleBtnActive: {
    backgroundColor: "#991b1b",
  },
  groupToggleText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "bold",
  },
  groupCreatePanel: {
    padding: 14,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  groupNameInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 10,
  },
  groupCreateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedCount: {
    color: "#94a3b8",
    fontSize: 12,
  },
  createBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  listContent: {
    padding: 14,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 17,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#020617",
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
  },
  username: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  payBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payBtnText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
