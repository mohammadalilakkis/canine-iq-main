import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useDogProfile } from './DogProfileContext';
import { useActivities } from './ActivityContext';
import { useGoals } from './GoalContext';
import { useAuth } from './AuthContext';
import { useBreedAnalysis } from './BreedAnalysisContext';
import { checkIsOnline } from '@/utils/networkHelper';

const POLL_INTERVAL = 15000;

export const [SyncProvider, useSync] = createContextHook(() => {
  const dogProfile = useDogProfile();
  const activities = useActivities();
  const goals = useGoals();
  const { isLoggedIn } = useAuth();
  const { generateAnalysis } = useBreedAnalysis();

  const [globalBackupStatus, setGlobalBackupStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOffline = useRef(false);
  const isSyncing = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const prevLoggedInRef = useRef<boolean | null>(null);
  const guestMigrationDone = useRef(false);

  const hasUnsyncedChanges = useMemo(() => {
    return (
      dogProfile.hasUnsyncedChanges ||
      activities.hasUnsyncedChanges ||
      goals.hasUnsyncedChanges
    );
  }, [dogProfile.hasUnsyncedChanges, activities.hasUnsyncedChanges, goals.hasUnsyncedChanges]);

  useEffect(() => {
    const wasLoggedIn = prevLoggedInRef.current;
    const isNowLoggedIn = isLoggedIn;

    if (wasLoggedIn !== null && !wasLoggedIn && isNowLoggedIn && !guestMigrationDone.current) {
      console.log('[Sync] Guest → authenticated transition detected, auto-syncing local data');
      guestMigrationDone.current = true;

      const migrateGuestData = async () => {
        const online = await checkIsOnline();
        if (!online) {
          console.log('[Sync] Offline during guest migration, will sync on reconnect');
          return;
        }

        const hasLocalData =
          dogProfile.hasUnsyncedChanges ||
          activities.hasUnsyncedChanges ||
          goals.hasUnsyncedChanges ||
          !!dogProfile.profile;

        if (!hasLocalData) {
          console.log('[Sync] No local guest data to migrate');
          return;
        }

        if (isSyncing.current) {
          console.log('[Sync] Sync already in progress, skipping guest migration');
          return;
        }

        isSyncing.current = true;
        console.log('[Sync] Starting guest data migration to Supabase');

        try {
          if (dogProfile.hasUnsyncedChanges || dogProfile.profile) {
            console.log('[Sync] Migrating dog profile...');
            await dogProfile.backupToSupabase();
          }
        } catch (err) {
          console.error('[Sync] Guest migration dog profile error:', err);
        }

        try {
          if (activities.hasUnsyncedChanges) {
            console.log('[Sync] Migrating activities + health notes...');
            await activities.backupToSupabase();
          }
        } catch (err) {
          console.error('[Sync] Guest migration activities error:', err);
        }

        try {
          if (goals.hasUnsyncedChanges) {
            console.log('[Sync] Migrating goals...');
            await goals.backupToSupabase();
          }
        } catch (err) {
          console.error('[Sync] Guest migration goals error:', err);
        }

        isSyncing.current = false;
        console.log('[Sync] Guest data migration completed');
      };

      migrateGuestData();
    } else if (wasLoggedIn !== null && wasLoggedIn && !isNowLoggedIn) {
      guestMigrationDone.current = false;
    }

    prevLoggedInRef.current = isNowLoggedIn;
  }, [isLoggedIn, dogProfile, activities, goals]);

  useEffect(() => {
    const notice =
      dogProfile.offlineNotice ||
      activities.offlineNotice ||
      goals.offlineNotice;

    if (notice) {
      setOfflineMessage(notice);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setOfflineMessage(null), 10000);
    }
  }, [dogProfile.offlineNotice, activities.offlineNotice, goals.offlineNotice]);

  const dismissOfflineMessage = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setOfflineMessage(null);
  }, []);

  const performAutoSync = useCallback(async () => {
    if (isSyncing.current) {
      console.log('[Sync] Auto-sync already in progress, skipping');
      return;
    }
    if (!isLoggedIn) {
      console.log('[Sync] Not logged in, skipping auto-sync');
      return;
    }

    const currentlyUnsynced =
      dogProfile.hasUnsyncedChanges ||
      activities.hasUnsyncedChanges ||
      goals.hasUnsyncedChanges;

    if (!currentlyUnsynced) {
      console.log('[Sync] No unsynced changes, skipping auto-sync');
      return;
    }

    console.log('[Sync] Starting auto-sync on reconnect');
    isSyncing.current = true;

    try {
      if (dogProfile.hasUnsyncedChanges) {
        console.log('[Sync] Auto-syncing dog profile...');
        await dogProfile.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Auto-sync dog profile error:', err);
    }

    try {
      if (activities.hasUnsyncedChanges) {
        console.log('[Sync] Auto-syncing activities + health notes...');
        await activities.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Auto-sync activities error:', err);
    }

    try {
      if (goals.hasUnsyncedChanges) {
        console.log('[Sync] Auto-syncing goals...');
        await goals.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Auto-sync goals error:', err);
    }

    if (dogProfile.pendingBreedAnalysis && dogProfile.profile?.breedMakeup) {
      console.log('[Sync] Pending breed analysis detected, regenerating...');
      const breeds = dogProfile.profile.breedMakeup.map(b => ({
        name: b.breedName,
        percentage: b.percentage,
      }));
      generateAnalysis(breeds);
      dogProfile.clearPendingBreedAnalysis();
    }

    isSyncing.current = false;
    console.log('[Sync] Auto-sync completed');
  }, [isLoggedIn, dogProfile, activities, goals, generateAnalysis]);

  const checkNetworkAndSync = useCallback(async () => {
    const online = await checkIsOnline();

    if (online && !isOnline) {
      console.log('[Sync] Network restored (was offline)');
      setIsOnline(true);
      wasOffline.current = false;
      setOfflineMessage(null);
      await performAutoSync();
    } else if (!online && isOnline) {
      console.log('[Sync] Network lost');
      setIsOnline(false);
      wasOffline.current = true;
    } else if (online && wasOffline.current) {
      console.log('[Sync] Confirming reconnect, triggering auto-sync');
      wasOffline.current = false;
      setOfflineMessage(null);
      await performAutoSync();
    }
  }, [isOnline, performAutoSync]);

  useEffect(() => {
    checkIsOnline().then(online => {
      setIsOnline(online);
      if (!online) wasOffline.current = true;
    });
  }, []);

  useEffect(() => {
    pollTimer.current = setInterval(() => {
      if (appState.current === 'active') {
        checkNetworkAndSync();
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [checkNetworkAndSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[Sync] App foregrounded, checking network');
        checkNetworkAndSync();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [checkNetworkAndSync]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        console.log('[Sync] Browser online event');
        setIsOnline(true);
        wasOffline.current = false;
        performAutoSync();
      };
      const handleOffline = () => {
        console.log('[Sync] Browser offline event');
        setIsOnline(false);
        wasOffline.current = true;
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    return undefined;
  }, [performAutoSync]);

  const backupAllData = useCallback(async () => {
    const online = await checkIsOnline();

    if (!online) {
      console.log('[Sync] Backup pressed while offline, showing message');
      setOfflineMessage("You're offline. Your data is saved locally and will sync automatically when online.");
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setOfflineMessage(null), 10000);
      return;
    }

    console.log('[Sync] Starting global backup of all data');
    setGlobalBackupStatus('uploading');

    let hasAnyFailure = false;

    try {
      if (dogProfile.hasUnsyncedChanges) {
        console.log('[Sync] Backing up dog profile + activities + health notes...');
        await dogProfile.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Dog profile backup error:', err);
      hasAnyFailure = true;
    }

    try {
      if (activities.hasUnsyncedChanges) {
        console.log('[Sync] Backing up activities + health notes...');
        await activities.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Activities backup error:', err);
      hasAnyFailure = true;
    }

    try {
      if (goals.hasUnsyncedChanges) {
        console.log('[Sync] Backing up goals...');
        await goals.backupToSupabase();
      }
    } catch (err) {
      console.error('[Sync] Goals backup error:', err);
      hasAnyFailure = true;
    }

    const stillUnsynced =
      dogProfile.hasUnsyncedChanges ||
      activities.hasUnsyncedChanges ||
      goals.hasUnsyncedChanges;

    if (hasAnyFailure || stillUnsynced) {
      console.log('[Sync] Global backup completed with partial failures');
      setGlobalBackupStatus('idle');
    } else {
      console.log('[Sync] Global backup completed successfully');
      setGlobalBackupStatus('success');
      setTimeout(() => setGlobalBackupStatus('idle'), 2000);
    }
  }, [dogProfile, activities, goals]);

  return {
    hasUnsyncedChanges,
    backupAllData,
    backupStatus: globalBackupStatus,
    offlineMessage,
    dismissOfflineMessage,
    isOnline,
  };
});
