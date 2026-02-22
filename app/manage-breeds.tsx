import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Alert, ScrollView, Platform } from "react-native";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, Check } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { useBreedAnalysis } from "@/contexts/BreedAnalysisContext";
import { BreedInfo } from "@/types/dog";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkIsOnline } from '@/utils/networkHelper';

interface BreedComponent {
  id: string;
  name: string;
  percentage: number;
}

export default function ManageBreedsScreen() {
  const { profile, updateProfile } = useDogProfile();
  const { generateAnalysis } = useBreedAnalysis();
  const params = useLocalSearchParams<{ source?: string; selectedBreed?: string; breedId?: string; mode?: string; draftData?: string; pendingState?: string }>();
  const initializedRef = useRef(false);
  const isDraftMode = params.mode === 'draft';
  
  const [breedComposition, setBreedComposition] = useState<BreedComponent[]>([]);

  useEffect(() => {
    if (!initializedRef.current) {
      console.log('[ManageBreeds] Initializing breeds once');
      console.log('[ManageBreeds] isDraftMode:', isDraftMode);
      console.log('[ManageBreeds] Params:', { selectedBreed: params.selectedBreed, breedId: params.breedId });
      
      let initialComposition: BreedComponent[] = [];
      
      if (params.pendingState) {
        try {
          console.log('[ManageBreeds] Restoring from pending state');
          initialComposition = JSON.parse(params.pendingState);
        } catch (e) {
          console.error('[ManageBreeds] Failed to parse pending state:', e);
        }
      }
      
      if (initialComposition.length === 0) {
        if (profile?.breedMakeup && profile.breedMakeup.length > 0) {
          console.log('[ManageBreeds] Loading from profile:', profile.breedMakeup);
          initialComposition = profile.breedMakeup.map((b, idx) => ({
            id: `${idx + 1}`,
            name: b.breedName,
            percentage: b.percentage,
          }));
        } else {
          console.log('[ManageBreeds] Starting with empty composition');
          initialComposition = [{
            id: '1',
            name: '',
            percentage: 100,
          }];
        }
      }
      
      if (params.selectedBreed && params.breedId) {
        const breedIdNum = parseInt(params.breedId);
        const existingIndex = initialComposition.findIndex(b => b.id === params.breedId);
        
        if (existingIndex >= 0) {
          console.log('[ManageBreeds] Updating existing breed slot:', params.breedId);
          initialComposition[existingIndex].name = params.selectedBreed;
        } else if (breedIdNum > initialComposition.length && breedIdNum <= 4) {
          console.log('[ManageBreeds] Adding new breed slot for id:', params.breedId);
          const currentTotal = initialComposition.reduce((sum, b) => sum + b.percentage, 0);
          const remaining = Math.max(0, 100 - currentTotal);
          
          while (initialComposition.length < breedIdNum - 1) {
            initialComposition.push({
              id: `${initialComposition.length + 1}`,
              name: '',
              percentage: 0,
            });
          }
          
          initialComposition.push({
            id: params.breedId,
            name: params.selectedBreed,
            percentage: remaining,
          });
        }
      }
      
      setBreedComposition(initialComposition);
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.selectedBreed && params.breedId && initializedRef.current) {
      console.log('[ManageBreeds] Updating breed after init:', params.breedId, 'with:', params.selectedBreed);
      setBreedComposition(prev => {
        const existingIndex = prev.findIndex(b => b.id === params.breedId);
        
        if (existingIndex >= 0) {
          return prev.map(b => 
            b.id === params.breedId 
              ? { ...b, name: params.selectedBreed! }
              : b
          );
        }
        
        const breedIdNum = parseInt(params.breedId!);
        if (breedIdNum > prev.length && breedIdNum <= 4) {
          const currentTotal = prev.reduce((sum, b) => sum + b.percentage, 0);
          const remaining = Math.max(0, 100 - currentTotal);
          const newComposition = [...prev];
          
          while (newComposition.length < breedIdNum - 1) {
            newComposition.push({
              id: `${newComposition.length + 1}`,
              name: '',
              percentage: 0,
            });
          }
          
          newComposition.push({
            id: params.breedId!,
            name: params.selectedBreed!,
            percentage: remaining,
          });
          
          return newComposition;
        }
        
        return prev;
      });
    }
  }, [params.selectedBreed, params.breedId]);

  const getTotalPercentage = () => {
    return breedComposition.reduce((sum, b) => sum + b.percentage, 0);
  };

  const addBreed = () => {
    if (breedComposition.length >= 4) {
      Alert.alert('Limit Reached', 'Maximum 4 breed components allowed');
      return;
    }
    
    setBreedComposition(prev => {
      const remaining = 100 - prev.reduce((sum, b) => sum + b.percentage, 0);
      const newId = (prev.length + 1).toString();
      return [...prev, {
        id: newId,
        name: '',
        percentage: Math.max(0, remaining),
      }];
    });
  };

  const getBreedLabel = (index: number) => {
    if (index === 0) return 'Primary';
    if (index === 1) return 'Secondary';
    if (index === 2) return 'Other (Slot 3)';
    return 'Other (Slot 4)';
  };

  const removeBreed = (id: string) => {
    if (breedComposition.length <= 1) {
      Alert.alert('Required', 'At least one breed component is required');
      return;
    }
    setBreedComposition(prev => prev.filter(b => b.id !== id));
  };

  const updateBreedPercentage = (id: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, Math.min(100, parseInt(value) || 0));
    setBreedComposition(prev => prev.map(b => 
      b.id === id ? { ...b, percentage: numValue } : b
    ));
  };

  const handleApplyComposition = async () => {
    for (const breed of breedComposition) {
      if (!breed.name.trim()) {
        Alert.alert('Required', 'Please select a breed for all entries');
        return;
      }
      if (breed.percentage <= 0) {
        Alert.alert('Invalid', 'All percentages must be greater than 0');
        return;
      }
    }

    const total = getTotalPercentage();
    if (total !== 100) {
      Alert.alert('Validation Error', `Percentages must total 100%. Current total: ${total}%`);
      return;
    }

    if (!profile) {
      Alert.alert('Error', 'No profile found');
      return;
    }

    const breedMakeup: BreedInfo[] = breedComposition.map(b => ({
      breedName: b.name,
      percentage: b.percentage,
      isUnknown: b.name === 'Other',
      traits: [],
      strengths: [],
      risks: [],
      conditioningNeeds: '',
    }));

    const updatedProfile = {
      ...profile,
      breedMakeup,
    };

    console.log('[ManageBreeds] Applying breeds:', breedMakeup);
    console.log('[ManageBreeds] Source:', params.source);
    updateProfile(updatedProfile);
    
    try {
      await AsyncStorage.removeItem('@canine_intelligence:breed_analyses');
      console.log('[ManageBreeds] Cleared breed analyses cache');
    } catch (error) {
      console.log('[ManageBreeds] Error clearing analyses:', error);
    }
    
    const breedParams = breedMakeup.map(b => ({ 
      name: b.breedName, 
      percentage: b.percentage,
      isUnknown: b.isUnknown 
    }));

    const online = await checkIsOnline();
    if (online) {
      console.log('[ManageBreeds] Online: triggering new analysis generation');
      generateAnalysis(breedParams);
    } else {
      console.log('[ManageBreeds] Offline: skipping analysis generation, will retry when connected');
    }
    
    setTimeout(() => {
      const targetRoute = params.source === 'intelligence' ? '/(tabs)/intelligence' : '/(tabs)/profile';
      console.log('[ManageBreeds] Navigating to:', targetRoute);
      router.replace(targetRoute);
    }, 300);
  };

  const handleCancel = () => {
    console.log('[ManageBreeds] Navigating back');
    router.back();
  };

  const handleSave = handleApplyComposition;

  const totalPercentage = getTotalPercentage();
  const isValid = totalPercentage === 100;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: isDraftMode ? 'Adjust Breed Composition' : 'Breed Composition',
          headerShown: true,
          headerRight: () => (
            !isDraftMode ? (
              <Pressable onPress={handleSave} disabled={!isValid}>
                <Check size={24} color={isValid ? Colors.dark.success : Colors.dark.textTertiary} />
              </Pressable>
            ) : null
          )
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Define breed percentages for {profile?.name}. Total must equal 100%.
          </Text>
          <View style={[
            styles.totalBadge,
            isValid ? styles.totalBadgeValid : styles.totalBadgeInvalid
          ]}>
            <Text style={[
              styles.totalBadgeText,
              isValid ? styles.totalBadgeTextValid : styles.totalBadgeTextInvalid
            ]}>
              Total: {totalPercentage}%
            </Text>
          </View>
        </View>

        {breedComposition.map((breed, index) => (
          <View key={breed.id} style={styles.breedCard}>
            <View style={styles.breedHeader}>
              <Text style={styles.breedLabel}>{getBreedLabel(index)}</Text>
              {breedComposition.length > 1 && (
                <Pressable onPress={() => removeBreed(breed.id)}>
                  <Trash2 size={20} color={Colors.dark.error} />
                </Pressable>
              )}
            </View>

            <Pressable
              style={styles.selectButton}
              onPress={() => router.push({
                pathname: '/select-breed',
                params: { 
                  mode: 'manage',
                  breedId: breed.id,
                  current: breed.name,
                  source: params.source,
                  pendingState: JSON.stringify(breedComposition)
                }
              })}
            >
              <Text style={[
                styles.selectButtonText,
                !breed.name && styles.selectButtonPlaceholder
              ]}>
                {breed.name || 'Select breed'}
              </Text>
            </Pressable>

            <View style={styles.percentageContainer}>
              <View style={styles.percentageRow}>
                <Text style={styles.percentageLabel}>Percentage:</Text>
                <View style={styles.percentageInputWrapper}>
                  <View style={styles.percentageInputContainer}>
                    <TextInput
                      style={styles.percentageInput}
                      value={breed.percentage.toString()}
                      onChangeText={(value) => updateBreedPercentage(breed.id, value)}
                      placeholder="0"
                      placeholderTextColor={Colors.dark.textTertiary}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={styles.percentageSymbol}>%</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}

        {breedComposition.length < 4 && (
          <Pressable style={styles.addButton} onPress={addBreed}>
            <Plus size={20} color={Colors.dark.primary} />
            <Text style={styles.addButtonText}>Add Breed Component</Text>
          </Pressable>
        )}

        {isDraftMode ? (
          <View style={styles.draftActions}>
            <Pressable 
              style={[styles.draftButton, styles.applyButton, !isValid && styles.draftButtonDisabled]}
              onPress={handleApplyComposition}
              disabled={!isValid}
            >
              <Text style={styles.applyButtonText}>Apply Composition</Text>
            </Pressable>
            <Pressable 
              style={[styles.draftButton, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Select &apos;Other&apos; if you suspect additional breeds or mixed ancestry. This helps build a more accurate picture of your dog.
            </Text>
          </View>
        )}
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
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  totalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  totalBadgeValid: {
    backgroundColor: Colors.dark.success + '20',
    borderColor: Colors.dark.success,
  },
  totalBadgeInvalid: {
    backgroundColor: Colors.dark.error + '20',
    borderColor: Colors.dark.error,
  },
  totalBadgeText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  totalBadgeTextValid: {
    color: Colors.dark.success,
  },
  totalBadgeTextInvalid: {
    color: Colors.dark.error,
  },
  breedCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  breedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breedLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  selectButton: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  selectButtonPlaceholder: {
    color: Colors.dark.textTertiary,
  },
  percentageContainer: {
    width: '100%',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentageLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  percentageInputWrapper: {
    maxWidth: '45%',
    minWidth: 100,
  },
  percentageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  percentageInput: {
    fontSize: 16,
    color: Colors.dark.text,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
    minWidth: 50,
    width: 50,
  },
  percentageSymbol: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginLeft: 4,
  },
  addButton: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    borderStyle: 'dashed' as const,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  infoBox: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  draftActions: {
    marginHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  draftButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButton: {
    backgroundColor: Colors.dark.primary,
  },
  draftButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  cancelButton: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
});
