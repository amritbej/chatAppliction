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
import { authApi } from "../../src/services/api/authApi";
import { useAuth } from "../../src/context/AuthContext";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email: string }>();
  const [email, setEmail] = useState(params.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("Enter the 6-digit OTP code sent to your email address.");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleVerify = async () => {
    if (!email.trim() || !otp.trim()) {
      setError("Email and OTP code are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await authApi.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      await login(user);
      router.replace("/(tabs)/chats");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Please provide your email address to resend OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authApi.resendVerification(email.trim().toLowerCase());
      setInfo("A new verification OTP has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Email Verification</Text>
          <Text style={styles.infoText}>{info}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>6-Digit OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#64748b"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text style={styles.resendText}>Resend OTP Code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "rgba(153, 27, 27, 0.4)",
    borderColor: "#991b1b",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  resendButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  resendText: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "600",
  },
});
