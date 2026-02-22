import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useDogProfile } from '@/contexts/DogProfileContext';
import { useActivities } from '@/contexts/ActivityContext';
import { BREED_DRIVE_DATA, DriveLevel, BASE_MINIMUM_POINTS, calculateBreedRecommendation } from '@/constants/breedDrive';

const COACH_SETTINGS_KEY = '@canine_intelligence:coach_settings';

export type CoachingStyle = 'lower' | 'balanced' | 'upper';
export type ActivityIntensity = 'low' | 'moderate' | 'high';

export interface CoachActivity {
  id: string;
  name: string;
  duration: number;
  intensity: ActivityIntensity;
  reasoning: string;
  isRecoveryDay: boolean;
}

export interface CoachSettings {
  coachingStyle: CoachingStyle;
  activityPreferences: string[];
  weekdayAvailability: 'morning' | 'evening' | 'both';
  weekendAvailability: 'flexible' | 'limited';
  weatherSensitivity: 'low' | 'moderate' | 'high';
  feedbackLevel: 'easy' | 'right' | 'demanding';
}

export interface AlternativeActivity {
  id: string;
  name: string;
  duration: number;
  intensity: ActivityIntensity;
}

const DEFAULT_SETTINGS: CoachSettings = {
  coachingStyle: 'balanced',
  activityPreferences: ['Walks', 'Mental enrichment'],
  weekdayAvailability: 'both',
  weekendAvailability: 'flexible',
  weatherSensitivity: 'moderate',
  feedbackLevel: 'right',
};

const ALTERNATIVE_ACTIVITIES: AlternativeActivity[] = [
  { id: 'walk', name: 'Walk', duration: 30, intensity: 'moderate' },
  { id: 'play', name: 'Play Session', duration: 20, intensity: 'moderate' },
  { id: 'training', name: 'Training Drill', duration: 15, intensity: 'moderate' },
  { id: 'sniff', name: 'Sniff Walk', duration: 25, intensity: 'low' },
];

const LARGE_BREEDS = [
  'Akita', 'Alaskan Malamute', 'Bernese Mountain Dog', 'Bullmastiff',
  'Cane Corso', 'Doberman Pinscher', 'Dogo Argentino', 'German Shepherd',
  'Giant Schnauzer', 'Golden Retriever', 'Great Dane', 'Great Pyrenees',
  'Irish Wolfhound', 'Labrador Retriever', 'Mastiff', 'Newfoundland',
  'Rhodesian Ridgeback', 'Rottweiler', 'Saint Bernard', 'Weimaraner',
];

export const [CoachProvider, useCoach] = createContextHook(() => {
  const { profile } = useDogProfile();
  const { getWeekActivities } = useActivities();
  const [settings, setSettings] = useState<CoachSettings>(DEFAULT_SETTINGS);
  const [markedAsDone, setMarkedAsDone] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeActivity | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['coachSettings'],
    queryFn: async () => {
      try {
        console.log('[Coach] Loading settings from AsyncStorage...');
        const stored = await AsyncStorage.getItem(COACH_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[Coach] Settings loaded:', parsed);
          return parsed as CoachSettings;
        }
        console.log('[Coach] No stored settings found, using defaults');
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.error('[Coach] Error loading settings:', error);
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: CoachSettings) => {
      try {
        console.log('[Coach] Saving settings:', newSettings);
        await AsyncStorage.setItem(COACH_SETTINGS_KEY, JSON.stringify(newSettings));
        return newSettings;
      } catch (error) {
        console.error('[Coach] Error saving settings:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setSettings(data);
      queryClient.invalidateQueries({ queryKey: ['coachSettings'] });
    },
  });

  const updateCoachingStyle = (style: CoachingStyle) => {
    const newSettings = { ...settings, coachingStyle: style };
    setSettings(newSettings);
  };

  const updateSettings = (updates: Partial<CoachSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
  };

  const saveAllSettings = async () => {
    console.log('[Coach] Saving all settings:', settings);
    return saveSettingsMutation.mutateAsync(settings);
  };

  const isRecoveryDay = useMemo(() => {
    const weekActivities = getWeekActivities;
    if (weekActivities.length === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayActivities = weekActivities.filter(a => {
      const actDate = new Date(a.activityDate || a.date);
      actDate.setHours(0, 0, 0, 0);
      return actDate.getTime() === yesterday.getTime();
    });
    
    const hadHighIntensityYesterday = yesterdayActivities.some(a => a.effort === 'high');
    const totalMinutesYesterday = yesterdayActivities.reduce((sum, a) => sum + a.duration, 0);
    
    return hadHighIntensityYesterday || totalMinutesYesterday >= 60;
  }, [getWeekActivities]);

  const getBreedEnergyLevel = useCallback((): DriveLevel => {
    if (!profile?.breedMakeup || profile.breedMakeup.length === 0) {
      return 'medium';
    }

    let totalWeight = 0;
    let weightedDriveScore = 0;

    for (const breed of profile.breedMakeup) {
      const driveLevel = BREED_DRIVE_DATA[breed.breedName] || 'medium';
      const weight = breed.percentage / 100;
      
      let driveScore = 1.5;
      if (driveLevel === 'low') driveScore = 1.0;
      if (driveLevel === 'high') driveScore = 2.0;
      
      weightedDriveScore += driveScore * weight;
      totalWeight += weight;
    }

    const avgScore = totalWeight > 0 ? weightedDriveScore / totalWeight : 1.5;
    
    if (avgScore < 1.3) return 'low';
    if (avgScore < 1.7) return 'medium';
    return 'high';
  }, [profile?.breedMakeup]);

  const isLargeBreed = useCallback((): boolean => {
    if (!profile?.breedMakeup || profile.breedMakeup.length === 0) {
      return false;
    }
    return profile.breedMakeup.some(breed => 
      LARGE_BREEDS.includes(breed.breedName) && breed.percentage >= 50
    );
  }, [profile?.breedMakeup]);

  const calculateDuration = useCallback((baseDuration: number): number => {
    let duration = baseDuration;
    
    if (isLargeBreed()) {
      duration += 5;
    }
    
    const energyLevel = getBreedEnergyLevel();
    if (energyLevel === 'high') {
      duration = Math.round(duration * 1.1);
    }
    
    switch (settings.coachingStyle) {
      case 'lower':
        duration = Math.round(duration * 0.9);
        break;
      case 'upper':
        duration = Math.round(duration * 1.1);
        break;
    }
    
    return duration;
  }, [isLargeBreed, getBreedEnergyLevel, settings.coachingStyle]);

  const todayActivity = useMemo((): CoachActivity => {
    if (selectedAlternative) {
      const adjustedDuration = customDuration ?? calculateDuration(selectedAlternative.duration);
      return {
        id: selectedAlternative.id,
        name: selectedAlternative.name,
        duration: adjustedDuration,
        intensity: selectedAlternative.intensity,
        reasoning: `Alternative activity selected. ${getReasoningForActivity(selectedAlternative.name, selectedAlternative.intensity)}`,
        isRecoveryDay: isRecoveryDay,
      };
    }

    if (isRecoveryDay) {
      const baseDuration = 25;
      const adjustedDuration = customDuration ?? Math.max(20, calculateDuration(baseDuration));
      return {
        id: 'recovery-walk',
        name: 'Recovery Walk',
        duration: Math.min(adjustedDuration, 30),
        intensity: 'low',
        reasoning: 'Supports recovery while maintaining daily movement. Low-intensity activity helps circulation and prevents stiffness after more demanding sessions.',
        isRecoveryDay: true,
      };
    }

    const baseDuration = 30;
    const adjustedDuration = customDuration ?? calculateDuration(baseDuration);
    const energyLevel = getBreedEnergyLevel();
    
    let reasoning = 'Balanced conditioning session to maintain fitness and mental stimulation.';
    if (energyLevel === 'high') {
      reasoning = 'Your dog\'s breed composition suggests higher energy levels. This moderate activity helps channel that energy constructively.';
    } else if (energyLevel === 'low') {
      reasoning = 'A gentle, sustainable pace suited to your dog\'s natural energy profile. Focus on consistency over intensity.';
    }
    
    return {
      id: 'moderate-walk',
      name: 'Moderate Walk',
      duration: adjustedDuration,
      intensity: 'moderate',
      reasoning,
      isRecoveryDay: false,
    };
  }, [isRecoveryDay, selectedAlternative, customDuration, calculateDuration, getBreedEnergyLevel]);

  const getReasoningForActivity = (activityName: string, intensity: ActivityIntensity): string => {
    const reasonings: Record<string, string> = {
      'Walk': 'A classic activity that provides physical exercise and mental enrichment through environmental exploration.',
      'Play Session': 'Interactive play strengthens the bond with your dog while providing bursts of activity.',
      'Training Drill': 'Mental stimulation combined with physical movement. Training sessions build focus and reinforce good behaviors.',
      'Sniff Walk': 'Low-intensity exploration that prioritizes mental enrichment. Sniffing is naturally calming and satisfying for dogs.',
    };
    return reasonings[activityName] || 'A beneficial activity for your dog\'s overall wellness.';
  };

  const weeklyBaselinePoints = BASE_MINIMUM_POINTS;

  const breedRecommendation = useMemo(() => {
    return calculateBreedRecommendation(profile?.breedMakeup);
  }, [profile?.breedMakeup]);
  
  const breedMidpointTarget = useMemo(() => {
    const { recommendedMin, recommendedMax } = breedRecommendation;
    const midpoint = Math.round((recommendedMin + recommendedMax) / 2);
    
    switch (settings.coachingStyle) {
      case 'lower':
        return recommendedMin;
      case 'upper':
        return recommendedMax;
      default:
        return midpoint;
    }
  }, [breedRecommendation, settings.coachingStyle]);

  const getCoachingStyleDescription = useCallback((style: CoachingStyle): string => {
    switch (style) {
      case 'lower':
        return 'Maintains health with minimal load';
      case 'upper':
        return 'Targets peak conditioning for high performance';
      default:
        return 'Supports optimal, consistent conditioning';
    }
  }, []);

  const markActivityAsDone = () => {
    console.log('[Coach] Marking activity as done');
    setMarkedAsDone(true);
  };

  const resetDailyState = () => {
    setMarkedAsDone(false);
    setSelectedAlternative(null);
    setCustomDuration(null);
    setShowAlternatives(false);
  };

  const selectAlternative = (alternative: AlternativeActivity) => {
    console.log('[Coach] Selected alternative:', alternative);
    setSelectedAlternative(alternative);
    setShowAlternatives(false);
    setMarkedAsDone(false);
  };

  const updateCustomDuration = (duration: number) => {
    setCustomDuration(duration);
    setMarkedAsDone(false);
  };

  const toggleAlternatives = () => {
    setShowAlternatives(!showAlternatives);
  };

  const alternatives = useMemo(() => {
    return ALTERNATIVE_ACTIVITIES.map(alt => ({
      ...alt,
      duration: calculateDuration(alt.duration),
    }));
  }, [calculateDuration]);

  return {
    settings,
    updateCoachingStyle,
    updateSettings,
    saveAllSettings,
    todayActivity,
    isRecoveryDay,
    markedAsDone,
    markActivityAsDone,
    alternatives,
    showAlternatives,
    toggleAlternatives,
    selectAlternative,
    selectedAlternative,
    customDuration,
    updateCustomDuration,
    resetDailyState,
    weeklyBaselinePoints,
    breedMidpointTarget,
    breedRecommendation,
    getCoachingStyleDescription,
    isLoading: settingsQuery.isLoading,
    isSaving: saveSettingsMutation.isPending,
  };
});
