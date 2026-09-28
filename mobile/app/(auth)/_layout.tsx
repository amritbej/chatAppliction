import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f8fafc",
        headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: "#020617" },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerTitle: "Verify Email" }} />
      <Stack.Screen name="forgot-password" options={{ headerTitle: "Reset Password" }} />
    </Stack>
  );
}
