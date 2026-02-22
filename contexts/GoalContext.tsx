import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Goal } from '@/types/dog';
import { supabase, DbGoal } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useDogProfile } from './DogProfileContext';
import { isNetworkError, getOfflineMessage, checkIsOnline } from '@/utils/networkHelper';

const LOCAL_GOALS_KEY = '@canine_iq_goals';

const mapDbGoalToGoal = (dbGoal: DbGoal): Goal => ({
  id: dbGoal.id,
  type: dbGoal.type,
  direction: dbGoal.direction,
  name: dbGoal.name,
  targetValue: dbGoal.target_value,
  startValue: dbGoal.start_value,
  currentValue: dbGoal.current_value,
  unit: dbGoal.unit,
  weeklyTarget: dbGoal.weekly_target,
  weekStartDate: dbGoal.week_start_date,
  isActive: dbGoal.is_active,
  createdAt: dbGoal.created_at,
  updatedAt: dbGoal.updated_at,
});

export const [GoalProvider, useGoals] = createContextHook(() => {
  const { userId, isLoggedIn, authRefreshTrigger } = useAuth();
  const { profile, dataSource } = useDogProfile();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const dogId = profile?.id;
  const useSupabase = dataSource === 'supabase' && isLoggedIn && !!userId && !!dogId;
  const canAttemptSupabase = isLoggedIn && !!userId && !!dogId;

  const localGoalsQuery = useQuery({
    queryKey: ['goals', 'local', authRefreshTrigger],
    queryFn: async () => {
      try {
        console.log('[Goals] Loading goals from local storage');
        const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Goal[];
          console.log('[Goals] Local goals loaded:', parsed.length);
          return parsed;
        }
        return [];
      } catch (error) {
        console.error('[Goals] Error loading local goals:', error);
        return [];
      }
    },
    staleTime: Infinity,
  });

  const supabaseGoalsQuery = useQuery({
    queryKey: ['goals', 'supabase', userId, dogId, authRefreshTrigger],
    queryFn: async () => {
      if (!userId || !dogId) {
        console.log('[Goals] No user or dog ID, returning empty');
        return [];
      }

      const online = await checkIsOnline();
      if (!online) {
        console.log('[Goals] Offline, returning local goals as fallback');
        try {
          const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
          return stored ? JSON.parse(stored) as Goal[] : [];
        } catch {
          return [];
        }
      }

      console.log('[Goals] Loading goals from Supabase');
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('dog_id', dogId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Goals] Error loading goals:', error);
          throw error;
        }

        const goals = (data || []).map(mapDbGoalToGoal);
        console.log('[Goals] Supabase goals loaded:', goals.length);
        return goals;
      } catch (error) {
        if (isNetworkError(error)) {
          console.log('[Goals] Network error loading goals, using local fallback');
          try {
            const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
            return stored ? JSON.parse(stored) as Goal[] : [];
          } catch {
            return [];
          }
        }
        console.error('[Goals] Error loading goals:', error);
        return [];
      }
    },
    enabled: useSupabase,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (localGoalsQuery.isLoading) return;

    if (useSupabase) {
      if (supabaseGoalsQuery.data && !supabaseGoalsQuery.isLoading) {
        console.log('[Goals] Hydrating from Supabase:', supabaseGoalsQuery.data.length);
        setGoals(supabaseGoalsQuery.data);
      }
    } else {
      console.log('[Goals] Hydrating from local storage:', localGoalsQuery.data?.length || 0);
      setGoals(localGoalsQuery.data || []);
    }
  }, [
    useSupabase,
    localGoalsQuery.data,
    localGoalsQuery.isLoading,
    supabaseGoalsQuery.data,
    supabaseGoalsQuery.isLoading,
    authRefreshTrigger,
  ]);

  const saveGoalLocally = useCallback(async (goal: Goal) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
      const currentGoals: Goal[] = stored ? JSON.parse(stored) : [];
      const exists = currentGoals.findIndex(g => g.id === goal.id);
      let updated: Goal[];
      if (exists >= 0) {
        updated = currentGoals.map(g => g.id === goal.id ? goal : g);
      } else {
        updated = [goal, ...currentGoals];
      }
      await AsyncStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(updated));
      console.log('[Goals] Saved goal locally:', goal.id);
    } catch (err) {
      console.error('[Goals] Error saving goal locally:', err);
    }
  }, []);

  const removeGoalLocally = useCallback(async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
      const currentGoals: Goal[] = stored ? JSON.parse(stored) : [];
      const updated = currentGoals.filter(g => g.id !== id);
      await AsyncStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(updated));
      console.log('[Goals] Removed goal locally:', id);
    } catch (err) {
      console.error('[Goals] Error removing goal locally:', err);
    }
  }, []);

  const deactivateAllLocally = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
      const currentGoals: Goal[] = stored ? JSON.parse(stored) : [];
      const updated = currentGoals.map(g => ({
        ...g,
        isActive: false,
        updatedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(updated));
      console.log('[Goals] All local goals deactivated');
    } catch (err) {
      console.error('[Goals] Error deactivating local goals:', err);
    }
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'currentValue' | 'isActive'>) => {
    console.log('[Goals] Adding new goal:', goal);
    const now = new Date().toISOString();

    setGoals(prev => prev.map(g => ({ ...g, isActive: false })));

    const newGoal: Goal = {
      ...goal,
      id: `local_${Date.now()}`,
      currentValue: goal.type === 'conditioning' ? 0 : goal.startValue,
      weekStartDate: goal.type === 'conditioning' ? now : undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    setGoals(prev => [newGoal, ...prev.map(g => ({ ...g, isActive: false }))]);
    await deactivateAllLocally();
    await saveGoalLocally(newGoal);
    console.log('[Goals] Optimistic update + immediate local save for:', newGoal.id);

    if (canAttemptSupabase) {
      try {
        const { error: deactivateError } = await supabase
          .from('goals')
          .update({ is_active: false, updated_at: now })
          .eq('user_id', userId!)
          .eq('dog_id', dogId!);

        if (deactivateError) {
          if (isNetworkError(deactivateError)) {
            console.log('[Goals] Offline: deactivation already saved locally');
          } else {
            console.error('[Goals] Error deactivating goals:', deactivateError);
          }
        }

        const dbGoal = {
          user_id: userId,
          dog_id: dogId,
          type: newGoal.type,
          direction: newGoal.direction || null,
          name: newGoal.name,
          target_value: newGoal.targetValue,
          start_value: newGoal.startValue,
          current_value: newGoal.currentValue,
          unit: newGoal.unit,
          weekly_target: newGoal.weeklyTarget || null,
          week_start_date: newGoal.weekStartDate || null,
          is_active: newGoal.isActive,
          created_at: newGoal.createdAt,
          updated_at: newGoal.updatedAt,
        };

        const { data, error } = await supabase
          .from('goals')
          .insert(dbGoal)
          .select()
          .single();

        if (error) {
          if (isNetworkError(error)) {
            console.log('[Goals] Offline: goal already saved locally:', newGoal.id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Goals] Supabase insert failed, local fallback already persisted:', JSON.stringify(error, null, 2));
          }
          setHasUnsyncedChanges(true);
        } else {
          console.log('[Goals] Supabase insert succeeded:', data.id);
          const mapped = mapDbGoalToGoal(data);
          setGoals(prev => prev.map(g => g.id === newGoal.id ? mapped : g));
          queryClient.invalidateQueries({ queryKey: ['goals', 'supabase', userId, dogId] });
        }
      } catch (err) {
        if (isNetworkError(err)) {
          console.log('[Goals] Offline: goal already saved locally:', newGoal.id);
          setOfflineNotice(getOfflineMessage());
        } else {
          console.error('[Goals] Unexpected error adding goal:', err);
        }
        setHasUnsyncedChanges(true);
      }
    }
  }, [canAttemptSupabase, userId, dogId, saveGoalLocally, deactivateAllLocally, queryClient]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    console.log('[Goals] Updating goal:', id, updates);
    const updatedAt = new Date().toISOString();
    const current = goals.find(g => g.id === id);
    const updated = current ? { ...current, ...updates, updatedAt } : null;

    setGoals(prev =>
      prev.map(g => g.id === id ? { ...g, ...updates, updatedAt } : g)
    );
    if (updated) {
      saveGoalLocally(updated);
      console.log('[Goals] Optimistic update + immediate local save for:', id);
    }

    if (canAttemptSupabase) {
      const dbUpdates: Record<string, unknown> = {
        updated_at: updatedAt,
      };
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.direction !== undefined) dbUpdates.direction = updates.direction;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
      if (updates.startValue !== undefined) dbUpdates.start_value = updates.startValue;
      if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.weeklyTarget !== undefined) dbUpdates.weekly_target = updates.weeklyTarget;
      if (updates.weekStartDate !== undefined) dbUpdates.week_start_date = updates.weekStartDate;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      Promise.resolve(supabase
        .from('goals')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[Goals] Offline: update already saved locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[Goals] Supabase update failed, local fallback already persisted:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[Goals] Supabase update succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['goals', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[Goals] Offline: update already saved locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Goals] Unexpected update error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, goals, saveGoalLocally, queryClient]);

  const setActiveGoal = useCallback(async (id: string) => {
    console.log('[Goals] Setting active goal:', id);
    const now = new Date().toISOString();

    setGoals(prev =>
      prev.map(g => ({ ...g, isActive: g.id === id, updatedAt: now }))
    );
    await deactivateAllLocally();
    const match = goals.find(g => g.id === id);
    if (match) {
      await saveGoalLocally({ ...match, isActive: true, updatedAt: now });
    }
    console.log('[Goals] Optimistic update + immediate local save for setActiveGoal:', id);

    if (canAttemptSupabase) {
      try {
        await supabase
          .from('goals')
          .update({ is_active: false, updated_at: now })
          .eq('user_id', userId!)
          .eq('dog_id', dogId!);

        const { error } = await supabase
          .from('goals')
          .update({ is_active: true, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId!);

        if (error) {
          if (isNetworkError(error)) {
            console.log('[Goals] Offline: active goal change already saved locally');
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Goals] Error setting active goal:', error);
          }
          setHasUnsyncedChanges(true);
        } else {
          queryClient.invalidateQueries({ queryKey: ['goals', 'supabase', userId, dogId] });
        }
      } catch (err) {
        if (isNetworkError(err)) {
          console.log('[Goals] Offline: active goal change already saved locally');
          setOfflineNotice(getOfflineMessage());
        } else {
          console.error('[Goals] Unexpected error setting active goal:', err);
        }
        setHasUnsyncedChanges(true);
      }
    }
  }, [canAttemptSupabase, userId, dogId, goals, deactivateAllLocally, saveGoalLocally, queryClient]);

  const deleteGoal = useCallback((id: string) => {
    console.log('[Goals] Deleting goal:', id);
    setGoals(prev => prev.filter(g => g.id !== id));
    removeGoalLocally(id);
    console.log('[Goals] Optimistic delete + immediate local removal for:', id);

    if (canAttemptSupabase) {
      Promise.resolve(supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!))
        .then(({ error }) => {
          if (error) {
            if (isNetworkError(error)) {
              console.log('[Goals] Offline: delete already applied locally:', id);
              setOfflineNotice(getOfflineMessage());
            } else {
              console.error('[Goals] Supabase delete failed:', JSON.stringify(error, null, 2));
            }
            setHasUnsyncedChanges(true);
          } else {
            console.log('[Goals] Supabase delete succeeded:', id);
            queryClient.invalidateQueries({ queryKey: ['goals', 'supabase', userId, dogId] });
          }
        })
        .catch((err: unknown) => {
          if (isNetworkError(err)) {
            console.log('[Goals] Offline: delete already applied locally:', id);
            setOfflineNotice(getOfflineMessage());
          } else {
            console.error('[Goals] Unexpected delete error:', err);
          }
          setHasUnsyncedChanges(true);
        });
    }
  }, [canAttemptSupabase, userId, dogId, removeGoalLocally, queryClient]);

  const updateGoalProgress = useCallback((id: string, newValue: number) => {
    console.log('[Goals] Updating goal progress:', id, newValue);
    updateGoal(id, { currentValue: newValue });
  }, [updateGoal]);

  const getGoalProgress = useCallback((goal: Goal) => {
    if (goal.type === 'conditioning') {
      const weeklyTarget = goal.weeklyTarget || goal.targetValue;
      const percentage = weeklyTarget > 0 ? (goal.currentValue / weeklyTarget) * 100 : 0;
      return Math.min(Math.max(percentage, 0), 100);
    }
    const range = Math.abs(goal.targetValue - goal.startValue);
    const progress = Math.abs(goal.currentValue - goal.startValue);
    const percentage = range > 0 ? (progress / range) * 100 : 0;
    return Math.min(Math.max(percentage, 0), 100);
  }, []);

  const getGoalStatus = useCallback((goal: Goal): 'on-track' | 'behind' | 'ahead' | 'completed' => {
    const progress = getGoalProgress(goal);
    if (progress >= 100) return 'completed';
    if (progress >= 75) return 'ahead';
    if (progress >= 40) return 'on-track';
    return 'behind';
  }, [getGoalProgress]);

  useEffect(() => {
    if (goals.length === 0) return;

    const now = new Date();
    const goalsToReset = goals.filter(goal => {
      if (goal.type === 'conditioning' && goal.weekStartDate) {
        const weekStart = new Date(goal.weekStartDate);
        const daysSinceStart = (now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceStart >= 7;
      }
      return false;
    });

    goalsToReset.forEach(goal => {
      console.log('[Goals] Resetting weekly conditioning goal:', goal.id);
      updateGoal(goal.id, {
        currentValue: 0,
        weekStartDate: now.toISOString(),
      });
    });
  }, [goals, updateGoal]);

  const activeGoal = useMemo(() => {
    return goals.find(g => g.isActive) || null;
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals.filter(g => getGoalProgress(g) >= 100);
  }, [goals, getGoalProgress]);

  const updateGoalsFromActivity = useCallback((trainingPoints: number, weight?: number) => {
    console.log('[Goals] Updating goals from activity - Training Points:', trainingPoints, 'Weight:', weight);

    goals.forEach(goal => {
      if (goal.type === 'conditioning') {
        console.log('[Goals] Updating conditioning goal:', goal.id, 'Adding points:', trainingPoints);
        updateGoal(goal.id, { currentValue: goal.currentValue + trainingPoints });
      }

      if (goal.type === 'weight' && weight !== undefined) {
        console.log('[Goals] Updating weight goal:', goal.id, 'New weight:', weight);
        updateGoal(goal.id, { currentValue: weight });
      }
    });
  }, [goals, updateGoal]);

  const backupToSupabase = useCallback(async () => {
    if (!isLoggedIn || !userId || !dogId) {
      console.log('[Goals] Cannot backup: not logged in or no dog');
      return;
    }

    console.log('[Goals] Starting manual backup of goals');
    setBackupStatus('uploading');
    let hasPartialFailure = false;

    try {
      const storedGoals = await AsyncStorage.getItem(LOCAL_GOALS_KEY);
      if (storedGoals) {
        const localGoals: Goal[] = JSON.parse(storedGoals);

        if (localGoals.length > 0) {
          console.log('[Goals] Backing up', localGoals.length, 'local goals');
          for (const goal of localGoals) {
            try {
              const now = new Date().toISOString();
              const goalData = {
                user_id: userId,
                dog_id: dogId,
                type: goal.type,
                direction: goal.direction || null,
                name: goal.name,
                target_value: goal.targetValue,
                start_value: goal.startValue,
                current_value: goal.currentValue,
                unit: goal.unit,
                weekly_target: goal.weeklyTarget || null,
                week_start_date: goal.weekStartDate || null,
                is_active: goal.isActive,
                created_at: goal.createdAt || now,
                updated_at: goal.updatedAt || now,
              };

              const isLocalId = goal.id.startsWith('local_');
              if (isLocalId) {
                const { error } = await supabase.from('goals').insert(goalData);
                if (error) {
                  console.error('[Goals] Backup insert error:', goal.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              } else {
                const { error } = await supabase
                  .from('goals')
                  .upsert({ id: goal.id, ...goalData }, { onConflict: 'id' });
                if (error) {
                  console.error('[Goals] Backup upsert error:', goal.id, JSON.stringify(error, null, 2));
                  hasPartialFailure = true;
                }
              }
            } catch (err) {
              console.error('[Goals] Backup error for goal:', goal.id, err);
              hasPartialFailure = true;
            }
          }
        }
      }

      if (hasPartialFailure) {
        console.log('[Goals] Backup completed with partial failures');
        setHasUnsyncedChanges(true);
        setBackupStatus('idle');
      } else {
        console.log('[Goals] Backup completed successfully');
        setHasUnsyncedChanges(false);
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 2000);
      }

      queryClient.invalidateQueries({ queryKey: ['goals', 'supabase', userId, dogId] });
    } catch (error) {
      console.error('[Goals] Unexpected backup error:', error);
      setHasUnsyncedChanges(true);
      setBackupStatus('idle');
    }
  }, [isLoggedIn, userId, dogId, queryClient]);

  const isLoading = useSupabase ? supabaseGoalsQuery.isLoading : localGoalsQuery.isLoading;
  const isSaving = false;

  return {
    goals,
    activeGoal,
    completedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    setActiveGoal,
    updateGoalProgress,
    updateGoalsFromActivity,
    getGoalProgress,
    getGoalStatus,
    isLoading,
    isSaving,
    hasUnsyncedChanges,
    backupStatus,
    backupToSupabase,
    offlineNotice,
  };
});
