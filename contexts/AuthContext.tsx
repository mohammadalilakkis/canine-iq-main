import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

const ALL_DATA_KEYS = [
  '@canine_iq_dog_profile',
  '@canine_iq_activities',
  '@canine_iq_health_notes',
  '@canine_iq_goals',
  '@canine_intelligence:coach_settings',
  '@canine_iq_pending_breed_analysis',
  '@canine_iq_breed_analysis',
];

const ACTION_COUNT_KEY = '@canine_iq_action_count';
const PROMPTS_SHOWN_KEY = '@canine_iq_prompts_shown';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [meaningfulActionCount, setMeaningfulActionCount] = useState(0);
  const [promptsShown, setPromptsShown] = useState(0);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tooltipsSuppressed, setTooltipsSuppressed] = useState(false);
  const [authRefreshTrigger, setAuthRefreshTrigger] = useState(0);
  const previousIsLoggedIn = useRef<boolean | null>(null);

  useEffect(() => {
    const loadLocalState = async () => {
      try {
        const [actionCount, promptCount] = await Promise.all([
          AsyncStorage.getItem(ACTION_COUNT_KEY),
          AsyncStorage.getItem(PROMPTS_SHOWN_KEY),
        ]);

        if (actionCount) {
          setMeaningfulActionCount(parseInt(actionCount, 10));
        }

        if (promptCount) {
          setPromptsShown(parseInt(promptCount, 10));
        }
      } catch (error) {
        console.log('[AuthContext] Error loading local state:', error);
      }
    };

    loadLocalState();

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session?.user?.email);
      const wasLoggedIn = previousIsLoggedIn.current;
      const isNowLoggedIn = !!session;
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoaded(true);
      
      if (wasLoggedIn !== null && wasLoggedIn !== isNowLoggedIn) {
        console.log('[AuthContext] Login state changed, triggering refresh');
        setAuthRefreshTrigger(prev => prev + 1);
      }
      
      previousIsLoggedIn.current = isNowLoggedIn;
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('[AuthContext] Login error:', error.message);
      throw error;
    }

    console.log('[AuthContext] Login successful:', data.user?.email);
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Attempting signup for:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log('[AuthContext] Signup error:', error.message);
      throw error;
    }

    console.log('[AuthContext] Signup successful:', data.user?.email);
    return data;
  }, []);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[AuthContext] Logout error:', error.message);
      throw error;
    }

    console.log('[AuthContext] Clearing all local data on sign-out');
    try {
      await AsyncStorage.multiRemove(ALL_DATA_KEYS);
      console.log('[AuthContext] All local data cleared successfully');
    } catch (clearError) {
      console.error('[AuthContext] Error clearing local data:', clearError);
    }

    console.log('[AuthContext] Logout successful');
    setAuthRefreshTrigger(prev => prev + 1);
  }, []);

  const triggerDataRefresh = useCallback(() => {
    console.log('[AuthContext] Manual data refresh triggered');
    setAuthRefreshTrigger(prev => prev + 1);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user || !session) {
      console.log('[AuthContext] Cannot delete account: no authenticated user');
      throw new Error('No authenticated user');
    }

    const currentUserId = user.id;
    console.log('[AuthContext] Starting account deletion for:', currentUserId);

    try {
      const { data: dogs } = await supabase
        .from('dogs')
        .select('id')
        .eq('user_id', currentUserId);

      const dogIds = (dogs || []).map((d: { id: string }) => d.id);

      if (dogIds.length > 0) {
        console.log('[AuthContext] Deleting data for dogs:', dogIds);

        const { error: activitiesErr } = await supabase
          .from('activities')
          .delete()
          .eq('user_id', currentUserId);
        if (activitiesErr) console.error('[AuthContext] Error deleting activities:', activitiesErr);

        const { error: healthErr } = await supabase
          .from('health_notes')
          .delete()
          .eq('user_id', currentUserId);
        if (healthErr) console.error('[AuthContext] Error deleting health notes:', healthErr);

        const { error: goalsErr } = await supabase
          .from('goals')
          .delete()
          .eq('user_id', currentUserId);
        if (goalsErr) console.error('[AuthContext] Error deleting goals:', goalsErr);

        for (const dogId of dogIds) {
          const { error: breedErr } = await supabase
            .from('breed_components')
            .delete()
            .eq('dog_id', dogId);
          if (breedErr) console.error('[AuthContext] Error deleting breed components for dog:', dogId, breedErr);
        }

        const { error: dogsErr } = await supabase
          .from('dogs')
          .delete()
          .eq('user_id', currentUserId);
        if (dogsErr) console.error('[AuthContext] Error deleting dogs:', dogsErr);
      }

      console.log('[AuthContext] Clearing all local storage keys');
      await AsyncStorage.multiRemove([
        ...ALL_DATA_KEYS,
        ACTION_COUNT_KEY,
        PROMPTS_SHOWN_KEY,
      ]);

      console.log('[AuthContext] Signing out after account deletion');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[AuthContext] Sign out error after deletion:', signOutError);
      }

      setMeaningfulActionCount(0);
      setPromptsShown(0);
      setShowAccountPrompt(false);
      setTooltipsSuppressed(false);
      setAuthRefreshTrigger(prev => prev + 1);

      console.log('[AuthContext] Account deletion completed successfully');
    } catch (error) {
      console.error('[AuthContext] Account deletion failed:', error);
      throw error;
    }
  }, [user, session]);

  const trackMeaningfulAction = useCallback(async () => {
    if (user) {
      console.log('[AuthContext] User already logged in, skipping action tracking');
      return;
    }

    const newCount = meaningfulActionCount + 1;
    setMeaningfulActionCount(newCount);
    await AsyncStorage.setItem(ACTION_COUNT_KEY, newCount.toString());
    console.log('[AuthContext] Meaningful action tracked, count:', newCount);

    if (promptsShown >= 2) {
      console.log('[AuthContext] Already showed 2 prompts, skipping');
      return;
    }

    const shouldShowPrompt = (newCount === 1 && promptsShown === 0) || 
                             (newCount === 3 && promptsShown === 1);

    if (shouldShowPrompt) {
      console.log('[AuthContext] Scheduling account prompt display');
      setTimeout(() => {
        setTooltipsSuppressed(true);
        setShowAccountPrompt(true);
      }, 1500);
    }
  }, [user, meaningfulActionCount, promptsShown]);

  const dismissAccountPrompt = useCallback(async () => {
    setShowAccountPrompt(false);
    setTooltipsSuppressed(false);
    const newPromptsShown = promptsShown + 1;
    setPromptsShown(newPromptsShown);
    await AsyncStorage.setItem(PROMPTS_SHOWN_KEY, newPromptsShown.toString());
    console.log('[AuthContext] Account prompt dismissed, total shown:', newPromptsShown);
  }, [promptsShown]);

  const openSignUp = useCallback(() => {
    console.log('[AuthContext] Opening sign up flow');
    setShowAccountPrompt(false);
    setTooltipsSuppressed(false);
  }, []);

  return {
    isLoggedIn: !!session,
    userEmail: user?.email ?? null,
    userId: user?.id ?? null,
    session,
    user,
    isLoaded,
    login,
    signUp,
    logout,
    deleteAccount,
    trackMeaningfulAction,
    showAccountPrompt,
    dismissAccountPrompt,
    openSignUp,
    tooltipsSuppressed,
    meaningfulActionCount,
    promptsShown,
    authRefreshTrigger,
    triggerDataRefresh,
  };
});
