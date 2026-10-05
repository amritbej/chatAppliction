import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api/authApi";
import { storage } from "../../utils/storage";

// Ensure web browser auth sessions complete properly
WebBrowser.maybeCompleteAuthSession();

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

interface Props {
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function GoogleSignInButton({ onError, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    onError("");

    try {
      const redirectUrl = Linking.createURL("oauth/callback");
      const authUrl = `${API_BASE}/api/auth/google?return_to=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string;
        const error = parsed.queryParams?.error as string;

        if (error) {
          if (error === "google_not_configured") {
            onError("Google sign-in needs OAuth credentials configured on the server.");
          } else {
            onError("Google sign-in could not be completed. Please try again.");
          }
          return;
        }

        if (token) {
          await storage.setItem("chatapp_token", token);
          const user = await authApi.getMe();
          await login({ ...user, token });
          router.replace("/(tabs)/chats");
        }
      }
    } catch (err: any) {
      onError(err.message || "Failed to initiate Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={handleGoogleSignIn}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#0f172a" size="small" />
      ) : (
        <View style={styles.content}>
          <View style={styles.googleIcon}>
            <Text style={styles.iconLetter}>G</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLetter: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
});
