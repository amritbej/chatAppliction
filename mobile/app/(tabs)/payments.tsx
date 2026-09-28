import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { transactionApi, TransactionsResponse } from "../../src/services/api/transactionApi";
import { Transaction } from "../../src/types";

export default function PaymentsScreen() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchTransactions = async () => {
    try {
      const res = await transactionApi.getTransactions({ type: filter });
      setData(res);
    } catch (e) {
      console.warn("Failed to load transactions", e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isSender =
      item.sender?._id?.toString() === user?._id?.toString() ||
      item.sender?.toString() === user?._id?.toString();
    const formattedAmount = (item.amount / 100).toFixed(2);
    const dateStr = new Date(item.createdAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });

    return (
      <TouchableOpacity
        style={styles.txnCard}
        onPress={() => router.push(`/payment/${item.transactionId}`)}
      >
        <View style={styles.txnLeft}>
          <View
            style={[
              styles.iconCircle,
              isSender ? styles.sentCircle : styles.receivedCircle,
            ]}
          >
            <Text style={styles.txnIcon}>{isSender ? "↑" : "↓"}</Text>
          </View>
          <View>
            <Text style={styles.partyText}>
              {isSender
                ? `To @${item.recipient?.username || "user"}`
                : `From @${item.sender?.username || "user"}`}
            </Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.txnRight}>
          <Text
            style={[
              styles.amountText,
              isSender ? styles.sentAmount : styles.receivedAmount,
            ]}
          >
            {isSender ? `-₹${formattedAmount}` : `+₹${formattedAmount}`}
          </Text>
          <Text
            style={[
              styles.statusChip,
              item.status === "success"
                ? styles.statusSuccess
                : item.status === "refunded"
                ? styles.statusRefunded
                : styles.statusPending,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Received</Text>
          <Text style={styles.summaryReceived}>
            ₹{data?.summary.totalReceivedINR || "0.00"}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Sent</Text>
          <Text style={styles.summarySent}>
            ₹{data?.summary.totalSentINR || "0.00"}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["all", "sent", "received"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <FlatList
        data={data?.transactions || []}
        keyExtractor={(item) => item.transactionId}
        renderItem={renderTransactionItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>₹</Text>
            <Text style={styles.emptyTitle}>No transactions recorded</Text>
            <Text style={styles.emptySubtitle}>
              Payments sent or received in chats will appear here.
            </Text>
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
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  summaryReceived: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34d399",
  },
  summarySent: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0f172a",
  },
  filterChipActive: {
    backgroundColor: "#059669",
  },
  filterText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "bold",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  txnCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  txnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sentCircle: {
    backgroundColor: "#1e293b",
  },
  receivedCircle: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  txnIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  partyText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  txnRight: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  sentAmount: {
    color: "#cbd5e1",
  },
  receivedAmount: {
    color: "#34d399",
  },
  statusChip: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 3,
  },
  statusSuccess: {
    color: "#34d399",
  },
  statusRefunded: {
    color: "#c084fc",
  },
  statusPending: {
    color: "#facc15",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    color: "#64748b",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
});
