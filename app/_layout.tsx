import 'react-native-get-random-values';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform } from "react-native";
import Colors from "@/constants/colors";
import { DogProfileProvider } from "@/contexts/DogProfileContext";
import TooltipOverlay from "@/components/TooltipOverlay";
import { BreedAnalysisProvider } from "@/contexts/BreedAnalysisContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { GoalProvider } from "@/contexts/GoalContext";
import { CoachProvider } from "@/contexts/CoachContext";
import { TooltipProvider } from "@/contexts/TooltipContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { AccountPromptContainer } from "@/components/AccountPromptModal";
import OfflineBanner from "@/components/OfflineBanner";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        contentStyle: {
          backgroundColor: Colors.dark.background,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="select-breed" />
      <Stack.Screen name="add-activity" options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
      <Stack.Screen name="manage-goals" />
      <Stack.Screen name="coach-settings" />
      <Stack.Screen name="coach-activity" options={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }} />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="generate-report" />
      <Stack.Screen name="app-settings" />
      <Stack.Screen name="help-faq" />
      <Stack.Screen name="terms-of-use" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors.dark.background);
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#121212');
      NavigationBar.setButtonStyleAsync('light');
    }
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DogProfileProvider>
            <BreedAnalysisProvider>
              <ActivityProvider>
                <GoalProvider>
                  <CoachProvider>
                    <SyncProvider>
                      <TooltipProvider>
                        <RootLayoutNav />
                        <TooltipOverlay />
                        <AccountPromptContainer />
                        <OfflineBanner />
                      </TooltipProvider>
                    </SyncProvider>
                  </CoachProvider>
                </GoalProvider>
              </ActivityProvider>
            </BreedAnalysisProvider>
          </DogProfileProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
