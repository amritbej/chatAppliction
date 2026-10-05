import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { authApi } from "../../src/services/api/authApi";
import { storage } from "../../src/utils/storage";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      if (params.token) {
        try {
          await storage.setItem("chatapp_token", params.token);
          const user = await authApi.getMe();
          await login({ ...user, token: params.token });
          router.replace("/(tabs)/chats");
          return;
        } catch {
          router.replace({ pathname: "/(auth)/login", params: { error: "google_failed" } });
        }
      } else {
        router.replace({ pathname: "/(auth)/login", params: { error: params.error || "google_failed" } });
      }
    };

    handleAuth();
  }, [params.token, params.error]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.text}>Completing Google sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  text: {
    color: "#94a3b8",
    fontSize: 15,
  },
});
