import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, Modal, Platform } from "react-native";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { X } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useActivities } from "@/contexts/ActivityContext";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { useGoals } from "@/contexts/GoalContext";
import { useAuth } from "@/contexts/AuthContext";
import { WeightUnit } from "@/types/dog";
import { formatWeightForDisplay, convertDisplayValue, parseWeightToKg } from "@/utils/weightUtils";



export default function AddActivityScreen() {
  const { addActivity, updateActivity, isSaving, calculateTrainingPoints, activities } = useActivities();
  const { profile } = useDogProfile();
  const { updateGoalsFromActivity, goals } = useGoals();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { trackMeaningfulAction } = useAuth();
  
  const isEditMode = !!params.editId;
  const editingActivity = isEditMode ? activities.find(a => a.id === params.editId) : null;
  
  const [activityType, setActivityType] = useState<'walk' | 'training' | 'play' | 'run' | 'social' | 'other'>('walk');
  const [duration, setDuration] = useState('');
  const [effort, setEffort] = useState<'low' | 'moderate' | 'high'>('low');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile?.preferredWeightUnit || 'kg');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editingActivity) {
      setActivityType(editingActivity.type);
      setDuration(editingActivity.duration.toString());
      setEffort(editingActivity.effort);
      setNotes(editingActivity.notes || '');
      setSelectedDate(new Date(editingActivity.activityDate || editingActivity.date));
      const preferredUnit = profile?.preferredWeightUnit || 'kg';
      setWeightUnit(preferredUnit);
      if (editingActivity.weight) {
        const displayWeight = formatWeightForDisplay(editingActivity.weight, preferredUnit);
        setWeight(displayWeight);
      }
    }
  }, [editingActivity, profile?.preferredWeightUnit]);

  const trainingPoints = duration && !isNaN(Number(duration)) 
    ? calculateTrainingPoints(Number(duration), effort) 
    : 0;

  const handleSave = () => {
    if (!profile) {
      Alert.alert('Error', 'No dog profile found');
      return;
    }

    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0) {
      Alert.alert('Required', 'Please enter a valid duration in minutes');
      return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > now) {
      Alert.alert('Invalid Date', 'Cannot log activities in the future');
      return;
    }

    if (selectedDate < sevenDaysAgo) {
      Alert.alert('Invalid Date', 'Cannot backdate activities more than 7 days');
      return;
    }

    console.log('[AddActivity] Saving activity for date:', selectedDate.toISOString());
    
    const points = calculateTrainingPoints(Number(duration), effort);
    const hasWeightGoal = goals.some(g => g.type === 'weight');
    const hasConditioningGoal = goals.some(g => g.type === 'conditioning');
    const weightValue = weight ? parseWeightToKg(weight, weightUnit) ?? undefined : undefined;
    
    const contributesToGoal = (
      (hasWeightGoal && !!weightValue) ||
      hasConditioningGoal
    );

    if (isEditMode && editingActivity) {
      updateActivity(editingActivity.id, {
        type: activityType,
        duration: Number(duration),
        effort,
        trainingPoints: points,
        notes: notes.trim() || undefined,
        weight: weightValue,
        activityDate: selectedDate.toISOString(),
      });

      Alert.alert('Success', 'Activity updated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      addActivity({
        dogId: profile.id,
        type: activityType,
        duration: Number(duration),
        effort,
        trainingPoints: points,
        notes: notes.trim() || undefined,
        weight: weightValue,
        activityDate: selectedDate.toISOString(),
        contributesToGoal,
      }, selectedDate.toISOString());

      updateGoalsFromActivity(points, weightValue);

      let feedbackMessage = 'Activity logged successfully';
      const feedbackParts: string[] = [];
      
      if (hasConditioningGoal) {
        feedbackParts.push(`+${points} training points applied to conditioning goal`);
      }
      
      if (hasWeightGoal && weightValue) {
        feedbackParts.push('Weight entry applied to weight goal');
      }
      
      if (feedbackParts.length > 0) {
        feedbackMessage = feedbackParts.join('\n');
      }

      Alert.alert('Success', feedbackMessage, [
        { text: 'OK', onPress: () => {
          trackMeaningfulAction();
          router.back();
        }}
      ]);
    }
  };

  const activityTypes: { value: 'walk' | 'training' | 'play' | 'run' | 'social' | 'other'; label: string }[] = [
    { value: 'walk', label: 'Walk' },
    { value: 'run', label: 'Run' },
    { value: 'training', label: 'Training' },
    { value: 'play', label: 'Play' },
    { value: 'social', label: 'Social' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: isEditMode ? 'Edit Activity' : 'Log Activity',
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <X size={24} color={Colors.dark.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>Save</Text>
            </Pressable>
          )
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <Pressable 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {selectedDate.toDateString() === new Date().toDateString() 
                ? 'Today' 
                : selectedDate.toLocaleDateString()}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Type</Text>
          <View style={styles.typeGrid}>
            {activityTypes.map(type => (
              <Pressable
                key={type.value}
                style={[
                  styles.typeButton,
                  activityType === type.value && styles.typeButtonActive
                ]}
                onPress={() => setActivityType(type.value)}
              >
                <Text style={[
                  styles.typeButtonText,
                  activityType === type.value && styles.typeButtonTextActive
                ]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="0"
            placeholderTextColor={Colors.dark.textTertiary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Effort Level</Text>
          <View style={styles.effortContainer}>
            {(['low', 'moderate', 'high'] as const).map(level => (
              <Pressable
                key={level}
                style={[
                  styles.effortButton,
                  effort === level && styles.effortButtonActive,
                  level === 'low' && effort === level && styles.effortButtonLow,
                  level === 'moderate' && effort === level && styles.effortButtonModerate,
                  level === 'high' && effort === level && styles.effortButtonHigh,
                ]}
                onPress={() => setEffort(level)}
              >
                <Text style={[
                  styles.effortButtonText,
                  effort === level && styles.effortButtonTextActive
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {trainingPoints > 0 && (
          <View style={styles.trainingPointsCard}>
            <Text style={styles.trainingPointsLabel}>Training Points</Text>
            <Text style={styles.trainingPointsValue}>{trainingPoints}</Text>
            <Text style={styles.trainingPointsFormula}>
              {duration} min × {effort === 'high' ? '2.0' : effort === 'moderate' ? '1.5' : '1.0'}x
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any observations or details..."
            placeholderTextColor={Colors.dark.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Current Weight (Optional)</Text>
            <View style={styles.unitToggle}>
              <Pressable
                style={[
                  styles.unitToggleOption,
                  weightUnit === 'kg' && styles.unitToggleOptionActive
                ]}
                onPress={() => {
                  if (weightUnit !== 'kg') {
                    const converted = convertDisplayValue(weight, 'lbs', 'kg');
                    setWeight(converted);
                    setWeightUnit('kg');
                  }
                }}
              >
                <Text style={[
                  styles.unitToggleText,
                  weightUnit === 'kg' && styles.unitToggleTextActive
                ]}>kg</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.unitToggleOption,
                  weightUnit === 'lbs' && styles.unitToggleOptionActive
                ]}
                onPress={() => {
                  if (weightUnit !== 'lbs') {
                    const converted = convertDisplayValue(weight, 'kg', 'lbs');
                    setWeight(converted);
                    setWeightUnit('lbs');
                  }
                }}
              >
                <Text style={[
                  styles.unitToggleText,
                  weightUnit === 'lbs' && styles.unitToggleTextActive
                ]}>lbs</Text>
              </Pressable>
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            placeholder={`Enter current weight (${weightUnit})`}
            placeholderTextColor={Colors.dark.textTertiary}
            keyboardType="decimal-pad"
          />
          {goals.some(g => g.type === 'weight') && (
            <Text style={styles.helperText}>
              This will update your weight goal progress
            </Text>
          )}
        </View>

      </KeyboardAwareScreen>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.datePickerModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <Text style={styles.datePickerSubtitle}>Up to 7 days back</Text>
            </View>
            <ScrollView style={styles.datePickerScroll} bounces={false}>
              {(() => {
                const options = [];
                const today = new Date();
                
                for (let i = 0; i <= 7; i++) {
                  const date = new Date();
                  date.setDate(today.getDate() - i);
                  const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`;
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  
                  options.push(
                    <Pressable
                      key={i}
                      style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                      onPress={() => {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                        {label}
                      </Text>
                      <Text style={[styles.dateOptionDate, isSelected && styles.dateOptionDateSelected]}>
                        {date.toLocaleDateString()}
                      </Text>
                    </Pressable>
                  );
                }
                
                return options;
              })()}
            </ScrollView>
            <Pressable 
              style={styles.datePickerCancel}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 8,
    gap: 4,
  },
  unitToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.textTertiary,
  },
  unitToggleTextActive: {
    color: Colors.dark.primary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.dark.text,
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
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 8,
  },

  effortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  effortButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  effortButtonActive: {
    borderWidth: 2,
  },
  effortButtonLow: {
    backgroundColor: Colors.dark.textTertiary + '20',
    borderColor: Colors.dark.textTertiary,
  },
  effortButtonModerate: {
    backgroundColor: Colors.dark.warning + '20',
    borderColor: Colors.dark.warning,
  },
  effortButtonHigh: {
    backgroundColor: Colors.dark.error + '20',
    borderColor: Colors.dark.error,
  },
  effortButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  effortButtonTextActive: {
    color: Colors.dark.text,
  },
  trainingPointsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.dark.primary + '15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  trainingPointsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  trainingPointsValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  trainingPointsFormula: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  dateButton: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.dark.text,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  datePickerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  datePickerScroll: {
    maxHeight: 480,
  },
  dateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  dateOptionSelected: {
    backgroundColor: Colors.dark.primary + '15',
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  dateOptionTextSelected: {
    color: Colors.dark.primary,
  },
  dateOptionDate: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  dateOptionDateSelected: {
    color: Colors.dark.primary,
  },
  datePickerCancel: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
});
