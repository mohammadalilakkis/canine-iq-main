import React from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

interface AccountPromptModalProps {
  visible: boolean;
  onSignUp: () => void;
  onDismiss: () => void;
}

export default function AccountPromptModal({ visible, onSignUp, onDismiss }: AccountPromptModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Shield size={32} color={Colors.dark.primary} />
          </View>
          
          <Text style={styles.title}>Save your dog&apos;s progress</Text>
          
          <Text style={styles.description}>
            Create a free account to back up your dog&apos;s data. You can sign up anytime from your profile page.
          </Text>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={onSignUp}>
              <Text style={styles.primaryButtonText}>Sign Up Free</Text>
            </Pressable>
            
            <Pressable style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AccountPromptContainer() {
  const { showAccountPrompt, dismissAccountPrompt, openSignUp } = useAuth();

  const handleSignUp = () => {
    openSignUp();
    router.push('/sign-up');
  };

  return (
    <AccountPromptModal
      visible={showAccountPrompt}
      onSignUp={handleSignUp}
      onDismiss={dismissAccountPrompt}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
  },
});
