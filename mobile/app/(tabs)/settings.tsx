import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { userApi } from "../../src/services/api/userApi";

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await userApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      updateUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.sectionCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.username || "U")[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.username}
            </Text>
            <Text style={styles.profileHandle}>@{user?.username}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#64748b"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.input}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor="#64748b"
            maxLength={160}
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : saveSuccess ? "✓ Profile Saved" : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preferences Section */}
      <Text style={styles.sectionTitle}>Preferences & Privacy</Text>
      <View style={styles.sectionCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchMeta}>
            <Text style={styles.switchLabel}>Read Receipts</Text>
            <Text style={styles.switchDesc}>Show checkmarks when messages are seen</Text>
          </View>
          <Switch
            value={readReceipts}
            onValueChange={setReadReceipts}
            trackColor={{ false: "#334155", true: "#059669" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.switchRow}>
          <View style={styles.switchMeta}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Text style={styles.switchDesc}>Alerts for messages and payments</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: "#334155", true: "#059669" }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Security & Danger Zone */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out of ChatApp</Text>
        </TouchableOpacity>
      </View>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 22,
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  profileHandle: {
    fontSize: 13,
    color: "#34d399",
    marginTop: 1,
  },
  profileEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  switchMeta: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
  },
  switchDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: 12,
  },
  actionRow: {
    paddingVertical: 4,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "bold",
  },
});
