import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Alert } from "react-native";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { X, CheckCircle, Sparkles, RefreshCw } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useCoach, AlternativeActivity } from "@/contexts/CoachContext";
import { useActivities } from "@/contexts/ActivityContext";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { useGoals } from "@/contexts/GoalContext";

type ActivityType = 'walk' | 'training' | 'play' | 'run' | 'other';
type EffortLevel = 'low' | 'moderate' | 'high';

const COACH_ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  'Moderate Walk': 'walk',
  'Recovery Walk': 'walk',
  'Walk': 'walk',
  'Play Session': 'play',
  'Training Drill': 'training',
  'Sniff Walk': 'walk',
};

const COACH_INTENSITY_MAP: Record<string, EffortLevel> = {
  'low': 'low',
  'moderate': 'moderate',
  'high': 'high',
};

export default function CoachActivityScreen() {
  const params = useLocalSearchParams<{ alternativeId?: string }>();
  const { todayActivity, alternatives, markActivityAsDone, markedAsDone } = useCoach();
  const { addActivity, calculateTrainingPoints } = useActivities();
  const { profile } = useDogProfile();
  const { updateGoalsFromActivity, goals } = useGoals();

  const selectedAlternative = params.alternativeId 
    ? alternatives.find((a: AlternativeActivity) => a.id === params.alternativeId) 
    : null;

  const isUsingAlternative = !!selectedAlternative;
  const activityName = selectedAlternative?.name || todayActivity.name;
  const activityDuration = selectedAlternative?.duration || todayActivity.duration;
  const activityIntensity = selectedAlternative?.intensity || todayActivity.intensity;
  const isRecoveryDay = !isUsingAlternative && todayActivity.isRecoveryDay;
  const activityReasoning = isUsingAlternative 
    ? `Alternative activity selected: ${selectedAlternative?.name}` 
    : todayActivity.reasoning;

  const [activityType, setActivityType] = useState<ActivityType>(
    COACH_ACTIVITY_TYPE_MAP[activityName] || 'walk'
  );
  const [duration, setDuration] = useState(String(activityDuration));
  const [effort, setEffort] = useState<EffortLevel>(
    isRecoveryDay ? 'low' : COACH_INTENSITY_MAP[activityIntensity] || 'moderate'
  );
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    if (selectedAlternative) {
      setActivityType(COACH_ACTIVITY_TYPE_MAP[selectedAlternative.name] || 'walk');
      setDuration(String(selectedAlternative.duration));
      setEffort(COACH_INTENSITY_MAP[selectedAlternative.intensity] || 'moderate');
    }
  }, [selectedAlternative]);

  const trainingPoints = duration && !isNaN(Number(duration)) 
    ? calculateTrainingPoints(Number(duration), effort) 
    : 0;

  const handleSaveAndMarkDone = () => {
    if (!profile) {
      Alert.alert('Error', 'No dog profile found');
      return;
    }

    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0) {
      Alert.alert('Required', 'Please enter a valid duration in minutes');
      return;
    }

    if (isRecoveryDay && Number(duration) < 20) {
      Alert.alert('Recovery Day', 'Recovery activities should be at least 20 minutes');
      return;
    }

    setIsSaving(true);

    console.log('[CoachActivity] Saving coach activity to log');
    
    const points = calculateTrainingPoints(Number(duration), effort);
    const hasConditioningGoal = goals.some(g => g.type === 'conditioning');

    addActivity({
      dogId: profile.id,
      type: activityType,
      duration: Number(duration),
      effort,
      trainingPoints: points,
      notes: notes.trim() ? `[Coach] ${notes.trim()}` : `[Coach] ${activityName}`,
      activityDate: new Date().toISOString(),
      contributesToGoal: hasConditioningGoal,
    });

    updateGoalsFromActivity(points, undefined);
    markActivityAsDone();

    setIsSaving(false);

    let feedbackMessage = 'Activity logged successfully!';
    if (hasConditioningGoal) {
      feedbackMessage = `Activity logged! +${points} training points applied to your conditioning goal.`;
    }

    Alert.alert('Done', feedbackMessage, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleSelectAlternative = (alt: AlternativeActivity) => {
    setActivityType(COACH_ACTIVITY_TYPE_MAP[alt.name] || 'walk');
    setDuration(String(alt.duration));
    setEffort(COACH_INTENSITY_MAP[alt.intensity] || 'moderate');
    setShowAlternatives(false);
  };

  const activityTypes: { value: ActivityType; label: string }[] = [
    { value: 'walk', label: 'Walk' },
    { value: 'run', label: 'Run' },
    { value: 'training', label: 'Training' },
    { value: 'play', label: 'Play' },
    { value: 'other', label: 'Other' },
  ];

  if (markedAsDone) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen 
          options={{ 
            title: "Today's Activity",
            headerShown: true,
            headerLeft: () => (
              <Pressable onPress={() => router.back()}>
                <X size={24} color={Colors.dark.text} />
              </Pressable>
            ),
          }} 
        />
        <View style={styles.completedContainer}>
          <View style={styles.completedIcon}>
            <CheckCircle size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.completedTitle}>Already Completed</Text>
          <Text style={styles.completedText}>
            You&apos;ve already logged today&apos;s coach activity. Check back tomorrow for a new recommendation.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: "Today's Activity",
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <X size={24} color={Colors.dark.text} />
            </Pressable>
          ),
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View style={[styles.recommendationIcon, isRecoveryDay && styles.recommendationIconRecovery]}>
              {isRecoveryDay ? (
                <RefreshCw size={20} color={Colors.dark.success} />
              ) : (
                <Sparkles size={20} color={Colors.dark.primary} />
              )}
            </View>
            <View style={styles.recommendationInfo}>
              <Text style={styles.recommendationLabel}>
                {isRecoveryDay ? 'Recovery Day' : 'Coach Recommendation'}
              </Text>
              <Text style={styles.recommendationName}>{activityName}</Text>
            </View>
          </View>
          <Text style={styles.recommendationReasoning}>{activityReasoning}</Text>
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
          {isRecoveryDay && (
            <Text style={styles.helperText}>
              Recovery activities should be at least 20 minutes
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intensity</Text>
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
                  isRecoveryDay && level !== 'low' && styles.effortButtonDisabled,
                ]}
                onPress={() => {
                  if (isRecoveryDay && level !== 'low') {
                    Alert.alert('Recovery Day', 'Recovery activities are low intensity only');
                    return;
                  }
                  setEffort(level);
                }}
                disabled={isRecoveryDay && level !== 'low'}
              >
                <Text style={[
                  styles.effortButtonText,
                  effort === level && styles.effortButtonTextActive,
                  isRecoveryDay && level !== 'low' && styles.effortButtonTextDisabled,
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
            placeholder="Add any observations..."
            placeholderTextColor={Colors.dark.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveAndMarkDone}
            disabled={isSaving}
          >
            <CheckCircle size={20} color={Colors.dark.text} />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save & Mark Done'}
            </Text>
          </Pressable>
        </View>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  recommendationCard: {
    margin: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationIconRecovery: {
    backgroundColor: Colors.dark.success + '15',
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recommendationName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  recommendationReasoning: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
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
    minHeight: 80,
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
  effortButtonDisabled: {
    opacity: 0.4,
  },
  effortButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  effortButtonTextActive: {
    color: Colors.dark.text,
  },
  effortButtonTextDisabled: {
    color: Colors.dark.textTertiary,
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
  alternativesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
  },
  alternativesToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  alternativesContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 12,
  },
  alternativeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    marginBottom: 6,
  },
  alternativeItemName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.dark.text,
  },
  alternativeItemMeta: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  completedIcon: {
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  completedText: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
});
