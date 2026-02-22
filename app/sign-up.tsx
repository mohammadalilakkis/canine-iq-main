import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Shield, Mail, Lock, Eye, EyeOff, Apple } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useDogProfile } from '@/contexts/DogProfileContext';

export default function SignUpScreen() {
  const { signUp, dismissAccountPrompt, triggerDataRefresh } = useAuth();
  const { getLocalProfile } = useDogProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSocialSignUp = async (provider: 'apple' | 'google') => {
    Alert.alert(
      'Coming Soon',
      `${provider === 'apple' ? 'Apple' : 'Google'} sign-up will be available soon.`
    );
  };

  const handleSignUp = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Missing Password', 'Please enter a password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { user } = await signUp(email.trim(), password);
      dismissAccountPrompt();
      
      if (user && !user.confirmed_at) {
        console.log('[SignUp] Email verification required, switching to verification mode');
        setVerificationMode(true);
        setPassword('');
        setConfirmPassword('');
      } else {
        triggerDataRefresh();
        
        const localProfile = await getLocalProfile();
        console.log('[SignUp] Post-signup check - Local profile:', !!localProfile);
        
        router.replace('/(tabs)');
      }
    } catch (error: unknown) {
      console.log('[SignUp] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    router.replace('/auth');
  };

  if (verificationMode) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Verify Your Email',
            headerStyle: { backgroundColor: Colors.dark.background },
            headerTintColor: Colors.dark.text,
          }}
        />
        <View style={styles.verificationContainer}>
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Mail size={40} color={Colors.dark.primary} />
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a verification link to your email.
            </Text>
            <Text style={styles.emailDisplay}>{email}</Text>
          </View>

          <View style={styles.verificationInfo}>
            <Text style={styles.verificationText}>
              Please check your inbox and click the verification link to activate your account.
            </Text>
          </View>

          <Pressable
            style={styles.submitButton}
            onPress={handleBackToSignIn}
            testID="signup-back-to-signin-button"
          >
            <Text style={styles.submitButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Create Account',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
        }}
      />
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Shield size={40} color={Colors.dark.primary} />
            </View>
            <Text style={styles.title}>Create Free Account</Text>
            <Text style={styles.subtitle}>
              {"Back up your dog's data and access it anywhere"}
            </Text>
          </View>

          <View style={styles.socialSection}>
            <Pressable
              style={styles.appleButton}
              onPress={() => handleSocialSignUp('apple')}
              disabled={isSubmitting}
              testID="signup-apple-button"
            >
              <Apple size={20} color="#FFFFFF" />
              <Text style={styles.appleButtonText}>Sign up with Apple</Text>
            </Pressable>

            <Pressable
              style={styles.googleButton}
              onPress={() => handleSocialSignUp('google')}
              disabled={isSubmitting}
              testID="signup-google-button"
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.dark.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.dark.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="signup-email-input"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={Colors.dark.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.dark.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="signup-password-input"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.dark.textTertiary} />
                  ) : (
                    <Eye size={20} color={Colors.dark.textTertiary} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={Colors.dark.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={Colors.dark.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  testID="signup-confirm-password-input"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={Colors.dark.textTertiary} />
                  ) : (
                    <Eye size={20} color={Colors.dark.textTertiary} />
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSignUp}
              disabled={isSubmitting}
              testID="signup-submit-button"
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Creating Account...' : 'Create Free Account'}
              </Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
      </KeyboardAwareScreen>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerSection: {
    alignItems: 'center' as const,
    marginBottom: 36,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: 'center' as const,
    lineHeight: 18,
    marginTop: 8,
  },
  socialSection: {
    gap: 12,
    marginBottom: 24,
  },
  appleButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 10,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  googleButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DADCE0',
    gap: 10,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F1F1F',
  },
  dividerContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    paddingHorizontal: 16,
  },
  verificationContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'flex-start' as const,
  },
  emailDisplay: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginTop: 12,
  },
  verificationInfo: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 32,
  },
  verificationText: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
});
