import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { v4 as uuidv4 } from 'uuid';
import { Activity, HealthNote } from '@/types/dog';
import { supabase, DbActivity, DbHealthNote } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useDogProfile } from './DogProfileContext';
import { isNetworkError, getOfflineMessage, checkIsOnline } from '@/utils/networkHelper';

const LOCAL_ACTIVITIES_KEY = '@canine_iq_activities';
const LOCAL_HEALTH_NOTES_KEY = '@canine_iq_health_notes';

const mapDbActivityToActivity = (dbActivity: DbActivity): Activity => ({
  id: dbActivity.id,
  dogId: dbActivity.dog_id,
  type: dbActivity.type,
  duration: dbActivity.duration,
  effort: dbActivity.effort,
  trainingPoints: dbActivity.training_points,
  notes: dbActivity.notes,
  date: dbActivity.date,
  imageBase64: dbActivity.image_base64,
  weight: dbActivity.weight,
  activityDate: dbActivity.activity_date,
  contributesToGoal: dbActivity.contributes_to_goal,
  editedAt: dbActivity.edited_at,
});

const mapDbHealthNoteToHealthNote = (dbNote: DbHealthNote): HealthNote => ({
  id: dbNote.id,
  text: dbNote.text,
  date: dbNote.date,
  createdAt: dbNote.created_at,
  weightKg: dbNote.weight_kg,
  bcsScore: dbNote.bcs_score ?? null,
  editedAt: dbNote.edited_at,
});

export const [ActivityProvider, useActivities] = createContextHook(() => {
  const { userId, isLoggedIn, authRefreshTrigger } = useAuth();
  const { profile, dataSource } = useDogProfile();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [healthNotes, setHealthNotes] = useState<HealthNote[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const prevIsLoggedIn = useRef(isLoggedIn);
  const queryClient = useQueryClient();

  const dogId = profile?.id;
  const useSupabase = dataSource === 'supabase' && isLoggedIn && !!userId && !!dogId;
  const canAttemptSupabase = isLoggedIn && !!userId && !!dogId;

  useEffect(() => {
    if (prevIsLoggedIn.current && !isLoggedIn) {
      console.log('[Activities] Logout detected, clearing state');
      setActivities([]);
      setHealthNotes([]);
      setHasUnsyncedChanges(false);
      setBackupStatus('idle');
    }
    prevIsLoggedIn.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    if (!prevIsLoggedIn.current && isLoggedIn) {
      console.log('[Activities] Login detected, resetting hydration');
      setIsHydrated(false);
    }
  }, [isLoggedIn]);

  const localActivitiesQuery = useQuery({
    queryKey: ['activities', 'local', authRefreshTrigger],
    queryFn: async () => {
      try {
        console.log('[Activities] Loading activities from local storage');
        const stored = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Activity[];
          console.log('[Activities] Local activities loaded:', parsed.length);
          return parsed;
        }
        return [];
      } catch (error) {
        console.error('[Activities] Error loading local activities:', error);
        return [];
      }
    },
    staleTime: Infinity,
  });

  const supabaseActivitiesQuery = useQuery({
    queryKey: ['activities', 'supabase', userId, dogId, authRefreshTrigger],
    queryFn: async () => {
      if (!userId || !dogId) {
        console.log('[Activities] No user or dog ID, returning empty');
        return [];
      }

      const online = await checkIsOnline();
      if (!online) {
        console.log('[Activities] Offline, returning local activities as fallback');
        try {
          const stored = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
          const all: Activity[] = stored ? JSON.parse(stored) : [];
          return dogId ? all.filter(a => a.dogId === dogId) : all;
        } catch {
          return [];
        }
      }

      try {
        console.log('[Activities] Loading activities from Supabase...');
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', userId)
          .eq('dog_id', dogId)
          .order('activity_date', { ascending: false });

        if (error) {
          console.error('[Activities] Error loading activities:', error);
          throw error;
        }

        const activities = (data || []).map(mapDbActivityToActivity);
        console.log('[Activities] Supabase activities loaded:', activities.length);
        return activities;
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('[Activities] Network error loading activities, using local fallback');
          try {
            const stored = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
            const all: Activity[] = stored ? JSON.parse(stored) : [];
            return dogId ? all.filter(a => a.dogId === dogId) : all;
          } catch {
            return [];
          }
        }
        console.error('[Activities] Error loading activities:', error);
        return [];
      }
    },
    enabled: useSupabase,
    staleTime: Infinity,
  });

  const localHealthNotesQuery = useQuery({
    queryKey: ['healthNotes', 'local', authRefreshTrigger],
    queryFn: async () => {
      try {
        console.log('[HealthNotes] Loading health notes from local storage');
        const stored = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as HealthNote[];
          console.log('[HealthNotes] Local health notes loaded:', parsed.length);
          return parsed;
        }
        return [];
      } catch (error) {
        console.error('[HealthNotes] Error loading local health notes:', error);
        return [];
      }
    },
    staleTime: Infinity,
  });

  const supabaseHealthNotesQuery = useQuery({
    queryKey: ['healthNotes', 'supabase', userId, dogId, authRefreshTrigger],
    queryFn: async () => {
      if (!userId || !dogId) {
        console.log('[HealthNotes] No user or dog ID, returning empty');
        return [];
      }

      const online = await checkIsOnline();
      if (!online) {
        console.log('[HealthNotes] Offline, returning local health notes as fallback');
        try {
          const stored = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
          const all: HealthNote[] = stored ? JSON.parse(stored) : [];
          return dogId ? all.filter(n => n.dogId === dogId || !n.dogId) : all;
        } catch {
          return [];
        }
      }

      try {
        console.log('[HealthNotes] Loading health notes from Supabase...');
        const { data, error } = await supabase
          .from('health_notes')
          .select('*')
          .eq('user_id', userId)
          .eq('dog_id', dogId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[HealthNotes] Error loading health notes:', error);
          throw error;
        }

        const notes = (data || []).map(mapDbHealthNoteToHealthNote);
        console.log('[HealthNotes] Supabase health notes loaded:', notes.length);
        return notes;
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('[HealthNotes] Network error loading health notes, using local fallback');
          try {
            const stored = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
            const all: HealthNote[] = stored ? JSON.parse(stored) : [];
            return dogId ? all.filter(n => n.dogId === dogId || !n.dogId) : all;
          } catch {
            return [];
          }
        }
        console.error('[HealthNotes] Error loading health notes:', error);
        return [];
      }
    },
    enabled: useSupabase,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (localActivitiesQuery.isLoading) return;

    if (useSupabase) {
      if (supabaseActivitiesQuery.data && !supabaseActivitiesQuery.isLoading) {
        console.log('[Activities] Hydrating from Supabase:', supabaseActivitiesQuery.data.length);
        setActivities(supabaseActivitiesQuery.data);
        setIsHydrated(true);
      }
    } else {
      const allLocal = localActivitiesQuery.data || [];
      const filteredByDog = dogId 
        ? allLocal.filter(a => a.dogId === dogId)
        : allLocal;
      console.log('[Activities] Hydrating from local storage:', filteredByDog.length, 'of', allLocal.length, 'for dogId:', dogId);
      setActivities(filteredByDog);
      setIsHydrated(true);
    }
  }, [
    useSupabase,
    localActivitiesQuery.data,
    localActivitiesQuery.isLoading,
    supabaseActivitiesQuery.data,
    supabaseActivitiesQuery.isLoading,
    authRefreshTrigger,
    dogId,
  ]);

  useEffect(() => {
    if (localHealthNotesQuery.isLoading) return;

    if (useSupabase) {
      if (supabaseHealthNotesQuery.data && !supabaseHealthNotesQuery.isLoading) {
        console.log('[HealthNotes] Hydrating from Supabase:', supabaseHealthNotesQuery.data.length);
        setHealthNotes(supabaseHealthNotesQuery.data);
      }
    } else {
      const allLocal = localHealthNotesQuery.data || [];
      const filteredByDog = dogId 
        ? allLocal.filter(n => n.dogId === dogId || !n.dogId)
        : allLocal;
      console.log('[HealthNotes] Hydrating from local storage:', filteredByDog.length, 'of', allLocal.length, 'for dogId:', dogId);
      setHealthNotes(filteredByDog);
    }
  }, [
    useSupabase,
    localHealthNotesQuery.data,
    localHealthNotesQuery.isLoading,
    supabaseHealthNotesQuery.data,
    supabaseHealthNotesQuery.isLoading,
    authRefreshTrigger,
    dogId,
  ]);

  const saveActivityLocally = useCallback(async (activity: Activity) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
      const currentActivities: Activity[] = stored ? JSON.parse(stored) : [];
      const exists = currentActivities.findIndex(a => a.id === activity.id);
      let updated: Activity[];
      if (exists >= 0) {
        updated = currentActivities.map(a => a.id === activity.id ? activity : a);
      } else {
        updated = [activity, ...currentActivities];
      }
      await AsyncStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(updated));
      console.log('[Activities] Saved activity locally as fallback:', activity.id);
    } catch (err) {
      console.error('[Activities] Error saving activity locally:', err);
    }
  }, []);

  const removeActivityLocally = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
      const currentActivities: Activity[] = stored ? JSON.parse(stored) : [];
      const updated = currentActivities.filter(a => a.id !== id);
      await AsyncStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(updated));
      console.log('[Activities] Removed activity locally:', id);
    } catch (err) {
      console.error('[Activities] Error removing activity locally:', err);
    }
  }, []);

  const saveHealthNoteLocally = useCallback(async (note: HealthNote) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
      const currentNotes: HealthNote[] = stored ? JSON.parse(stored) : [];
      const exists = currentNotes.findIndex(n => n.id === note.id);
      let updated: HealthNote[];
      if (exists >= 0) {
        updated = currentNotes.map(n => n.id === note.id ? note : n);
      } else {
        updated = [note, ...currentNotes];
      }
      await AsyncStorage.setItem(LOCAL_HEALTH_NOTES_KEY, JSON.stringify(updated));
      console.log('[HealthNotes] Saved health note locally as fallback:', note.id);
    } catch (err) {
      console.error('[HealthNotes] Error saving health note locally:', err);
    }
  }, []);

  const removeHealthNoteLocally = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
      const currentNotes: HealthNote[] = stored ? JSON.parse(stored) : [];
      const updated = currentNotes.filter(n => n.id !== id);
      await AsyncStorage.setItem(LOCAL_HEALTH_NOTES_KEY, JSON.stringify(updated));
      console.log('[HealthNotes] Removed health note locally:', id);
    } catch (err) {
      console.error('[HealthNotes] Error removing health note locally:', err);
    }
  }, []);

  const calculateTrainingPoints = (duration: number, effort: 'low' | 'moderate' | 'high'): number => {
    const multiplier = effort === 'high' ? 2.0 : effort === 'moderate' ? 1.5 : 1.0;
    return Math.round(duration * multiplier);
  };

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'date'>, dateString?: string) => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const activityDate = dateString ? new Date(dateString) : now;
    
    if (activityDate > now) return;
    if (activityDate < sevenDaysAgo) return;
    
    const newActivity: Activity = {
      ...activity,
      id: uuidv4(),
      dogId: dogId || '',
      date: dateString || new Date().toISOString(),
      activityDate: activity.activityDate || dateString || new Date().toISOString(),
    };

    setActivities(prev => [newActivity, ...prev]);
    saveActivityLocally(newActivity);
    console.log('[Activities] Optimistic update + immediate local save for:', newActivity.id);

    if (canAttemptSupabase) {
      const nowTs = new Date().toISOString();
      const dbActivity = {
        id: newActivity.id,
        user_id: userId,
        dog_id: dogId,
        type: newActivity.type,
        duration: newActivity.duration,
        effort: newActivity.effort,
        training_points: newActivity.trainingPoints,
        notes: newActivity.notes || null,
        date: newActivity.date,
        image_base64: newActivity.imageBase64 || null,
        weight: newActivity.weight || null,
        activity_date: newActivity.activityDate || nowTs,
        contributes_to_goal: newActivity.contributesToGoal || false,
        edited_at: null,
        created_at: nowTs,
        updated_at: nowTs,
      };

      console.log('[Activities] Supabase-first: inserting activity:', newActivity.id);
      Promise.resolve(supabase
        .from('activities')
        .insert(dbActivity)
        .select()
        .single())
        .then(({ data, error }) => {
          if (error) {
            const offline = isNetworkError(error);
            if (offline) {
              console.log('[Activities] Offline detected, activity already saved locally:', newActivity.id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[Activities] Supabase insert failed, local fallback already persisted:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[Activities] Supabase insert succeeded:', data.id);
            const mapped = mapDbActivityToActivity(data);
            setActivities(prev => prev.map(a => a.id === newActivity.id ? mapped : a));
            queryClient.invalidateQueries({ queryKey: ['activities', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[Activities] Offline: activity already saved locally:', newActivity.id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Activities] Unexpected insert error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, saveActivityLocally, queryClient]);

  const updateActivity = useCallback((id: string, updates: Partial<Activity>) => {
    const updatedAt = new Date().toISOString();
    const current = activities.find(a => a.id === id);
    const updated = current ? { ...current, ...updates, editedAt: updatedAt } : null;

    setActivities(list =>
      list.map(a => a.id === id ? { ...a, ...updates, editedAt: updatedAt } : a)
    );
    if (updated) {
      saveActivityLocally(updated);
      console.log('[Activities] Optimistic update + immediate local save for:', id);
    }

    if (canAttemptSupabase) {
      const dbUpdates: Record<string, unknown> = {
        edited_at: updatedAt,
        updated_at: updatedAt,
      };
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.effort !== undefined) dbUpdates.effort = updates.effort;
      if (updates.trainingPoints !== undefined) dbUpdates.training_points = updates.trainingPoints;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.imageBase64 !== undefined) dbUpdates.image_base64 = updates.imageBase64;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.activityDate !== undefined) dbUpdates.activity_date = updates.activityDate;
      if (updates.contributesToGoal !== undefined) dbUpdates.contributes_to_goal = updates.contributesToGoal;

      console.log('[Activities] Supabase-first: updating activity:', id);
      Promise.resolve(supabase
        .from('activities')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[Activities] Offline: update already saved locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[Activities] Supabase update failed, local fallback already persisted:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[Activities] Supabase update succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['activities', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[Activities] Offline: update already saved locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Activities] Unexpected update error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, activities, saveActivityLocally, queryClient]);

  const deleteActivity = useCallback((id: string) => {
    setActivities(list => list.filter(a => a.id !== id));
    removeActivityLocally(id);
    console.log('[Activities] Optimistic delete + immediate local removal for:', id);

    if (canAttemptSupabase) {
      console.log('[Activities] Supabase-first: deleting activity:', id);
      Promise.resolve(supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[Activities] Offline: delete already applied locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[Activities] Supabase delete failed:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[Activities] Supabase delete succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['activities', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[Activities] Offline: delete already applied locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Activities] Unexpected delete error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, removeActivityLocally, queryClient]);

  const addHealthNote = useCallback((text: string, dateString?: string, weightKg?: number, bcsScore?: number | null) => {
    const noteDate = dateString ? new Date(dateString) : new Date();
    const nowTs = new Date().toISOString();
    const newNote: HealthNote = {
      id: uuidv4(),
      dogId: dogId || undefined,
      text: text.trim(),
      date: noteDate.toLocaleDateString(),
      createdAt: dateString || nowTs,
      weightKg,
      bcsScore: bcsScore ?? null,
    };

    setHealthNotes(prev => [newNote, ...prev]);
    saveHealthNoteLocally(newNote);
    console.log('[HealthNotes] Optimistic update + immediate local save for:', newNote.id);

    if (canAttemptSupabase) {
      const dbNote = {
        user_id: userId,
        dog_id: dogId,
        text: newNote.text,
        date: newNote.date,
        weight_kg: newNote.weightKg || null,
        bcs_score: newNote.bcsScore ?? null,
        created_at: newNote.createdAt || nowTs,
        edited_at: null,
      };

      console.log('[HealthNotes] Supabase-first: inserting health note');
      Promise.resolve(supabase
        .from('health_notes')
        .insert(dbNote)
        .select()
        .single())
        .then(({ data, error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[HealthNotes] Offline: note already saved locally:', newNote.id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[HealthNotes] Supabase insert failed, local fallback already persisted:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[HealthNotes] Supabase insert succeeded:', data.id);
            const mapped = mapDbHealthNoteToHealthNote(data);
            setHealthNotes(prev => prev.map(n => n.id === newNote.id ? mapped : n));
            queryClient.invalidateQueries({ queryKey: ['healthNotes', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[HealthNotes] Offline: note already saved locally:', newNote.id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[HealthNotes] Unexpected insert error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, saveHealthNoteLocally, queryClient]);

  const addCoachHealthNote = useCallback((text: string, dateString?: string, weightKg?: number) => {
    const fullText = `[General Observation] ${text.trim()}`;
    addHealthNote(fullText, dateString, weightKg);
  }, [addHealthNote]);

  const updateHealthNote = useCallback((id: string, updates: Partial<HealthNote>) => {
    const editedAt = new Date().toISOString();
    const current = healthNotes.find(n => n.id === id);
    const updated = current ? { ...current, ...updates, editedAt } : null;

    setHealthNotes(list =>
      list.map(n => n.id === id ? { ...n, ...updates, editedAt } : n)
    );
    if (updated) {
      saveHealthNoteLocally(updated);
      console.log('[HealthNotes] Optimistic update + immediate local save for:', id);
    }

    if (canAttemptSupabase) {
      const dbUpdates: Record<string, unknown> = {
        edited_at: editedAt,
      };
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.weightKg !== undefined) dbUpdates.weight_kg = updates.weightKg;
      if (updates.bcsScore !== undefined) dbUpdates.bcs_score = updates.bcsScore ?? null;

      console.log('[HealthNotes] Supabase-first: updating health note:', id);
      Promise.resolve(supabase
        .from('health_notes')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[HealthNotes] Offline: update already saved locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[HealthNotes] Supabase update failed, local fallback already persisted:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[HealthNotes] Supabase update succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['healthNotes', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[HealthNotes] Offline: update already saved locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[HealthNotes] Unexpected update error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, healthNotes, saveHealthNoteLocally, queryClient]);

  const deleteHealthNote = useCallback((id: string) => {
    setHealthNotes(list => list.filter(n => n.id !== id));
    removeHealthNoteLocally(id);
    console.log('[HealthNotes] Optimistic delete + immediate local removal for:', id);

    if (canAttemptSupabase) {
      console.log('[HealthNotes] Supabase-first: deleting health note:', id);
      Promise.resolve(supabase
        .from('health_notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[HealthNotes] Offline: delete already applied locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[HealthNotes] Supabase delete failed:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[HealthNotes] Supabase delete succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['healthNotes', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[HealthNotes] Offline: delete already applied locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[HealthNotes] Unexpected delete error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, removeHealthNoteLocally, queryClient]);

  const backupToSupabase = useCallback(async () => {
    if (!isLoggedIn || !userId || !dogId) {
      console.log('[Activities] Cannot backup: not logged in or no dog');
      return;
    }

    console.log('[Activities] Starting manual backup of activities and health notes');
    setBackupStatus('uploading');
    let hasPartialFailure = false;

    try {
      const storedActivities = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
      if (storedActivities) {
        const localActivities: Activity[] = JSON.parse(storedActivities);
        const dogActivities = localActivities.filter(a => a.dogId === dogId);

        if (dogActivities.length > 0) {
          console.log('[Activities] Backing up', dogActivities.length, 'local activities');
          for (const activity of dogActivities) {
            try {
              const now = new Date().toISOString();
              const activityData = {
                user_id: userId,
                dog_id: dogId,
                type: activity.type,
                duration: activity.duration,
                effort: activity.effort,
                training_points: activity.trainingPoints,
                notes: activity.notes || null,
                date: activity.date,
                image_base64: activity.imageBase64 || null,
                weight: activity.weight || null,
                activity_date: activity.activityDate || now,
                contributes_to_goal: activity.contributesToGoal || false,
                edited_at: activity.editedAt || null,
                created_at: activity.date || now,
                updated_at: now,
              };

              const isLocalId = activity.id.startsWith('local_');
              if (isLocalId) {
                const { error } = await supabase.from('activities').insert(activityData);
                if (error) {
                  console.error('[Activities] Backup insert error:', activity.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              } else {
                const { error } = await supabase
                  .from('activities')
                  .upsert({ id: activity.id, ...activityData }, { onConflict: 'id' });
                if (error) {
                  console.error('[Activities] Backup upsert error:', activity.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              }
            } catch (err) {
              console.error('[Activities] Backup error for activity:', activity.id, err);
              hasPartialFailure = true;
            }
          }
        }
      }

      const storedNotes = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
      if (storedNotes) {
        const localNotes: HealthNote[] = JSON.parse(storedNotes);
        const dogNotes = localNotes.filter(n => n.dogId === dogId || !n.dogId);

        if (dogNotes.length > 0) {
          console.log('[HealthNotes] Backing up', dogNotes.length, 'local health notes');
          for (const note of dogNotes) {
            try {
              const now = new Date().toISOString();
              const noteData = {
                user_id: userId,
                dog_id: dogId,
                text: note.text,
                date: note.date,
                weight_kg: note.weightKg || null,
                bcs_score: note.bcsScore ?? null,
                edited_at: note.editedAt || null,
                created_at: note.createdAt || now,
              };

              const isLocalId = note.id.startsWith('local_');
              if (isLocalId) {
                const { error } = await supabase.from('health_notes').insert(noteData);
                if (error) {
                  console.error('[HealthNotes] Backup insert error:', note.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              } else {
                const { error } = await supabase
                  .from('health_notes')
                  .upsert({ id: note.id, ...noteData }, { onConflict: 'id' });
                if (error) {
                  console.error('[HealthNotes] Backup upsert error:', note.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              }
            } catch (err) {
              console.error('[HealthNotes] Backup error for note:', note.id, err);
              hasPartialFailure = true;
            }
          }
        }
      }

      if (hasPartialFailure) {
        console.log('[Activities] Backup completed with partial failures');
        setHasUnsyncedChanges(true);
        setBackupStatus('idle');
      } else {
        console.log('[Activities] Backup completed successfully');
        setHasUnsyncedChanges(false);
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 2000);
      }

      queryClient.invalidateQueries({ queryKey: ['activities', 'supabase', userId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['healthNotes', 'supabase', userId, dogId] });
    } catch (error) {
      console.error('[Activities] Unexpected backup error:', error);
      setHasUnsyncedChanges(true);
      setBackupStatus('idle');
    }
  }, [isLoggedIn, userId, dogId, queryClient]);

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => 
      new Date(b.activityDate || b.date).getTime() - new Date(a.activityDate || a.date).getTime()
    );
  }, [activities]);

  const getWeekActivities = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sortedActivities.filter(a => new Date(a.activityDate || a.date) >= weekAgo);
  }, [sortedActivities]);

  const weeklyStats = useMemo(() => {
    const weekActivities = getWeekActivities;
    const totalMinutes = weekActivities.reduce((sum, a) => sum + a.duration, 0);
    const totalHours = totalMinutes / 60;
    const totalTrainingPoints = weekActivities.reduce((sum, a) => sum + a.trainingPoints, 0);
    
    let avgEffort: 'low' | 'moderate' | 'high' = 'low';
    if (weekActivities.length > 0) {
      const effortScores = weekActivities.map(a => {
        if (a.effort === 'high') return 3;
        if (a.effort === 'moderate') return 2;
        return 1;
      });
      const avgScore = effortScores.reduce((sum, score) => sum + score, 0) / weekActivities.length;
      
      if (avgScore >= 2.5) avgEffort = 'high';
      else if (avgScore >= 1.5) avgEffort = 'moderate';
      else avgEffort = 'low';
    }

    return {
      totalHours: totalHours.toFixed(1),
      count: weekActivities.length,
      avgEffort,
      totalTrainingPoints,
    };
  }, [getWeekActivities]);

  const isLoading = useSupabase 
    ? supabaseActivitiesQuery.isLoading 
    : localActivitiesQuery.isLoading;

  const isSaving = false;

  return {
    activities: sortedActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    getWeekActivities,
    weeklyStats,
    calculateTrainingPoints,
    healthNotes,
    addHealthNote,
    addCoachHealthNote,
    deleteHealthNote,
    updateHealthNote,
    isLoading,
    isSaving,
    isHydrated,
    hasUnsyncedChanges,
    backupStatus,
    backupToSupabase,
    offlineNotice,
  };
});
