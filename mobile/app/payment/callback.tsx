import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PaymentCallbackScreen() {
  const params = useLocalSearchParams<{
    status?: string;
    transactionId?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (params.status === "success") {
        router.replace("/(tabs)/payments");
      } else {
        router.back();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [params.status, params.transactionId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.text}>
        {params.status === "success"
          ? "Payment confirmed! Returning to ChatApp..."
          : "Processing payment status..."}
      </Text>
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
    padding: 24,
  },
  text: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
  },
});
