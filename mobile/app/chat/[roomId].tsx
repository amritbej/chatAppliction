import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useSocket } from "../../src/context/SocketContext";
import { useCall } from "../../src/context/CallContext";
import { messageApi } from "../../src/services/api/messageApi";
import { roomApi } from "../../src/services/api/roomApi";
import { Message, Room } from "../../src/types";

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { startCall } = useCall();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!roomId) return;

    roomApi.getMyRooms().then((rooms) => {
      const current = rooms.find((r) => r._id === roomId);
      if (current) setRoom(current);
    });

    messageApi.getMessages(roomId).then(setMessages);

    socket?.emit("room:join", roomId);

    return () => {
      socket?.emit("room:leave", roomId);
    };
  }, [roomId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = (msg: Message) => {
      if (msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleMessageEdited = (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleMessageReaction = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleTyping = ({ username }: any) => setTypingUser(username);
    const handleStopTyping = () => setTypingUser(null);

    socket.on("message:receive", handleMessageReceive);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("typing:start", handleTyping);
    socket.on("typing:stop", handleStopTyping);

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("typing:start", handleTyping);
      socket.off("typing:stop", handleStopTyping);
    };
  }, [socket, roomId]);

  const otherMember = room?.members?.find((m) => m._id !== user?._id);
  const roomTitle = room?.isGroup ? room.name : otherMember?.displayName || otherMember?.username;
  const isOnline = otherMember ? onlineUsers.has(otherMember._id) : false;

  const sendMessage = () => {
    if (!input.trim() || !roomId) return;

    socket?.emit("message:send", {
      roomId,
      content: input.trim(),
      replyTo: replyTo?._id,
    });

    setInput("");
    setReplyTo(null);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await messageApi.reactToMessage(messageId, emoji);
    } catch (e) {
      console.warn("React failed", e);
    }
  };

  const renderMessageBubble = ({ item }: { item: Message }) => {
    const isOwn = item.sender?._id?.toString() === user?._id?.toString() ||
                  item.sender?.toString() === user?._id?.toString();
    const isPayment = item.type === "payment";

    if (isPayment) {
      const p = item.payment || { amount: 0, status: "success", note: "", transactionId: "" };
      const formattedAmount = (p.amount / 100).toFixed(2);

      return (
        <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleRight : styles.bubbleLeft]}>
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>
                {isOwn ? "Payment Sent" : "Payment Received"}
              </Text>
              <Text style={styles.paymentStatusBadge}>{p.status.toUpperCase()}</Text>
            </View>

            <Text style={styles.paymentAmountText}>₹{formattedAmount}</Text>
            {p.note ? <Text style={styles.paymentNoteText}>"{p.note}"</Text> : null}

            <TouchableOpacity
              style={styles.paymentDetailsBtn}
              onPress={() => router.push(`/payment/${p.transactionId}`)}
            >
              <Text style={styles.paymentDetailsBtnText}>View Transaction Details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleRight : styles.bubbleLeft]}>
        {!isOwn && (
          <Text style={styles.senderName}>{item.sender?.username}</Text>
        )}

        {item.replyTo && (
          <View style={styles.replyBox}>
            <Text style={styles.replySender}>{item.replyTo.sender?.username}</Text>
            <Text style={styles.replyContent} numberOfLines={1}>{item.replyTo.content}</Text>
          </View>
        )}

        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubblePeer]}>
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextPeer]}>
            {item.content}
          </Text>
        </View>

        {/* Reaction badges */}
        {item.reactions && item.reactions.length > 0 && (
          <View style={styles.reactionsRow}>
            {item.reactions.map((r, i) => (
              <View key={i} style={styles.reactionChip}>
                <Text style={styles.reactionText}>{r.emoji}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Custom Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.navDetails}>
          <Text style={styles.navTitle} numberOfLines={1}>{roomTitle}</Text>
          <Text style={styles.navSubtitle}>
            {room?.isGroup ? `${room.members.length} members` : isOnline ? "Online" : "Offline"}
          </Text>
        </View>

        <View style={styles.navActions}>
          {!room?.isGroup && otherMember && (
            <TouchableOpacity
              style={styles.payActionBtn}
              onPress={() =>
                router.push({
                  pathname: "/payment/send",
                  params: {
                    recipientId: otherMember._id,
                    recipientUsername: otherMember.username,
                    roomId,
                  },
                })
              }
            >
              <Text style={styles.payActionText}>₹ Pay</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={() =>
              startCall(
                {
                  roomId: room?.isGroup ? room._id : undefined,
                  userId: !room?.isGroup ? otherMember?._id : undefined,
                  username: roomTitle || "User",
                },
                "audio"
              )
            }
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={() =>
              startCall(
                {
                  roomId: room?.isGroup ? room._id : undefined,
                  userId: !room?.isGroup ? otherMember?._id : undefined,
                  username: roomTitle || "User",
                },
                "video"
              )
            }
          >
            <Text style={styles.callIcon}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessageBubble}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {typingUser && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{typingUser} is typing...</Text>
        </View>
      )}

      {/* Reply Banner */}
      {replyTo && (
        <View style={styles.replyBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerTitle}>
              Replying to @{replyTo.sender?.username}
            </Text>
            <Text style={styles.replyBannerContent} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyBannerClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!room?.isGroup && otherMember && (
          <TouchableOpacity
            style={styles.composerPayBtn}
            onPress={() =>
              router.push({
                pathname: "/payment/send",
                params: {
                  recipientId: otherMember._id,
                  recipientUsername: otherMember.username,
                  roomId,
                },
              })
            }
          >
            <Text style={styles.composerPayText}>₹</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.composerInput}
          value={input}
          onChangeText={setInput}
          placeholder="Message or type @..."
          placeholderTextColor="#64748b"
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  backIcon: {
    fontSize: 20,
    color: "#f8fafc",
  },
  navDetails: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  navSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payActionBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "#10b981",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payActionText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "bold",
  },
  callActionBtn: {
    padding: 6,
  },
  callIcon: {
    fontSize: 18,
  },
  messagesList: {
    padding: 16,
  },
  bubbleWrapper: {
    marginBottom: 10,
    maxWidth: "80%",
  },
  bubbleLeft: {
    alignSelf: "flex-start",
  },
  bubbleRight: {
    alignSelf: "flex-end",
  },
  senderName: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: "#059669",
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: "#ffffff",
  },
  messageTextPeer: {
    color: "#f8fafc",
  },
  paymentCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#10b981",
    minWidth: 220,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 8,
    marginBottom: 10,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#34d399",
  },
  paymentStatusBadge: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentAmountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  paymentNoteText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 4,
  },
  paymentDetailsBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    alignItems: "center",
  },
  paymentDetailsBtnText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "600",
  },
  replyBox: {
    backgroundColor: "#020617",
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  replySender: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#34d399",
  },
  replyContent: {
    fontSize: 11,
    color: "#94a3b8",
  },
  reactionsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 3,
  },
  reactionChip: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reactionText: {
    fontSize: 12,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#64748b",
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  replyBannerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#34d399",
  },
  replyBannerContent: {
    fontSize: 12,
    color: "#94a3b8",
  },
  replyBannerClose: {
    color: "#64748b",
    fontSize: 16,
    padding: 4,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    gap: 8,
  },
  composerPayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  composerPayText: {
    color: "#34d399",
    fontWeight: "bold",
    fontSize: 16,
  },
  composerInput: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#ffffff",
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendIcon: {
    color: "#ffffff",
    fontSize: 14,
  },
});
