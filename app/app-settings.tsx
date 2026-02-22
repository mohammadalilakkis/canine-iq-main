import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  TextInput,
  Alert,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { Stack, router, Href } from "expo-router";
import { Bell, Shield, MessageSquare, Bug, Info, Mail, Lock, ChevronDown, ChevronUp, Send, Trash2, FileText, AlertTriangle } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

export default function AppSettingsScreen() {
  const { isLoggedIn, userEmail, deleteAccount } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [oldEmail, setOldEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const deleteModalOpacity = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showDeleteModal) {
      Animated.timing(deleteModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showDeleteModal, deleteModalOpacity]);

  useEffect(() => {
    if (deleteToast) {
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => setDeleteToast(null));
    }
  }, [deleteToast, toastOpacity]);

  const handleUpdateEmail = () => {
    if (!oldEmail.trim() || !newEmail.trim() || !confirmNewEmail.trim()) {
      Alert.alert("Missing Fields", "Please fill in all email fields.");
      return;
    }
    if (newEmail !== confirmNewEmail) {
      Alert.alert("Mismatch", "New email and confirmation do not match.");
      return;
    }
    Alert.alert("Email Updated", "Your email update request has been submitted.");
    setOldEmail("");
    setNewEmail("");
    setConfirmNewEmail("");
    setShowEmailForm(false);
  };

  const handleChangePassword = () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert("Missing Fields", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Too Short", "Password must be at least 6 characters.");
      return;
    }
    Alert.alert("Password Changed", "Your password has been updated.");
    setOldPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPasswordForm(false);
  };

  const handleCloseDeleteModal = () => {
    Animated.timing(deleteModalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowDeleteModal(false));
  };

  const handleGenerateReport = () => {
    handleCloseDeleteModal();
    setTimeout(() => {
      router.push({ pathname: "/generate-report" } as Href);
    }, 200);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleting(false);
      handleCloseDeleteModal();
      setDeleteToast("Your account has been deleted.");
      setTimeout(() => {
        router.replace({ pathname: "/" } as Href);
      }, 500);
    } catch (error) {
      setIsDeleting(false);
      console.error('[AppSettings] Delete account error:', error);
      Alert.alert(
        "Deletion Failed",
        "Something went wrong while deleting your account. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleReportBug = () => {
    Alert.alert(
      "Report a Bug",
      "Thank you for helping us improve Canine iQ. Please email us at support@canineiq.app with details about the issue you encountered.",
      [{ text: "OK" }]
    );
  };

  const handleSendFeedback = () => {
    Alert.alert(
      "Send Feedback",
      "We appreciate your thoughts! Please email us at feedback@canineiq.app with your suggestions.",
      [{ text: "OK" }]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "App Settings" }} />
      <KeyboardAwareScreen
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Bell size={18} color={Colors.dark.primary} />
                <Text style={styles.sectionTitle}>Notifications</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Enable Notifications</Text>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: Colors.dark.border, true: Colors.dark.primary + "80" }}
                    thumbColor={notificationsEnabled ? Colors.dark.primary : Colors.dark.textTertiary}
                  />
                </View>
                <Text style={styles.toggleHelper}>
                  {notificationsEnabled
                    ? "You will receive reminders and updates."
                    : "Notifications are turned off."}
                </Text>
              </View>
            </View>

            {isLoggedIn && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Shield size={18} color={Colors.dark.primary} />
                  <Text style={styles.sectionTitle}>Account Security</Text>
                </View>

                {userEmail && (
                  <Text style={styles.currentEmailText}>
                    Signed in as {userEmail}
                  </Text>
                )}

                <Pressable
                  style={styles.card}
                  onPress={() => setShowEmailForm(!showEmailForm)}
                >
                  <View style={styles.expandableHeader}>
                    <View style={styles.expandableLeft}>
                      <Mail size={16} color={Colors.dark.textSecondary} />
                      <Text style={styles.expandableTitle}>Update Email</Text>
                    </View>
                    {showEmailForm ? (
                      <ChevronUp size={18} color={Colors.dark.textTertiary} />
                    ) : (
                      <ChevronDown size={18} color={Colors.dark.textTertiary} />
                    )}
                  </View>
                </Pressable>

                {showEmailForm && (
                  <View style={styles.formCard}>
                    <TextInput
                      style={styles.input}
                      placeholder="Current email"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={oldEmail}
                      onChangeText={setOldEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="New email"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new email"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={confirmNewEmail}
                      onChangeText={setConfirmNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Pressable style={styles.submitButton} onPress={handleUpdateEmail}>
                      <Text style={styles.submitButtonText}>Update Email</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  style={styles.card}
                  onPress={() => setShowPasswordForm(!showPasswordForm)}
                >
                  <View style={styles.expandableHeader}>
                    <View style={styles.expandableLeft}>
                      <Lock size={16} color={Colors.dark.textSecondary} />
                      <Text style={styles.expandableTitle}>Change Password</Text>
                    </View>
                    {showPasswordForm ? (
                      <ChevronUp size={18} color={Colors.dark.textTertiary} />
                    ) : (
                      <ChevronDown size={18} color={Colors.dark.textTertiary} />
                    )}
                  </View>
                </Pressable>

                {showPasswordForm && (
                  <View style={styles.formCard}>
                    <TextInput
                      style={styles.input}
                      placeholder="Current password"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      secureTextEntry
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="New password"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor={Colors.dark.textTertiary}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry
                    />
                    <Pressable style={styles.submitButton} onPress={handleChangePassword}>
                      <Text style={styles.submitButtonText}>Change Password</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  style={styles.deleteAccountButton}
                  onPress={() => setShowDeleteModal(true)}
                  testID="delete-account-button"
                >
                  <Trash2 size={16} color={Colors.dark.error} />
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MessageSquare size={18} color={Colors.dark.primary} />
                <Text style={styles.sectionTitle}>Feedback</Text>
              </View>

              <Pressable style={styles.card} onPress={handleReportBug}>
                <View style={styles.expandableHeader}>
                  <View style={styles.expandableLeft}>
                    <Bug size={16} color={Colors.dark.warning} />
                    <Text style={styles.expandableTitle}>Report a Bug</Text>
                  </View>
                </View>
              </Pressable>

              <Pressable style={styles.card} onPress={handleSendFeedback}>
                <View style={styles.expandableHeader}>
                  <View style={styles.expandableLeft}>
                    <Send size={16} color={Colors.dark.primary} />
                    <Text style={styles.expandableTitle}>Send Feedback</Text>
                  </View>
                </View>
              </Pressable>
              <Text style={styles.feedbackHelper}>
                We read every message and use feedback to improve the app.
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.sectionTitle}>About</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.aboutAppName}>Canine iQ</Text>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Version</Text>
                  <Text style={styles.aboutValue}>1.0.0</Text>
                </View>
                <View style={styles.aboutDivider} />
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>Build</Text>
                  <Text style={styles.aboutValue}>1</Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomSpacer} />
      </KeyboardAwareScreen>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseDeleteModal}
        statusBarTranslucent
      >
        <Animated.View style={[styles.modalOverlay, { opacity: deleteModalOpacity }]}>
          <Pressable style={styles.modalOverlayTouch} onPress={handleCloseDeleteModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconCircle}>
                <AlertTriangle size={24} color={Colors.dark.error} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              Are you sure? This action cannot be undone.
            </Text>
            <Text style={styles.modalMessage}>
              If you would like a copy of your data, please generate and download your report before deleting your account.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalReportButton}
                onPress={handleGenerateReport}
                disabled={isDeleting}
              >
                <FileText size={16} color={Colors.dark.primary} />
                <Text style={styles.modalReportButtonText}>Generate Report</Text>
              </Pressable>

              <Pressable
                style={[styles.modalDeleteButton, isDeleting && styles.modalDeleteButtonDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Yes, delete my account</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.modalCancelButton}
                onPress={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {deleteToast && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastText}>{deleteToast}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 60,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  toggleHelper: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 8,
  },
  currentEmailText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  expandableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandableLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expandableTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  formCard: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  feedbackHelper: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    paddingHorizontal: 4,
    marginTop: 2,
    lineHeight: 17,
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 14,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  aboutLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 4,
  },
  bottomSpacer: {
    height: 20,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.dark.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalOverlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.error + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  modalActions: {
    marginTop: 20,
    gap: 10,
  },
  modalReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    backgroundColor: "transparent",
  },
  modalReportButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.primary,
  },
  modalDeleteButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.error,
  },
  modalDeleteButtonDisabled: {
    opacity: 0.6,
  },
  modalDeleteButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  modalCancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.dark.textSecondary,
  },
  toastContainer: {
    position: "absolute",
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.dark.text,
  },
});
