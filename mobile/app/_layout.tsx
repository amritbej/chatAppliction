import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/context/AuthContext";
import { SocketProvider } from "../src/context/SocketContext";
import { CallProvider } from "../src/context/CallContext";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#0f172a" },
                headerTintColor: "#f8fafc",
                headerTitleStyle: { fontWeight: "bold" },
                contentStyle: { backgroundColor: "#020617" },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[roomId]"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="payment/send"
                options={{
                  presentation: "modal",
                  headerTitle: "Send Payment",
                }}
              />
              <Stack.Screen
                name="payment/[transactionId]"
                options={{
                  presentation: "modal",
                  headerTitle: "Transaction Details",
                }}
              />
            </Stack>
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
