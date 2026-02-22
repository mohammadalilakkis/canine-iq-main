import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, Image, KeyboardAvoidingView, Platform } from "react-native";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from 'expo-router';
import { Camera, ChevronRight, Plus } from "lucide-react-native";

import Colors from "@/constants/colors";
import { DOG_BREEDS } from "@/constants/breeds";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { pickImageBase64 } from "@/utils/imageHelper";
import { BreedInfo, WeightUnit } from "@/types/dog";
import { formatWeightForDisplay, convertDisplayValue, parseWeightToKg } from "@/utils/weightUtils";

interface BreedComponent {
  id: string;
  name: string;
  percentage: number;
}

interface DraftProfile {
  name: string;
  age: string;
  weight: string;
  weightUnit: WeightUnit;
  sex: 'male' | 'female';
  photoBase64: string | null;
  breedComposition: BreedComponent[];
}



export default function EditProfileScreen() {
  const { profile, updateProfile, hasProfile } = useDogProfile();
  const initializedRef = useRef(false);
  
  const [draftProfile, setDraftProfile] = useState<DraftProfile>({
    name: '',
    age: '',
    weight: '',
    weightUnit: 'kg',
    sex: 'male',
    photoBase64: null,
    breedComposition: [
      { id: '1', name: '', percentage: 0 },
      { id: '2', name: '', percentage: 0 }
    ]
  });

  const [showBreedPicker, setShowBreedPicker] = useState<number | null>(null);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');



  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      if (hasProfile && profile) {
        console.log('[EditProfile] Initializing with existing profile, has image:', !!profile.profileImageBase64);
        const existingBreeds = profile.breedMakeup || [];
        const breedComposition: BreedComponent[] = existingBreeds.length > 0
          ? existingBreeds.map((b, idx) => ({ 
              id: `${idx + 1}`, 
              name: b.breedName, 
              percentage: b.percentage 
            }))
          : [
              { id: '1', name: '', percentage: 0 }, 
              { id: '2', name: '', percentage: 0 }
            ];
        
        const storedUnit = profile.preferredWeightUnit || 'kg';
        const displayWeight = formatWeightForDisplay(profile.weight, storedUnit);
        
        setDraftProfile({
          name: profile.name,
          age: profile.age.toString(),
          weight: displayWeight,
          weightUnit: storedUnit,
          sex: profile.sex,
          photoBase64: profile.profileImageBase64 || null,
          breedComposition
        });
      } else {
        console.log('[EditProfile] No existing profile, using default state for create mode');
      }
    }
  }, [hasProfile, profile]);

  const handlePickImage = async () => {
    const base64 = await pickImageBase64();
    if (base64) {
      console.log('[EditProfile] Image picked, length:', base64.length);
      setDraftProfile(prev => ({ ...prev, photoBase64: base64 }));
    }
  };







  const updateBreedComponent = (index: number, breedName: string) => {
    setDraftProfile(prev => {
      const newComposition = [...prev.breedComposition];
      newComposition[index] = { 
        ...newComposition[index], 
        name: breedName 
      };
      return { ...prev, breedComposition: newComposition };
    });
    setShowBreedPicker(null);
    setBreedSearchQuery('');
  };

  const handlePercentageChange = (slotIndex: number, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, Math.min(100, parseInt(value) || 0));
    setDraftProfile(prev => {
      const newComposition = [...prev.breedComposition];
      newComposition[slotIndex] = { ...newComposition[slotIndex], percentage: numValue };
      return { ...prev, breedComposition: newComposition };
    });
  };

  const handleAddBreed = () => {
    if (draftProfile.breedComposition.length >= 4) return;
    const newId = (draftProfile.breedComposition.length + 1).toString();
    setDraftProfile(prev => ({
      ...prev,
      breedComposition: [...prev.breedComposition, { id: newId, name: '', percentage: 0 }]
    }));
  };

  const handleRemoveBreed = (index: number) => {
    if (draftProfile.breedComposition.length <= 1) return;
    setDraftProfile(prev => ({
      ...prev,
      breedComposition: prev.breedComposition.filter((_, i) => i !== index)
    }));
  };

  const getBreedLabel = (index: number) => {
    if (index === 0) return 'Primary Breed';
    if (index === 1) return 'Secondary Breed';
    if (index === 2) return 'Other (Slot 3)';
    return 'Other (Slot 4)';
  };

  const getTotalPercentage = (): number => {
    return draftProfile.breedComposition.reduce((sum, breed) => sum + breed.percentage, 0);
  };

  const isPercentageValid = (): boolean => {
    return getTotalPercentage() === 100;
  };

  const handleSave = () => {
    if (!draftProfile.name.trim()) {
      Alert.alert('Required', 'Please enter your dog\'s name');
      return;
    }
    if (!draftProfile.age || isNaN(Number(draftProfile.age)) || Number(draftProfile.age) <= 0) {
      Alert.alert('Required', 'Please enter a valid age');
      return;
    }
    if (!draftProfile.weight || isNaN(Number(draftProfile.weight)) || Number(draftProfile.weight) <= 0) {
      Alert.alert('Required', 'Please enter a valid weight');
      return;
    }

    const hasAnyBreed = draftProfile.breedComposition.some(b => b.name && b.percentage > 0);
    if (hasAnyBreed && !isPercentageValid()) {
      Alert.alert('Invalid Percentages', 'Breed percentages must total exactly 100%');
      return;
    }

    const breedMakeup: BreedInfo[] = draftProfile.breedComposition
      .filter(b => b.name && b.percentage > 0)
      .map(b => ({
        breedName: b.name,
        percentage: b.percentage,
        isUnknown: b.name === 'Other',
        traits: [],
        strengths: [],
        risks: [],
        conditioningNeeds: '',
      }));

    const weightInKg = parseWeightToKg(draftProfile.weight, draftProfile.weightUnit);
    if (weightInKg === null) {
      Alert.alert('Required', 'Please enter a valid weight');
      return;
    }

    const savedProfile = {
      id: profile?.id || Date.now().toString(),
      name: draftProfile.name.trim(),
      age: Number(draftProfile.age),
      weight: weightInKg,
      preferredWeightUnit: draftProfile.weightUnit,
      sex: draftProfile.sex,
      profileImageBase64: draftProfile.photoBase64 || undefined,
      breedMakeup: breedMakeup.length > 0 ? breedMakeup : undefined,
      createdAt: profile?.createdAt || new Date().toISOString(),
    };

    console.log('[EditProfile] Saving profile with image:', {
      hasImage: !!savedProfile.profileImageBase64,
      imageLength: savedProfile.profileImageBase64?.length || 0
    });

    updateProfile(savedProfile);
    
    Alert.alert(
      'Success',
      'Profile saved successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          }
        }
      ]
    );
  };

  const totalPercentage = getTotalPercentage();
  const percentageValid = isPercentageValid();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: hasProfile ? 'Edit Profile' : 'Create Profile',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={handleSave}>
              <Text style={{ fontSize: 16, fontWeight: '600' as const, color: Colors.dark.primary }}>Save</Text>
            </Pressable>
          )
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoSection}>
          <Pressable onPress={handlePickImage} style={styles.photoContainer}>
            {draftProfile.photoBase64 ? (
              <Image 
                source={{ uri: draftProfile.photoBase64.startsWith('data:') ? draftProfile.photoBase64 : `data:image/jpeg;base64,${draftProfile.photoBase64}` }} 
                style={styles.photo}
                onError={(error) => {
                  console.error('[EditProfile] Image render error:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('[EditProfile] Image loaded successfully');
                }}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color={Colors.dark.textSecondary} />
              </View>
            )}
            <View style={styles.photoOverlay}>
              <Camera size={20} color={Colors.dark.text} />
            </View>
          </Pressable>
          <Text style={styles.photoLabel}>Tap to {draftProfile.photoBase64 ? 'change' : 'add'} photo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={draftProfile.name}
              onChangeText={(text) => setDraftProfile(prev => ({ ...prev, name: text }))}
              placeholder="Enter dog's name"
              placeholderTextColor={Colors.dark.textTertiary}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputHalf]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Age (years) *</Text>
              </View>
              <TextInput
                style={styles.input}
                value={draftProfile.age}
                onChangeText={(text) => setDraftProfile(prev => ({ ...prev, age: text }))}
                placeholder="0"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.inputHalf]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Weight *</Text>
                <View style={styles.unitToggle}>
                  <Pressable
                    style={[
                      styles.unitToggleOption,
                      draftProfile.weightUnit === 'kg' && styles.unitToggleOptionActive
                    ]}
                    onPress={() => {
                      if (draftProfile.weightUnit !== 'kg') {
                        const converted = convertDisplayValue(draftProfile.weight, 'lbs', 'kg');
                        setDraftProfile(prev => ({
                          ...prev,
                          weight: converted || prev.weight,
                          weightUnit: 'kg'
                        }));
                      }
                    }}
                  >
                    <Text style={[
                      styles.unitToggleText,
                      draftProfile.weightUnit === 'kg' && styles.unitToggleTextActive
                    ]}>kg</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.unitToggleOption,
                      draftProfile.weightUnit === 'lbs' && styles.unitToggleOptionActive
                    ]}
                    onPress={() => {
                      if (draftProfile.weightUnit !== 'lbs') {
                        const converted = convertDisplayValue(draftProfile.weight, 'kg', 'lbs');
                        setDraftProfile(prev => ({
                          ...prev,
                          weight: converted || prev.weight,
                          weightUnit: 'lbs'
                        }));
                      }
                    }}
                  >
                    <Text style={[
                      styles.unitToggleText,
                      draftProfile.weightUnit === 'lbs' && styles.unitToggleTextActive
                    ]}>lbs</Text>
                  </Pressable>
                </View>
              </View>
              <TextInput
                style={styles.input}
                value={draftProfile.weight}
                onChangeText={(text) => setDraftProfile(prev => ({ ...prev, weight: text }))}
                placeholder="0"
                placeholderTextColor={Colors.dark.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sex *</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentButton,
                  draftProfile.sex === 'male' && styles.segmentButtonActive
                ]}
                onPress={() => setDraftProfile(prev => ({ ...prev, sex: 'male' }))}
              >
                <Text style={[
                  styles.segmentButtonText,
                  draftProfile.sex === 'male' && styles.segmentButtonTextActive
                ]}>
                  Male
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentButton,
                  draftProfile.sex === 'female' && styles.segmentButtonActive
                ]}
                onPress={() => setDraftProfile(prev => ({ ...prev, sex: 'female' }))}
              >
                <Text style={[
                  styles.segmentButtonText,
                  draftProfile.sex === 'female' && styles.segmentButtonTextActive
                ]}>
                  Female
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breed Composition</Text>
          
          {draftProfile.breedComposition.map((breed, index) => (
            <View key={breed.id} style={styles.breedSlot}>
              <View style={styles.breedSlotHeader}>
                <Text style={styles.breedSlotLabel}>{getBreedLabel(index)}</Text>
                {draftProfile.breedComposition.length > 1 && (
                  <Pressable onPress={() => handleRemoveBreed(index)}>
                    <Text style={styles.removeBreedText}>Remove</Text>
                  </Pressable>
                )}
              </View>
              <Pressable 
                style={styles.breedSelectButton}
                onPress={() => setShowBreedPicker(index)}
              >
                <Text style={[
                  styles.breedSelectButtonText,
                  !breed.name && styles.breedSelectButtonPlaceholder
                ]}>
                  {breed.name || (index === 0 ? 'Select breed' : 'Select breed (optional)')}
                </Text>
                <ChevronRight size={20} color={Colors.dark.textSecondary} />
              </Pressable>
              {index >= 2 && (
                <Text style={styles.helperText}>Select Other if you suspect additional breeds or mixed ancestry.</Text>
              )}
              <View style={styles.percentageRow}>
                <Text style={styles.percentageLabel}>Percentage</Text>
                <View style={styles.percentageInputWrapper}>
                  <View style={styles.percentageInputContainer}>
                    <TextInput
                      style={styles.percentageInput}
                      value={breed.percentage.toString()}
                      onChangeText={(text) => handlePercentageChange(index, text)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                    <Text style={styles.percentageSymbol}>%</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {draftProfile.breedComposition.length < 4 && (
            <Pressable style={styles.addBreedButton} onPress={handleAddBreed}>
              <Plus size={20} color={Colors.dark.primary} />
              <Text style={styles.addBreedButtonText}>Add breed component</Text>
            </Pressable>
          )}

          <View style={[
            styles.percentageTotalBox,
            percentageValid && styles.percentageTotalBoxValid,
            totalPercentage > 0 && !percentageValid && styles.percentageTotalBoxInvalid
          ]}>
            <Text style={styles.percentageTotalLabel}>Total:</Text>
            <Text style={[
              styles.percentageTotalValue,
              percentageValid && styles.percentageTotalValueValid,
              totalPercentage > 0 && !percentageValid && styles.percentageTotalValueInvalid
            ]}>
              {totalPercentage}%
            </Text>
          </View>
          
          {totalPercentage > 0 && !percentageValid && (
            <Text style={styles.validationError}>
              Percentages must total exactly 100%
            </Text>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Breed composition enables tailored conditioning guidance and health awareness based on genetic traits.
          </Text>
        </View>
      </KeyboardAwareScreen>

      {showBreedPicker !== null && (
        <View style={styles.pickerOverlay}>
          <KeyboardAvoidingView
            style={styles.pickerKeyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {getBreedLabel(showBreedPicker)}
                </Text>
                <Pressable onPress={() => {
                  setShowBreedPicker(null);
                  setBreedSearchQuery('');
                }}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </Pressable>
              </View>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={breedSearchQuery}
                  onChangeText={setBreedSearchQuery}
                  placeholder="Search breeds..."
                  placeholderTextColor={Colors.dark.textTertiary}
                  autoFocus
                />
              </View>
              <ScrollView 
                style={styles.pickerScroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.pickerScrollContent}
              >
                {DOG_BREEDS
                  .filter(breed => breed.toLowerCase().includes(breedSearchQuery.toLowerCase()))
                  .map((breed) => (
                    <Pressable
                      key={breed}
                      style={styles.pickerItem}
                      onPress={() => {
                        updateBreedComponent(showBreedPicker, breed);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{breed}</Text>
                    </Pressable>
                  ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },

  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 28,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 6,
    gap: 4,
  },
  unitToggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: 'transparent',
  },
  unitToggleOptionActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '10',
  },
  unitToggleText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.textTertiary,
  },
  unitToggleTextActive: {
    color: Colors.dark.primary,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  segmentButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  segmentButtonTextActive: {
    color: Colors.dark.text,
  },
  infoBox: {
    marginHorizontal: 20,
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
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.surface,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  photoLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  breedSlot: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  breedSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breedSlotLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  removeBreedText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.error,
  },
  addBreedButton: {
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
    marginBottom: 16,
  },
  addBreedButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  breedSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  breedSelectButtonText: {
    fontSize: 15,
    color: Colors.dark.text,
  },
  breedSelectButtonPlaceholder: {
    color: Colors.dark.textTertiary,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  percentageInputWrapper: {
    maxWidth: '40%',
    overflow: 'hidden',
  },
  percentageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  percentageInput: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    minWidth: 40,
    textAlign: 'right',
  },
  percentageSymbol: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginLeft: 4,
  },
  percentageTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    marginTop: 8,
  },
  percentageTotalBoxValid: {
    borderColor: Colors.dark.success,
    backgroundColor: `${Colors.dark.success}15`,
  },
  percentageTotalBoxInvalid: {
    borderColor: Colors.dark.error,
    backgroundColor: `${Colors.dark.error}15`,
  },
  percentageTotalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  percentageTotalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  percentageTotalValueValid: {
    color: Colors.dark.success,
  },
  percentageTotalValueInvalid: {
    color: Colors.dark.error,
  },
  validationError: {
    fontSize: 13,
    color: Colors.dark.error,
    marginTop: 8,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 16,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
  },
  pickerKeyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  pickerContainer: {
    backgroundColor: Colors.dark.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '80%',
    marginTop: Platform.OS === 'web' ? 60 : 0,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  searchInput: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  pickerCancel: {
    fontSize: 16,
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
  pickerScroll: {
    flexGrow: 0,
    maxHeight: Platform.OS === 'web' ? 400 : 350,
  },
  pickerScrollContent: {
    paddingBottom: 20,
  },
  pickerItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
});
