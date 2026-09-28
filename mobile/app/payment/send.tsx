import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { paymentApi } from "../../src/services/api/paymentApi";

export default function SendPaymentScreen() {
  const params = useLocalSearchParams<{
    recipientId: string;
    recipientUsername: string;
    roomId?: string;
  }>();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"input" | "summary" | "processing" | "success" | "failed">("input");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount >= 1;

  const handleReview = () => {
    if (!isValidAmount) {
      setError("Please enter a valid amount (minimum ₹1.00)");
      return;
    }
    setError("");
    setStep("summary");
  };

  const handlePay = async () => {
    if (!params.recipientId) return;
    setLoading(true);
    setError("");
    setStep("processing");

    try {
      // 1. Create Order on Backend
      const orderRes = await paymentApi.createOrder({
        recipientId: params.recipientId,
        roomId: params.roomId,
        amount: numAmount,
        note: note.trim(),
        idempotencyKey: `mobile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      const orderData = orderRes.data;

      // 2. Gateway Verification
      // For mobile test sandbox, completes server verification
      await paymentApi.verifyPayment({
        transactionId: orderData.transactionId,
        providerOrderId: orderData.orderId,
        providerPaymentId: `mob_pay_${Date.now()}`,
        signature: "mock_valid_signature",
        paymentMethod: "upi",
      });

      setStep("success");
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setStep("failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Recipient Header */}
        <View style={styles.recipientCard}>
          <Text style={styles.recipientLabel}>Paying to</Text>
          <Text style={styles.recipientName}>@{params.recipientUsername || "Recipient"}</Text>
        </View>

        {step === "input" && (
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Enter Amount (INR)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748b"
                autoFocus
              />
            </View>

            {/* Quick chips */}
            <View style={styles.chipsRow}>
              {[100, 200, 500, 1000, 2000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.chip}
                  onPress={() => setAmount(amt.toString())}
                >
                  <Text style={styles.chipText}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="What's this for? (e.g. Dinner)"
                placeholderTextColor="#64748b"
                maxLength={80}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtn, !isValidAmount && styles.actionBtnDisabled]}
              onPress={handleReview}
              disabled={!isValidAmount}
            >
              <Text style={styles.actionBtnText}>Review Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "summary" && (
          <View style={styles.card}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recipient</Text>
              <Text style={styles.summaryValue}>@{params.recipientUsername}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>₹{numAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gateway Fee</Text>
              <Text style={[styles.summaryValue, { color: "#34d399" }]}>₹0.00 (Free)</Text>
            </View>
            {note ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Note</Text>
                <Text style={styles.summaryValue}>{note}</Text>
              </View>
            ) : null}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalAmount}>₹{numAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep("input")}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={handlePay}
                disabled={loading}
              >
                <Text style={styles.payBtnText}>Pay ₹{numAmount.toFixed(2)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === "processing" && (
          <View style={[styles.card, styles.centerCard]}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.processingText}>Verifying Transaction...</Text>
            <Text style={styles.processingSubtext}>
              Securely processing with payment server
            </Text>
          </View>
        )}

        {step === "success" && (
          <View style={[styles.card, styles.centerCard]}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Payment Successful</Text>
            <Text style={styles.successSubtitle}>
              ₹{numAmount.toFixed(2)} sent to @{params.recipientUsername}
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "failed" && (
          <View style={[styles.card, styles.centerCard]}>
            <Text style={styles.failedIcon}>✕</Text>
            <Text style={styles.failedTitle}>Payment Failed</Text>
            <Text style={styles.failedSubtitle}>{error || "Transaction could not be completed"}</Text>
            <TouchableOpacity
              style={styles.tryAgainBtn}
              onPress={() => setStep("input")}
            >
              <Text style={styles.tryAgainBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  recipientCard: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
    alignItems: "center",
  },
  recipientLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  recipientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#94a3b8",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "rgba(153, 27, 27, 0.4)",
    borderColor: "#991b1b",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
  },
  actionBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34d399",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  backBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  backBtnText: {
    color: "#f8fafc",
    fontWeight: "bold",
    fontSize: 14,
  },
  payBtn: {
    flex: 2,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  payBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  centerCard: {
    alignItems: "center",
    paddingVertical: 36,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  successIcon: {
    fontSize: 48,
    color: "#34d399",
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  doneBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  failedIcon: {
    fontSize: 48,
    color: "#ef4444",
    marginBottom: 12,
  },
  failedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  failedSubtitle: {
    fontSize: 13,
    color: "#fca5a5",
    marginTop: 4,
    marginBottom: 20,
    textAlign: "center",
  },
  tryAgainBtn: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  tryAgainBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
