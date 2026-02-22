import { StyleSheet, Text, View, ScrollView, Pressable, Image, Modal, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, HelpCircle, FileText, ChevronRight, User, Plus, LogOut, UserCircle, CloudUpload, Check, FileDown } from "lucide-react-native";
import { router, Href } from "expo-router";
import Colors from "@/constants/colors";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { formatWeightWithUnit } from "@/utils/weightUtils";
import React from "react";

export default function ProfileScreen() {
  const { profile, hasProfile } = useDogProfile();
  const { isLoggedIn, logout } = useAuth();
  const { hasUnsyncedChanges, backupAllData, backupStatus } = useSync();
  const [showLogoutMenu, setShowLogoutMenu] = React.useState(false);

  const handleLogin = () => {
    router.push({ pathname: '/auth' } as Href);
  };

  const handleLogout = async () => {
    setShowLogoutMenu(false);
    await logout();
    Alert.alert('Successfully logged out');
  };



  if (!hasProfile || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your dog&apos;s information</Text>
            </View>
          </View>

          <View style={styles.emptyState}>
            <User size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No Profile Yet</Text>
            <Text style={styles.emptyText}>
              Create a dog profile to unlock all features and personalized insights.
            </Text>
            <Pressable 
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: '/edit-profile' } as Href)}
            >
              <Plus size={20} color={Colors.dark.text} />
              <Text style={styles.primaryButtonText}>Create Profile</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/login' } as Href)}>
              <Text style={styles.existingUsersLink}>Existing Users</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const primaryBreed = profile.breedMakeup?.[0];
  const secondaryBreed = profile.breedMakeup?.[1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your dog&apos;s information</Text>
            </View>
            {!isLoggedIn ? (
              <Pressable style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Log In / Sign Up</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.loggedInButton} onPress={() => setShowLogoutMenu(true)}>
                <UserCircle size={20} color={Colors.dark.primary} />
                <Text style={styles.loggedInText}>Logged in</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.dogProfileCard}>
          {profile.profileImageBase64 ? (
            <Image 
              source={{ uri: profile.profileImageBase64.startsWith('data:') ? profile.profileImageBase64 : `data:image/jpeg;base64,${profile.profileImageBase64}` }} 
              style={styles.dogPhoto}
              onError={(error) => {
                console.error('[Profile] Image render error:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('[Profile] Image loaded successfully');
              }}
            />
          ) : (
            <View style={styles.dogAvatar}>
              <Text style={styles.dogAvatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.dogInfo}>
            <Text style={styles.dogName}>{profile.name}</Text>
            {primaryBreed && (
              <Text style={styles.dogDetails}>{primaryBreed.breedName}{secondaryBreed ? ' Mix' : ''}</Text>
            )}
            <Text style={styles.dogDetails}>
              {profile.age} {profile.age === 1 ? 'year' : 'years'} • {profile.sex === 'male' ? 'Male' : 'Female'} • {formatWeightWithUnit(profile.weight, profile.preferredWeightUnit || 'kg')}
            </Text>
          </View>
          <Pressable 
            style={styles.editButton}
            onPress={() => router.push({ pathname: '/edit-profile' } as Href)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{profile.age} {profile.age === 1 ? 'year' : 'years'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>{formatWeightWithUnit(profile.weight, profile.preferredWeightUnit || 'kg')}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sex</Text>
              <Text style={styles.infoValue}>{profile.sex === 'male' ? 'Male' : 'Female'}</Text>
            </View>
          </View>
        </View>

        {profile.breedMakeup && profile.breedMakeup.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Breed Composition</Text>
            
            <View style={styles.breedCompositionCard}>
              {profile.breedMakeup.map((breed, index) => (
                <View key={`${breed.breedName}-${index}`} style={styles.breedCompositionRow}>
                  <Text style={styles.breedCompositionName}>
                    {breed.breedName}{breed.isUnknown ? ' (Uncertain)' : ''}
                  </Text>
                  <Text style={styles.breedCompositionPercentage}>{breed.percentage}%</Text>
                </View>
              ))}
            </View>
            
            <Pressable 
              style={styles.adjustButton} 
              onPress={() => router.push({
                pathname: '/manage-breeds',
                params: { source: 'profile' }
              } as Href)}
            >
              <Settings size={16} color={Colors.dark.primary} />
              <Text style={styles.adjustButtonText}>Adjust Breed Percentages</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {hasUnsyncedChanges && (
            <Pressable 
              style={[
                styles.backupButton,
                backupStatus === 'uploading' && styles.backupButtonDisabled,
                backupStatus === 'success' && styles.backupButtonSuccess,
              ]}
              onPress={backupAllData}
              disabled={backupStatus !== 'idle'}
            >
              {backupStatus === 'uploading' ? (
                <>
                  <ActivityIndicator size="small" color={Colors.dark.text} />
                  <Text style={styles.backupButtonText}>Backing up all data...</Text>
                </>
              ) : backupStatus === 'success' ? (
                <>
                  <Check size={18} color={Colors.dark.success} />
                  <Text style={[styles.backupButtonText, styles.backupButtonTextSuccess]}>All Data Backed Up</Text>
                </>
              ) : (
                <>
                  <CloudUpload size={18} color={Colors.dark.text} />
                  <Text style={styles.backupButtonText}>Back Up My Data</Text>
                </>
              )}
            </Pressable>
          )}
          
          <Pressable style={styles.menuItem} onPress={() => router.push({ pathname: '/generate-report' } as Href)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primary + '20' }]}>
                <FileDown size={18} color={Colors.dark.primary} />
              </View>
              <Text style={styles.menuItemText}>Generate Report</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textTertiary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push({ pathname: '/app-settings' } as Href)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primary + '20' }]}>
                <Settings size={18} color={Colors.dark.primary} />
              </View>
              <Text style={styles.menuItemText}>App Settings</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textTertiary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <Pressable style={styles.menuItem} onPress={() => router.push({ pathname: '/help-faq' } as Href)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.textTertiary + '20' }]}>
                <HelpCircle size={18} color={Colors.dark.textSecondary} />
              </View>
              <Text style={styles.menuItemText}>Help & FAQ</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textTertiary} />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push({ pathname: '/terms-of-use' } as Href)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: Colors.dark.textTertiary + '20' }]}>
                <FileText size={18} color={Colors.dark.textSecondary} />
              </View>
              <Text style={styles.menuItemText}>Terms & Privacy</Text>
            </View>
            <ChevronRight size={20} color={Colors.dark.textTertiary} />
          </Pressable>
        </View>

        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            Canine iQ provides conditioning and wellness awareness. This app does not diagnose, treat, or prevent any medical conditions. Always consult a licensed veterinarian for health concerns.
          </Text>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>

        {isLoggedIn && (
          <View style={styles.logoutSection}>
            <View style={styles.logoutDivider} />
            <Pressable style={styles.logoutButton} onPress={() => setShowLogoutMenu(true)}>
              <LogOut size={18} color={Colors.dark.error} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showLogoutMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutMenu(false)}>
          <View style={styles.logoutModal}>
            <Pressable style={styles.logoutModalButton} onPress={handleLogout}>
              <LogOut size={18} color={Colors.dark.error} />
              <Text style={styles.logoutModalButtonText}>Log Out</Text>
            </Pressable>
            <View style={styles.logoutModalDivider} />
            <Pressable style={styles.logoutModalButton} onPress={() => setShowLogoutMenu(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  dogProfileCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dogAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dogAvatarText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  dogPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  dogInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  dogDetails: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 2,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  breedCompositionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  breedCompositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breedCompositionName: {
    fontSize: 15,
    color: Colors.dark.text,
    fontWeight: '500' as const,
  },
  breedCompositionPercentage: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  disclaimerSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  version: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: 'center' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  headerTextContainer: {
    flex: 1,
  },
  loginButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  loginButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  loggedInButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginLeft: 12,
  },
  loggedInText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  logoutSection: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.error + '15',
    borderWidth: 1,
    borderColor: Colors.dark.error + '30',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  logoutModal: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden' as const,
  },
  logoutModalButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 16,
  },
  logoutModalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.error,
  },
  logoutModalDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
  },
  existingUsersLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginTop: 16,
  },
  backupButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  backupButtonDisabled: {
    backgroundColor: Colors.dark.primary + '80',
  },
  backupButtonSuccess: {
    backgroundColor: Colors.dark.success + '20',
    borderWidth: 1,
    borderColor: Colors.dark.success + '50',
  },
  backupButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  backupButtonTextSuccess: {
    color: Colors.dark.success,
  },
});
