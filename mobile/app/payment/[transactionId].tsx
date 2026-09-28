import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { transactionApi } from "../../src/services/api/transactionApi";
import { paymentApi } from "../../src/services/api/paymentApi";
import { Transaction } from "../../src/types";

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!transactionId) return;
    transactionApi
      .getTransactionDetails(transactionId)
      .then(setTxn)
      .catch((e) => Alert.alert("Error", e.message || "Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [transactionId]);

  const handleRefund = async () => {
    if (!txn) return;
    Alert.alert(
      "Confirm Refund",
      "Are you sure you want to refund this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund",
          style: "destructive",
          onPress: async () => {
            setRefunding(true);
            try {
              const updated = await paymentApi.refundTransaction(
                txn.transactionId,
                "User requested refund"
              );
              setTxn(updated);
              Alert.alert("Success", "Refund processed successfully");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Refund failed");
            } finally {
              setRefunding(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!txn) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Transaction not found</Text>
      </View>
    );
  }

  const isSender =
    txn.sender?._id?.toString() === user?._id?.toString() ||
    txn.sender?.toString() === user?._id?.toString();
  const formattedAmount = (txn.amount / 100).toFixed(2);
  const dateStr = new Date(txn.createdAt).toLocaleString();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Amount Card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Transfer Amount</Text>
        <Text style={styles.amountText}>₹{formattedAmount}</Text>
        <View
          style={[
            styles.statusBadge,
            txn.status === "success"
              ? styles.badgeSuccess
              : txn.status === "refunded"
              ? styles.badgeRefunded
              : styles.badgePending,
          ]}
        >
          <Text style={styles.statusBadgeText}>{txn.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Details Table */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Transaction ID</Text>
          <Text style={styles.valueMono}>{txn.transactionId}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.value}>@{txn.sender?.username || "Sender"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>To</Text>
          <Text style={styles.value}>@{txn.recipient?.username || "Recipient"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.value}>{dateStr}</Text>
        </View>

        {txn.note ? (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Note</Text>
            <Text style={styles.value}>"{txn.note}"</Text>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Text style={styles.label}>Provider</Text>
          <Text style={[styles.value, { textTransform: "capitalize" }]}>
            {txn.provider}
          </Text>
        </View>
      </View>

      {/* Refund Button */}
      {isSender && txn.status === "success" && (
        <TouchableOpacity
          style={styles.refundBtn}
          onPress={handleRefund}
          disabled={refunding}
        >
          {refunding ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.refundBtnText}>Request Refund</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
      >
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 16,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  amountCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountText: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#ffffff",
    marginVertical: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  badgeRefunded: {
    backgroundColor: "rgba(192, 132, 252, 0.2)",
  },
  badgePending: {
    backgroundColor: "rgba(250, 204, 21, 0.2)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#34d399",
  },
  detailsCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  label: {
    fontSize: 13,
    color: "#94a3b8",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f8fafc",
  },
  valueMono: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#cbd5e1",
  },
  refundBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  refundBtnText: {
    color: "#f87171",
    fontSize: 15,
    fontWeight: "bold",
  },
  closeBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 16,
  },
});
