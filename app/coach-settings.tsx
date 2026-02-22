import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { ChevronDown, ChevronUp, Check } from "lucide-react-native";
import { useState } from "react";
import Colors from "@/constants/colors";
import { useCoach } from "@/contexts/CoachContext";
import { useAuth } from "@/contexts/AuthContext";

export default function CoachSettingsScreen() {
  const { settings, updateCoachingStyle, updateSettings, saveAllSettings, isSaving, weeklyBaselinePoints, breedMidpointTarget, breedRecommendation, getCoachingStyleDescription } = useCoach();
  const { trackMeaningfulAction } = useAuth();
  const [transparencyExpanded, setTransparencyExpanded] = useState(false);

  const handleSave = async () => {
    try {
      await saveAllSettings();
      Alert.alert('Settings Updated', 'Settings updated. Coach will adjust recommendations accordingly.', [
        { text: 'OK', onPress: () => {
          trackMeaningfulAction();
          router.back();
        }}
      ]);
    } catch (error) {
      console.error('[CoachSettings] Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleStyleChange = (style: 'lower' | 'balanced' | 'upper') => {
    updateCoachingStyle(style);
  };

  const toggleActivityPreference = (activity: string) => {
    const currentPrefs = settings.activityPreferences || [];
    const newPrefs = currentPrefs.includes(activity)
      ? currentPrefs.filter(a => a !== activity)
      : [...currentPrefs, activity];
    updateSettings({ activityPreferences: newPrefs });
  };

  const handleFeedbackChange = (level: 'easy' | 'right' | 'demanding') => {
    updateSettings({ feedbackLevel: level });
  };

  const coachingStyles = [
    { key: 'lower' as const, label: 'Lower range', description: getCoachingStyleDescription('lower'), target: breedRecommendation.recommendedMin },
    { key: 'balanced' as const, label: 'Balanced', description: getCoachingStyleDescription('balanced'), target: Math.round((breedRecommendation.recommendedMin + breedRecommendation.recommendedMax) / 2) },
    { key: 'upper' as const, label: 'Upper range', description: getCoachingStyleDescription('upper'), target: breedRecommendation.recommendedMax },
  ];

  const activityPreferences = [
    'Walks',
    'Running',
    'Swimming',
    'Fetch',
    'Agility training',
    'Mental enrichment',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: "Coach Settings",
          headerTitleStyle: styles.headerTitle,
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={isSaving}>
              <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>Save</Text>
            </Pressable>
          ),
        }} 
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Personalize Your Coach</Text>
          <Text style={styles.introText}>
            Adjust how the coach plans activities for your dog. These preferences help tailor recommendations to your lifestyle.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coaching Style</Text>
          <Text style={styles.sectionDescription}>
            Choose how the coach approaches your dog&apos;s activity planning.
          </Text>
          <View style={styles.styleOptions}>
            {coachingStyles.map((style) => (
              <Pressable
                key={style.key}
                style={[
                  styles.styleOption,
                  settings.coachingStyle === style.key && styles.styleOptionActive,
                ]}
                onPress={() => handleStyleChange(style.key)}
              >
                <View style={styles.styleOptionHeader}>
                  <View style={[
                    styles.radioOuter,
                    settings.coachingStyle === style.key && styles.radioOuterActive,
                  ]}>
                    {settings.coachingStyle === style.key && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.styleOptionLabel,
                    settings.coachingStyle === style.key && styles.styleOptionLabelActive,
                  ]}>
                    {style.label}
                  </Text>
                </View>
                <Text style={styles.styleOptionDescription}>{style.description}</Text>
                <Text style={styles.styleOptionTarget}>Weekly target: {style.target} points</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Movement</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              On recovery days, the coach recommends 20–30 minutes of low-intensity movement such as a gentle walk or light play. This helps maintain mobility without overexertion.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Target</Text>
          <View style={styles.targetCard}>
            <View style={styles.targetRow}>
              <View style={styles.targetStat}>
                <Text style={styles.targetValue}>{weeklyBaselinePoints}</Text>
                <Text style={styles.targetLabel}>Baseline Points</Text>
              </View>
              <View style={styles.targetDivider} />
              <View style={styles.targetStat}>
                <Text style={[styles.targetValue, styles.targetValuePrimary]}>{breedMidpointTarget}</Text>
                <Text style={styles.targetLabel}>Breed Target</Text>
              </View>
            </View>
            <Text style={styles.targetHint}>
              Weekly baseline is {weeklyBaselinePoints} points. Your dog&apos;s breed-based target is {breedMidpointTarget} points per week.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Preferences</Text>
          <Text style={styles.sectionDescription}>
            Activities the coach may include in your plans.
          </Text>
          <View style={styles.preferencesGrid}>
            {activityPreferences.map((activity) => (
              <Pressable 
                key={activity} 
                style={[
                  styles.preferenceChip,
                  (settings.activityPreferences || []).includes(activity) && styles.preferenceChipActive
                ]}
                onPress={() => toggleActivityPreference(activity)}
              >
                {(settings.activityPreferences || []).includes(activity) && (
                  <Check size={12} color={Colors.dark.primary} />
                )}
                <Text style={[
                  styles.preferenceChipText,
                  (settings.activityPreferences || []).includes(activity) && styles.preferenceChipTextActive
                ]}>{activity}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability & Constraints</Text>
          <Text style={styles.sectionDescription}>
            Set your schedule preferences and limitations.
          </Text>
          <View style={styles.constraintsList}>
            <View style={styles.constraintItem}>
              <Text style={styles.constraintLabel}>Weekday availability</Text>
              <View style={styles.constraintOptions}>
                {(['morning', 'evening', 'both'] as const).map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.constraintOption,
                      settings.weekdayAvailability === opt && styles.constraintOptionActive
                    ]}
                    onPress={() => { updateSettings({ weekdayAvailability: opt }); }}
                  >
                    <Text style={[
                      styles.constraintOptionText,
                      settings.weekdayAvailability === opt && styles.constraintOptionTextActive
                    ]}>
                      {opt === 'both' ? 'Both' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.constraintItem}>
              <Text style={styles.constraintLabel}>Weekend availability</Text>
              <View style={styles.constraintOptions}>
                {(['flexible', 'limited'] as const).map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.constraintOption,
                      settings.weekendAvailability === opt && styles.constraintOptionActive
                    ]}
                    onPress={() => { updateSettings({ weekendAvailability: opt }); }}
                  >
                    <Text style={[
                      styles.constraintOptionText,
                      settings.weekendAvailability === opt && styles.constraintOptionTextActive
                    ]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.constraintItem, styles.constraintItemLast]}>
              <Text style={styles.constraintLabel}>Weather sensitivity</Text>
              <View style={styles.constraintOptions}>
                {(['low', 'moderate', 'high'] as const).map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.constraintOption,
                      settings.weatherSensitivity === opt && styles.constraintOptionActive
                    ]}
                    onPress={() => { updateSettings({ weatherSensitivity: opt }); }}
                  >
                    <Text style={[
                      styles.constraintOptionText,
                      settings.weatherSensitivity === opt && styles.constraintOptionTextActive
                    ]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <Text style={styles.sectionDescription}>
            Help the coach learn your preferences over time.
          </Text>
          <View style={styles.feedbackButtons}>
            <Pressable 
              style={[styles.feedbackButton, settings.feedbackLevel === 'easy' && styles.feedbackButtonActive]}
              onPress={() => handleFeedbackChange('easy')}
            >
              <Text style={[styles.feedbackButtonText, settings.feedbackLevel === 'easy' && styles.feedbackButtonTextActive]}>Too easy</Text>
            </Pressable>
            <Pressable 
              style={[styles.feedbackButton, settings.feedbackLevel === 'right' && styles.feedbackButtonActive]}
              onPress={() => handleFeedbackChange('right')}
            >
              <Text style={[styles.feedbackButtonText, settings.feedbackLevel === 'right' && styles.feedbackButtonTextActive]}>About right</Text>
            </Pressable>
            <Pressable 
              style={[styles.feedbackButton, settings.feedbackLevel === 'demanding' && styles.feedbackButtonActive]}
              onPress={() => handleFeedbackChange('demanding')}
            >
              <Text style={[styles.feedbackButtonText, settings.feedbackLevel === 'demanding' && styles.feedbackButtonTextActive]}>Too demanding</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable 
            style={styles.transparencyHeader}
            onPress={() => setTransparencyExpanded(!transparencyExpanded)}
          >
            <View>
              <Text style={styles.sectionTitle}>Transparency</Text>
              <Text style={styles.sectionDescription}>
                How the coach makes decisions
              </Text>
            </View>
            {transparencyExpanded ? (
              <ChevronUp size={20} color={Colors.dark.textSecondary} />
            ) : (
              <ChevronDown size={20} color={Colors.dark.textSecondary} />
            )}
          </Pressable>
          {transparencyExpanded && (
            <View style={styles.transparencyContent}>
              <View style={styles.transparencyItem}>
                <Text style={styles.transparencyLabel}>Activity selection</Text>
                <Text style={styles.transparencyText}>
                  Based on breed drive analysis, age, weight, and your stated preferences.
                </Text>
              </View>
              <View style={styles.transparencyItem}>
                <Text style={styles.transparencyLabel}>Intensity calibration</Text>
                <Text style={styles.transparencyText}>
                  Adjusted using your feedback and activity completion patterns.
                </Text>
              </View>
              <View style={styles.transparencyItem}>
                <Text style={styles.transparencyLabel}>Recovery scheduling</Text>
                <Text style={styles.transparencyText}>
                  Determined by recent activity load and your dog&apos;s conditioning level.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  headerTitle: {
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  introSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  styleOptions: {
    gap: 10,
  },
  styleOption: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  styleOptionActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '10',
  },
  styleOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.dark.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.dark.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
  styleOptionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  styleOptionLabelActive: {
    color: Colors.dark.text,
  },
  styleOptionDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginLeft: 28,
  },
  styleOptionTarget: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginLeft: 28,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  preferenceChipText: {
    fontSize: 13,
    color: Colors.dark.text,
    fontWeight: '500' as const,
  },
  constraintsList: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  constraintItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  constraintLabel: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  placeholderToggle: {
    backgroundColor: Colors.dark.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  placeholderToggleText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  feedbackButton: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  feedbackButtonActive: {
    backgroundColor: Colors.dark.primary + '20',
    borderColor: Colors.dark.primary,
  },
  feedbackButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
  },
  feedbackButtonTextActive: {
    color: Colors.dark.primary,
  },
  transparencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transparencyContent: {
    marginTop: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 14,
  },
  transparencyItem: {
    gap: 4,
  },
  transparencyLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  transparencyText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  bottomSpacer: {
    height: 20,
  },
  
  preferenceChipActive: {
    backgroundColor: Colors.dark.primary + '20',
    borderColor: Colors.dark.primary,
  },
  preferenceChipTextActive: {
    color: Colors.dark.primary,
  },
  constraintOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  constraintOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  constraintOptionActive: {
    backgroundColor: Colors.dark.primary + '20',
  },
  constraintOptionText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  constraintOptionTextActive: {
    color: Colors.dark.primary,
  },
  constraintItemLast: {
    borderBottomWidth: 0,
  },
  targetCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  targetRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  targetStat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  targetValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  targetValuePrimary: {
    color: Colors.dark.primary,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  targetDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 16,
  },
  targetHint: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    lineHeight: 17,
    textAlign: 'center' as const,
  },
});
