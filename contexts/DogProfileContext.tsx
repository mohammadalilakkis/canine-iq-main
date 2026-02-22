import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { v4 as uuidv4 } from 'uuid';
import { DogProfile, BreedInfo, Activity, HealthNote } from '@/types/dog';
import { supabase, DbDog, DbBreedComponent } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { isNetworkError, getOfflineMessage, checkIsOnline } from '@/utils/networkHelper';

const LOCAL_PROFILE_KEY = '@canine_iq_dog_profile';
const LOCAL_ACTIVITIES_KEY = '@canine_iq_activities';
const LOCAL_HEALTH_NOTES_KEY = '@canine_iq_health_notes';
const PENDING_BREED_ANALYSIS_KEY = '@canine_iq_pending_breed_analysis';

const mapDbDogToProfile = (dog: DbDog, breedComponents: DbBreedComponent[]): DogProfile => {
  const breedMakeup: BreedInfo[] = breedComponents.map(bc => ({
    breedName: bc.breed_name,
    percentage: bc.percentage,
    traits: bc.traits || [],
    strengths: bc.strengths || [],
    risks: bc.risks || [],
    conditioningNeeds: bc.conditioning_needs || '',
    isUnknown: bc.is_unknown,
  }));

  return {
    id: dog.id,
    name: dog.name,
    age: dog.age,
    sex: dog.sex,
    weight: dog.weight,
    preferredWeightUnit: dog.preferred_weight_unit,
    profileImageBase64: dog.profile_image_base64,
    breedMakeup: breedMakeup.length > 0 ? breedMakeup : undefined,
    createdAt: dog.created_at,
  };
};

type DataSource = 'local' | 'supabase';

export const [DogProfileProvider, useDogProfile] = createContextHook(() => {
  const { userId, isLoggedIn, authRefreshTrigger } = useAuth();
  const [profile, setProfile] = useState<DogProfile | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>('local');
  const [isEvaluatingSource, setIsEvaluatingSource] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [pendingBreedAnalysis, setPendingBreedAnalysis] = useState(false);
  const lastBreedChangeRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    AsyncStorage.getItem(PENDING_BREED_ANALYSIS_KEY).then(val => {
      if (val === 'true') setPendingBreedAnalysis(true);
    });
  }, []);

  const localProfileQuery = useQuery({
    queryKey: ['dogProfile', 'local', authRefreshTrigger],
    queryFn: async () => {
      try {
        console.log('[DogProfile] Loading profile from local storage');
        const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as DogProfile;
          console.log('[DogProfile] Local profile loaded:', {
            name: parsed.name,
            hasImage: !!parsed.profileImageBase64,
            breedCount: parsed.breedMakeup?.length || 0,
          });
          return parsed;
        }
        console.log('[DogProfile] No local profile found');
        return null;
      } catch (error) {
        console.error('[DogProfile] Error loading local profile:', error);
        return null;
      }
    },
    staleTime: Infinity,
  });

  const supabaseProfileQuery = useQuery({
    queryKey: ['dogProfile', 'supabase', userId, authRefreshTrigger],
    queryFn: async () => {
      if (!userId) {
        console.log('[DogProfile] No user ID, returning null');
        return null;
      }

      const online = await checkIsOnline();
      if (!online) {
        console.log('[DogProfile] Offline, returning local profile as fallback');
        try {
          const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
          return stored ? JSON.parse(stored) as DogProfile : null;
        } catch {
          return null;
        }
      }

      try {
        console.log('[DogProfile] Loading profile from Supabase for user:', userId);
        
        const { data: dogs, error: dogError } = await supabase
          .from('dogs')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        if (dogError) {
          console.error('[DogProfile] Error loading dog:', dogError);
          throw dogError;
        }

        if (!dogs || dogs.length === 0) {
          console.log('[DogProfile] No dog profile found in Supabase');
          return null;
        }

        const dog = dogs[0] as DbDog;

        const { data: breedComponents, error: breedError } = await supabase
          .from('breed_components')
          .select('*')
          .eq('dog_id', dog.id);

        if (breedError) {
          console.error('[DogProfile] Error loading breed components:', breedError);
        }

        const profile = mapDbDogToProfile(dog, breedComponents || []);
        console.log('[DogProfile] Supabase profile loaded:', {
          name: profile.name,
          hasImage: !!profile.profileImageBase64,
          breedCount: profile.breedMakeup?.length || 0,
        });

        return profile;
      } catch (error) {
        console.error('[DogProfile] Error loading profile:', error);
        return null;
      }
    },
    enabled: !!userId && isLoggedIn,
    staleTime: Infinity,
  });

  const saveLocalProfileMutation = useMutation({
    mutationFn: async (newProfile: DogProfile) => {
      try {
        console.log('[DogProfile] Saving profile to local storage:', {
          hasImage: !!newProfile.profileImageBase64,
          breedCount: newProfile.breedMakeup?.length || 0,
        });

        const profileToSave = {
          ...newProfile,
          id: newProfile.id || uuidv4(),
          createdAt: newProfile.createdAt || new Date().toISOString(),
        };

        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profileToSave));
        console.log('[DogProfile] Local profile saved successfully');
        return profileToSave;
      } catch (error) {
        console.error('[DogProfile] Error saving local profile:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[DogProfile] Local profile saved, updating state');
      setProfile(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const saveSupabaseProfileMutation = useMutation({
    mutationFn: async (newProfile: DogProfile) => {
      if (!userId) {
        setHasUnsyncedChanges(true);
        throw new Error('User not authenticated');
      }

      try {
        console.log('[DogProfile] Saving profile to Supabase:', {
          hasImage: !!newProfile.profileImageBase64,
          breedCount: newProfile.breedMakeup?.length || 0,
        });

        const effectiveUserId = userId || uuidv4();
        
        const dogData = {
          user_id: effectiveUserId,
          name: newProfile.name,
          age: newProfile.age,
          sex: newProfile.sex,
          weight: newProfile.weight,
          preferred_weight_unit: newProfile.preferredWeightUnit,
          profile_image_base64: newProfile.profileImageBase64 || null,
          updated_at: new Date().toISOString(),
        };

        let dogId = newProfile.id;

        if (newProfile.id && newProfile.id !== 'new' && !newProfile.id.startsWith('local_')) {
          const { error: updateError } = await supabase
            .from('dogs')
            .update(dogData)
            .eq('id', newProfile.id)
            .eq('user_id', userId);

          if (updateError) {
            console.log('[DogProfile] Error updating dog:', updateError);
            throw updateError;
          }
        } else {
          const { data: insertedDog, error: insertError } = await supabase
            .from('dogs')
            .insert({
              ...dogData,
              created_at: newProfile.createdAt || new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.log('[DogProfile] Error inserting dog:', insertError);
            throw insertError;
          }

          dogId = insertedDog.id;
        }

        if (newProfile.breedMakeup && newProfile.breedMakeup.length > 0) {
          const { error: deleteError } = await supabase
            .from('breed_components')
            .delete()
            .eq('dog_id', dogId);

          if (deleteError) {
            console.log('[DogProfile] Error deleting old breed components:', deleteError);
          }

          const breedData = newProfile.breedMakeup.map(breed => ({
            dog_id: dogId,
            breed_name: breed.breedName,
            percentage: breed.percentage,
            traits: breed.traits || [],
            strengths: breed.strengths || [],
            risks: breed.risks || [],
            conditioning_needs: breed.conditioningNeeds || '',
            is_unknown: breed.isUnknown || false,
            created_at: new Date().toISOString(),
          }));

          const { error: breedInsertError } = await supabase
            .from('breed_components')
            .insert(breedData);

          if (breedInsertError) {
            console.log('[DogProfile] Error inserting breed components:', breedInsertError);
          }
        }

        console.log('[DogProfile] Supabase profile saved successfully');
        return { ...newProfile, id: dogId };
      } catch (error) {
        console.log('[DogProfile] Supabase save failed (may be offline):', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[DogProfile] Supabase profile saved, updating state');
      setProfile(data);
      queryClient.invalidateQueries({ queryKey: ['dogProfile', 'supabase', userId] });
      setSaveSuccess(true);
      setHasUnsyncedChanges(false);
      setBackupStatus('success');
      setTimeout(() => {
        setSaveSuccess(false);
        setBackupStatus('idle');
      }, 2000);
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        if (lastBreedChangeRef.current) {
          setPendingBreedAnalysis(true);
          AsyncStorage.setItem(PENDING_BREED_ANALYSIS_KEY, 'true');
          setOfflineNotice("Breed analysis will update automatically when you're back online.");
        } else {
          setOfflineNotice(getOfflineMessage());
        }
        console.log('[DogProfile] Offline: profile saved locally, will sync when connected');
      } else {
        console.log('[DogProfile] Supabase save error, marking as unsynced:', error);
      }
      setHasUnsyncedChanges(true);
      setBackupStatus('idle');
    },
  });

  useEffect(() => {
    const evaluateDataSource = async () => {
      console.log('[DogProfile] Evaluating data source...', {
        isLoggedIn,
        localLoading: localProfileQuery.isLoading,
        supabaseLoading: supabaseProfileQuery.isLoading,
        hasLocalData: !!localProfileQuery.data,
        hasSupabaseData: !!supabaseProfileQuery.data,
      });

      if (localProfileQuery.isLoading) {
        return;
      }

      if (!isLoggedIn) {
        console.log('[DogProfile] Not logged in, using LOCAL data source');
        setDataSource('local');
        setProfile(localProfileQuery.data ?? null);
        setIsHydrated(true);
        return;
      }

      if (supabaseProfileQuery.isLoading) {
        setIsEvaluatingSource(true);
        return;
      }

      setIsEvaluatingSource(false);

      if (supabaseProfileQuery.data) {
        console.log('[DogProfile] Logged in + Supabase has dog, using SUPABASE data source');
        setDataSource('supabase');
        setProfile(supabaseProfileQuery.data);
      } else {
        console.log('[DogProfile] Logged in but Supabase empty, using LOCAL data source (fallback)');
        setDataSource('local');
        setProfile(localProfileQuery.data ?? null);
        if (localProfileQuery.data) {
          console.log('[DogProfile] Local data exists but not in Supabase, marking as unsynced');
          setHasUnsyncedChanges(true);
        }
      }
      setIsHydrated(true);
    };

    evaluateDataSource();
  }, [
    isLoggedIn,
    localProfileQuery.data,
    localProfileQuery.isLoading,
    supabaseProfileQuery.data,
    supabaseProfileQuery.isLoading,
    authRefreshTrigger,
  ]);

  const saveLocalMutate = saveLocalProfileMutation.mutate;
  const saveSupabaseMutate = saveSupabaseProfileMutation.mutate;

  const updateProfile = useCallback((newProfile: DogProfile) => {
    const breedChanged = JSON.stringify(newProfile.breedMakeup) !== JSON.stringify(profile?.breedMakeup);
    lastBreedChangeRef.current = breedChanged;

    setProfile(newProfile);
    console.log('[DogProfile] Immediate UI update applied');

    saveLocalMutate(newProfile);
    console.log('[DogProfile] Local persistence triggered');

    if (dataSource === 'supabase' && isLoggedIn && userId) {
      console.log('[DogProfile] Saving to Supabase');
      saveSupabaseMutate(newProfile);
    }
  }, [dataSource, isLoggedIn, userId, profile, saveSupabaseMutate, saveLocalMutate]);

  const hasProfile = profile !== null;
  const isLoading = localProfileQuery.isLoading || (isLoggedIn && supabaseProfileQuery.isLoading) || isEvaluatingSource;
  const isSaving = dataSource === 'supabase' ? saveSupabaseProfileMutation.isPending : saveLocalProfileMutation.isPending;
  const rawSaveError = dataSource === 'supabase' ? saveSupabaseProfileMutation.error : saveLocalProfileMutation.error;
  const saveError = rawSaveError && !isNetworkError(rawSaveError) ? rawSaveError : null;

  const backupToSupabase = useCallback(async () => {
    if (!isLoggedIn) {
      console.log('[DogProfile] Cannot backup: not logged in');
      return;
    }

    const localProfile = await getLocalProfileInternal();
    if (!localProfile) {
      console.log('[DogProfile] Cannot backup: no local profile');
      return;
    }

    console.log('[DogProfile] Starting manual backup to Supabase');
    setBackupStatus('uploading');

    let hasPartialFailure = false;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        console.error('[DogProfile] Cannot backup: failed to get authenticated user', userError);
        setHasUnsyncedChanges(true);
        setBackupStatus('idle');
        return;
      }

      const authenticatedUserId = userData.user.id;
      const localDogId = localProfile.id;
      console.log('[DogProfile] Backup using authenticated user ID:', authenticatedUserId, 'local dog ID:', localDogId);

      const { data: existingDogs, error: fetchError } = await supabase
        .from('dogs')
        .select('id')
        .eq('user_id', authenticatedUserId)
        .limit(1);

      if (fetchError) {
        console.error('[DogProfile] Error checking existing dog:', fetchError);
        setHasUnsyncedChanges(true);
        setBackupStatus('idle');
        return;
      }

      const now = new Date().toISOString();
      const dogData = {
        user_id: authenticatedUserId,
        name: localProfile.name,
        age: localProfile.age,
        sex: localProfile.sex,
        weight: localProfile.weight,
        preferred_weight_unit: localProfile.preferredWeightUnit,
        profile_image_base64: localProfile.profileImageBase64 || null,
        updated_at: now,
      };

      let dogId: string;

      if (existingDogs && existingDogs.length > 0) {
        dogId = existingDogs[0].id;
        console.log('[DogProfile] Updating existing dog:', dogId);

        const { error: updateError } = await supabase
          .from('dogs')
          .update(dogData)
          .eq('id', dogId)
          .eq('user_id', authenticatedUserId);

        if (updateError) {
          console.error('[DogProfile] Error updating dog during backup:', updateError);
          setHasUnsyncedChanges(true);
          setBackupStatus('idle');
          return;
        }
      } else {
        console.log('[DogProfile] Inserting new dog for backup');

        const { data: insertedDog, error: insertError } = await supabase
          .from('dogs')
          .insert({
            ...dogData,
            created_at: localProfile.createdAt || now,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[DogProfile] Error inserting dog during backup:', insertError);
          setHasUnsyncedChanges(true);
          setBackupStatus('idle');
          return;
        }

        dogId = insertedDog.id;
      }

      // Backup breed composition
      if (localProfile.breedMakeup && localProfile.breedMakeup.length > 0) {
        console.log('[DogProfile] Backing up breed composition:', localProfile.breedMakeup.length, 'breeds');
        const { error: deleteError } = await supabase
          .from('breed_components')
          .delete()
          .eq('dog_id', dogId);

        if (deleteError) {
          console.error('[DogProfile] Error deleting old breed components during backup:', deleteError);
          hasPartialFailure = true;
        } else {
          const breedData = localProfile.breedMakeup.map(breed => ({
            dog_id: dogId,
            breed_name: breed.breedName,
            percentage: breed.percentage,
            traits: breed.traits || [],
            strengths: breed.strengths || [],
            risks: breed.risks || [],
            conditioning_needs: breed.conditioningNeeds || '',
            is_unknown: breed.isUnknown || false,
            created_at: now,
          }));

          const { error: breedInsertError } = await supabase
            .from('breed_components')
            .insert(breedData);

          if (breedInsertError) {
            console.error('[DogProfile] Error inserting breed components during backup:', breedInsertError);
            hasPartialFailure = true;
          } else {
            console.log('[DogProfile] Breed composition backed up successfully');
          }
        }
      }

      // Backup activities
      try {
        const localActivitiesRaw = await AsyncStorage.getItem(LOCAL_ACTIVITIES_KEY);
        if (localActivitiesRaw) {
          const localActivities: Activity[] = JSON.parse(localActivitiesRaw);
          const dogActivities = localActivities.filter(a => a.dogId === localDogId || a.dogId === dogId);
          
          if (dogActivities.length > 0) {
            console.log('[DogProfile] Backing up activities:', dogActivities.length, 'activities');
            
            for (const activity of dogActivities) {
              try {
                const activityData = {
                  user_id: authenticatedUserId,
                  dog_id: dogId,
                  type: activity.type,
                  duration: activity.duration,
                  effort: activity.effort,
                  training_points: activity.trainingPoints,
                  notes: activity.notes || null,
                  date: activity.date,
                  image_base64: activity.imageBase64 || null,
                  weight: activity.weight || null,
                  activity_date: activity.activityDate,
                  contributes_to_goal: activity.contributesToGoal || false,
                  edited_at: activity.editedAt || null,
                  created_at: activity.date || now,
                  updated_at: now,
                };

                const isLocalId = activity.id.startsWith('local_');
                
                if (isLocalId) {
                  const { error: insertError } = await supabase
                    .from('activities')
                    .insert(activityData);

                  if (insertError) {
                    console.error('[DogProfile] Error inserting activity:', activity.id, insertError);
                    hasPartialFailure = true;
                  }
                } else {
                  const { error: upsertError } = await supabase
                    .from('activities')
                    .upsert({
                      id: activity.id,
                      ...activityData,
                    }, { onConflict: 'id' });

                  if (upsertError) {
                    console.error('[DogProfile] Error upserting activity:', activity.id, upsertError);
                    hasPartialFailure = true;
                  }
                }
              } catch (activityError) {
                console.error('[DogProfile] Error processing activity:', activity.id, activityError);
                hasPartialFailure = true;
              }
            }
            console.log('[DogProfile] Activities backup completed');
          }
        }
      } catch (activitiesError) {
        console.error('[DogProfile] Error backing up activities:', activitiesError);
        hasPartialFailure = true;
      }

      // Backup health notes
      try {
        const localHealthNotesRaw = await AsyncStorage.getItem(LOCAL_HEALTH_NOTES_KEY);
        if (localHealthNotesRaw) {
          const localHealthNotes: HealthNote[] = JSON.parse(localHealthNotesRaw);
          const dogHealthNotes = localHealthNotes.filter(n => n.dogId === localDogId || n.dogId === dogId || !n.dogId);
          
          if (dogHealthNotes.length > 0) {
            console.log('[DogProfile] Backing up health notes:', dogHealthNotes.length, 'notes');
            
            for (const note of dogHealthNotes) {
              try {
                const noteData = {
                  user_id: authenticatedUserId,
                  dog_id: dogId,
                  text: note.text,
                  date: note.date,
                  weight_kg: note.weightKg || null,
                  edited_at: note.editedAt || null,
                  created_at: note.createdAt || now,
                };

                const isLocalId = note.id.startsWith('local_');
                
                if (isLocalId) {
                  const { error: insertError } = await supabase
                    .from('health_notes')
                    .insert(noteData);

                  if (insertError) {
                    console.error('[DogProfile] Error inserting health note:', note.id, insertError);
                    hasPartialFailure = true;
                  }
                } else {
                  const { error: upsertError } = await supabase
                    .from('health_notes')
                    .upsert({
                      id: note.id,
                      ...noteData,
                    }, { onConflict: 'id' });

                  if (upsertError) {
                    console.error('[DogProfile] Error upserting health note:', note.id, upsertError);
                    hasPartialFailure = true;
                  }
                }
              } catch (noteError) {
                console.error('[DogProfile] Error processing health note:', note.id, noteError);
                hasPartialFailure = true;
              }
            }
            console.log('[DogProfile] Health notes backup completed');
          }
        }
      } catch (healthNotesError) {
        console.error('[DogProfile] Error backing up health notes:', healthNotesError);
        hasPartialFailure = true;
      }

      console.log('[DogProfile] Backup to Supabase completed', hasPartialFailure ? 'with some failures' : 'successfully');
      setProfile({ ...localProfile, id: dogId });
      
      if (hasPartialFailure) {
        setHasUnsyncedChanges(true);
        setBackupStatus('idle');
      } else {
        setHasUnsyncedChanges(false);
        setBackupStatus('success');
      }
      
      setDataSource('supabase');
      queryClient.invalidateQueries({ queryKey: ['dogProfile', 'supabase', authenticatedUserId] });
      queryClient.invalidateQueries({ queryKey: ['activities', 'supabase', authenticatedUserId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['healthNotes', 'supabase', authenticatedUserId, dogId] });
      
      if (!hasPartialFailure) {
        setTimeout(() => setBackupStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('[DogProfile] Unexpected error during backup:', error);
      setHasUnsyncedChanges(true);
      setBackupStatus('idle');
    }
  }, [isLoggedIn, queryClient]);

  const getLocalProfileInternal = async (): Promise<DogProfile | null> => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const checkSupabaseHasDog = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data: dogs } = await supabase
        .from('dogs')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      return !!(dogs && dogs.length > 0);
    } catch {
      return false;
    }
  }, [userId]);

  const getLocalProfile = useCallback(async (): Promise<DogProfile | null> => {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const clearPendingBreedAnalysis = useCallback(async () => {
    setPendingBreedAnalysis(false);
    await AsyncStorage.removeItem(PENDING_BREED_ANALYSIS_KEY);
    console.log('[DogProfile] Cleared pendingBreedAnalysis flag');
  }, []);

  const localProfileExists = localProfileQuery.data !== null && localProfileQuery.data !== undefined;

  return {
    profile,
    updateProfile,
    hasProfile,
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    isHydrated,
    dataSource,
    checkSupabaseHasDog,
    getLocalProfile,
    hasUnsyncedChanges,
    backupStatus,
    backupToSupabase,
    localProfileExists,
    offlineNotice,
    pendingBreedAnalysis,
    clearPendingBreedAnalysis,
  };
});
