import { StyleSheet, Text, View, Pressable, Animated, TextInput, Linking, Image } from "react-native";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, Plus, ChevronRight, Sparkles, Settings, CheckCircle, RefreshCw, Edit3, FileText, LayoutDashboard } from "lucide-react-native";
import { router, useFocusEffect, Href } from "expo-router";
import { useState, useRef, useCallback } from "react";
import Colors from "@/constants/colors";
import { useDogProfile } from "@/contexts/DogProfileContext";
import Tooltip from "@/components/Tooltip";
import { useActivities } from "@/contexts/ActivityContext";
import { useCoach, AlternativeActivity } from "@/contexts/CoachContext";
import { useTooltips } from "@/contexts/TooltipContext";

export default function DashboardScreen() {
  const { profile, hasProfile } = useDogProfile();
  const { weeklyStats, healthNotes, addCoachHealthNote } = useActivities();
  const {
    todayActivity,
    markedAsDone,
    alternatives,
    showAlternatives,
    toggleAlternatives,
    weeklyBaselinePoints,
    breedMidpointTarget,
  } = useCoach();
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [healthNoteText, setHealthNoteText] = useState('');
  const [showHealthNotes, setShowHealthNotes] = useState(false);

  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(true);
  const { setActiveScreen } = useTooltips();
  
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      setActiveScreen('dashboard');
      return () => {
        setActiveScreen(null);
      };
    }, [setActiveScreen])
  );

  const toggleCoachCard = () => {
    const toValue = coachExpanded ? 0 : 1;
    setCoachExpanded(!coachExpanded);
    setShowFirstTimeTooltip(false);
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
  };

  const handleAddHealthNote = () => {
    if (!healthNoteText.trim()) return;
    addCoachHealthNote(healthNoteText);
    setHealthNoteText('');
  };




  const getConditioningOverviewText = () => {
    const points = weeklyStats.totalTrainingPoints;
    const count = weeklyStats.count;
    
    if (count === 0) {
      return "No activity data yet this week. Log your first session to start building your dog's conditioning profile.";
    }
    
    if (points >= breedMidpointTarget) {
      return `This week maintained healthy movement and mental stimulation with ${count} sessions totaling ${weeklyStats.totalHours} hours of activity.`;
    } else if (points >= breedMidpointTarget * 0.5) {
      return `Moderate activity this week with ${count} sessions. Continue building consistency for optimal conditioning.`;
    } else {
      return `Light activity week with ${count} sessions. Consider adding more movement to support your dog's health.`;
    }
  };

  const primaryBreed = profile?.breedMakeup?.[0]?.breedName || 'Other';

  if (!hasProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAwareScreen
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Canine iQ</Text>
                <Text style={styles.headerSubtitle}>Performance & Wellness Dashboard</Text>
              </View>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/0tv6mlpzaijsm500zed15' }}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.emptyState}>
            <LayoutDashboard size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>Welcome to Canine iQ</Text>
            <Text style={styles.emptyText}>
              Create a dog profile to unlock breed-aware conditioning guidance, activity tracking, and health insights.
            </Text>
            <Pressable 
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: '/edit-profile' } as Href)}
            >
              <Plus size={20} color={Colors.dark.text} />
              <Text style={styles.primaryButtonText}>Create Profile</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/login' } as Href)}>
              <Text style={styles.existingUsersLink}>Existing Users</Text>
            </Pressable>
          </View>

          <View style={styles.disclaimerCard}>
            <AlertCircle size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.disclaimerText}>
              This app provides conditioning and wellness awareness. Always consult a veterinarian for health concerns.
            </Text>
          </View>
        </KeyboardAwareScreen>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Canine iQ</Text>
              <Text style={styles.headerSubtitle}>Performance & Wellness Dashboard</Text>
            </View>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/0tv6mlpzaijsm500zed15' }}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>{profile.name}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
          <Text style={styles.heroBreed}>
            {primaryBreed}{profile.breedMakeup && profile.breedMakeup.length > 1 ? ' Mix' : ''} • {profile.age} {profile.age === 1 ? 'year' : 'years'} • {profile.weight}kg
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{weeklyStats.count}</Text>
              <Text style={styles.heroStatLabel}>Activities</Text>
              <Text style={styles.heroStatSubLabel}>This week</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{weeklyStats.totalHours}h</Text>
              <Text style={styles.heroStatLabel}>Time</Text>
              <Text style={styles.heroStatSubLabel}>This week</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{weeklyStats.totalTrainingPoints}</Text>
              <Text style={styles.heroStatLabel}>Training Points</Text>
              <Text style={styles.heroStatSubLabel}>This week</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.coachHeader}>
            <Text style={styles.sectionTitle}>K9 Coach</Text>
            <View style={styles.coachSettingsContainer}>
              <Pressable 
                style={styles.coachSettingsButton}
                onPress={() => router.push({ pathname: '/coach-settings' } as Href)}
              >
                <Settings size={16} color={Colors.dark.textSecondary} />
              </Pressable>
              <Tooltip
                id="dashboard_coach_settings"
                text="Customize your dog's activities, availability, and coaching preferences."
                position="below"
                arrowPosition="right"
                screen="dashboard"
              />
            </View>
          </View>
          
          <Pressable 
            style={styles.coachCard}
            onPress={toggleCoachCard}
          >
            <View style={styles.coachCardHeader}>
              <View style={[styles.coachIconContainer, markedAsDone && styles.coachIconContainerDone]}>
                {markedAsDone ? (
                  <CheckCircle size={18} color={Colors.dark.success} />
                ) : (
                  <Sparkles size={18} color={Colors.dark.primary} />
                )}
              </View>
              <View style={styles.coachCardHeaderText}>
                <Text style={styles.coachCardTitle}>
                  {markedAsDone ? 'Completed' : "Today's Focus"}
                </Text>
                <Text style={styles.coachCardSubtitle}>
                  {todayActivity.name} • {todayActivity.duration} min
                </Text>
              </View>
              <ChevronRight 
                size={18} 
                color={Colors.dark.textSecondary} 
                style={{ transform: [{ rotate: coachExpanded ? '90deg' : '0deg' }] }}
              />
            </View>
            
            {!coachExpanded && showFirstTimeTooltip && (
              <Text style={styles.tooltipText}>
                Tap to see today&apos;s plan and recommendations.
              </Text>
            )}
            
            {!coachExpanded && (
              <View style={styles.coachCardAction}>
                <Text style={styles.coachCardActionText}>View today&apos;s plan</Text>
              </View>
            )}
            
            {coachExpanded && (
              <Animated.View style={styles.coachExpandedContent}>
                <View style={styles.coachDivider} />
                
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedSectionTitle}>Today&apos;s Focus</Text>
                  <Text style={styles.expandedSectionHint}>This is your dog&apos;s priority for today.</Text>
                </View>

                <View style={styles.coachActivityItem}>
                  <View style={[styles.coachActivityIcon, todayActivity.isRecoveryDay && styles.coachActivityIconRecovery]}>
                    {todayActivity.isRecoveryDay ? (
                      <RefreshCw size={16} color={Colors.dark.success} />
                    ) : (
                      <Sparkles size={16} color={Colors.dark.primary} />
                    )}
                  </View>
                  <View style={styles.coachActivityDetails}>
                    <Text style={styles.coachActivityName}>{todayActivity.name}</Text>
                    <Text style={styles.coachActivityMeta}>
                      {todayActivity.duration} min • {todayActivity.intensity.charAt(0).toUpperCase() + todayActivity.intensity.slice(1)} intensity
                    </Text>
                  </View>
                  {markedAsDone && (
                    <View style={styles.doneCheckmark}>
                      <CheckCircle size={18} color={Colors.dark.success} />
                    </View>
                  )}
                </View>

                <Text style={styles.coachActivityReasoning}>{todayActivity.reasoning}</Text>

                <View style={styles.coachButtonsRow}>
                  <Pressable 
                    style={styles.coachButton}
                    onPress={() => router.push({ pathname: '/coach-activity' } as Href)}
                  >
                    <Edit3 size={14} color={Colors.dark.textSecondary} />
                    <Text style={styles.coachButtonText}>Edit Activity</Text>
                  </Pressable>
                  <Pressable 
                    style={[
                      styles.coachButton, 
                      markedAsDone ? styles.coachButtonDone : styles.coachButtonPrimary
                    ]}
                    onPress={() => {
                      if (!markedAsDone) {
                        router.push({ pathname: '/coach-activity' } as Href);
                      }
                    }}
                    disabled={markedAsDone}
                  >
                    <CheckCircle size={14} color={markedAsDone ? Colors.dark.success : Colors.dark.text} />
                    <Text style={[
                      styles.coachButtonText, 
                      markedAsDone ? styles.coachButtonTextDone : styles.coachButtonTextPrimary
                    ]}>
                      Mark as Done
                    </Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.coachButton, showAlternatives && styles.coachButtonActive]}
                    onPress={() => {
                      toggleAlternatives();
                    }}
                  >
                    <RefreshCw size={14} color={showAlternatives ? Colors.dark.primary : Colors.dark.textSecondary} />
                    <Text style={[styles.coachButtonText, showAlternatives && styles.coachButtonTextActive]}>Alternative</Text>
                  </Pressable>
                </View>

                <Text style={styles.buttonHintText}>
                  Edit if needed, then mark as done. Use Alternative to swap activities.
                </Text>

                {showAlternatives && (
                  <View style={styles.alternativesContainer}>
                    <Text style={styles.alternativesTitle}>Choose Alternative</Text>
                    {alternatives.map((alt: AlternativeActivity) => (
                      <Pressable
                        key={alt.id}
                        style={styles.alternativeItem}
                        onPress={() => {
                          toggleAlternatives();
                          router.push({ pathname: '/coach-activity', params: { alternativeId: alt.id } });
                        }}
                      >
                        <Text style={styles.alternativeItemName}>{alt.name}</Text>
                        <Text style={styles.alternativeItemMeta}>
                          {alt.duration} min • {alt.intensity.charAt(0).toUpperCase() + alt.intensity.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.weeklyRangeCard}>
                  <Text style={styles.weeklyRangeTitle}>Weekly Target Range</Text>
                  <Text style={styles.weeklyRangeHint}>Based on breed and coaching style.</Text>
                  <View style={styles.weeklyRangeRow}>
                    <View style={styles.weeklyRangeStat}>
                      <Text style={styles.weeklyRangeValue}>{weeklyBaselinePoints}</Text>
                      <Text style={styles.weeklyRangeLabel}>Baseline</Text>
                    </View>
                    <View style={styles.weeklyRangeDivider} />
                    <View style={styles.weeklyRangeStat}>
                      <Text style={[styles.weeklyRangeValue, styles.weeklyRangeValuePrimary]}>{breedMidpointTarget}</Text>
                      <Text style={styles.weeklyRangeLabel}>Breed Target</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.healthNotesSection}>
                  <Pressable 
                    style={styles.healthNotesHeader}
                    onPress={() => {
                      setShowHealthNotes(!showHealthNotes);
                    }}
                  >
                    <View style={styles.healthNotesHeaderLeft}>
                      <FileText size={16} color={Colors.dark.textSecondary} />
                      <Text style={styles.healthNotesTitle}>Health Notes</Text>
                    </View>
                    <Text style={styles.healthNotesCount}>{healthNotes.length}</Text>
                  </Pressable>
                  
                  <Text style={styles.healthNotesHint}>
                    Add a note about your dog&apos;s health. All notes are saved in the Activity Log.
                  </Text>
                  
                  {showHealthNotes && (
                    <View style={styles.healthNotesContent}>
                      <View style={styles.healthNoteInputRow}>
                        <TextInput
                          style={styles.healthNoteInput}
                          value={healthNoteText}
                          onChangeText={setHealthNoteText}
                          placeholder="Add a health observation..."
                          placeholderTextColor={Colors.dark.textTertiary}
                          
                        />
                        <Pressable 
                          style={[styles.healthNoteAddButton, !healthNoteText.trim() && styles.healthNoteAddButtonDisabled]}
                          onPress={() => {
                            handleAddHealthNote();
                          }}
                          disabled={!healthNoteText.trim()}
                        >
                          <Plus size={18} color={healthNoteText.trim() ? Colors.dark.text : Colors.dark.textTertiary} />
                        </Pressable>
                      </View>
                      
                      {healthNotes.length > 0 && (
                        <View style={styles.recentNoteContainer}>
                          <Text style={styles.recentNoteLabel}>Most Recent</Text>
                          <View style={styles.healthNoteItem}>
                            <Text style={styles.healthNoteText}>{healthNotes[0].text}</Text>
                            <Text style={styles.healthNoteDate}>{healthNotes[0].date}</Text>
                          </View>
                        </View>
                      )}
                      
                      {healthNotes.length === 0 && (
                        <Text style={styles.healthNotesEmpty}>
                          No health notes yet. Add observations for your vet records.
                        </Text>
                      )}

                      {healthNotes.length > 1 && (
                        <Pressable 
                          style={styles.viewAllNotesButton}
                          onPress={() => {
                            router.push({ pathname: '/(tabs)/activity', params: { filter: 'healthNotes' } });
                          }}
                        >
                          <Text style={styles.viewAllNotesText}>View All Health Notes</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditioning Overview</Text>
          <View style={styles.conditioningCard}>
            <View style={styles.conditioningHeader}>
              <View style={styles.conditioningIconContainer}>
                <Sparkles size={20} color={Colors.dark.primary} />
              </View>
              <View style={styles.conditioningInfo}>
                <Text style={styles.conditioningTitle}>Current Status</Text>
                <Text style={styles.conditioningSubtitle}>
                  {weeklyStats.totalTrainingPoints} / {breedMidpointTarget} points this week
                </Text>
              </View>
            </View>
            <Text style={styles.conditioningBody}>
              {getConditioningOverviewText()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Insight</Text>
          <View style={styles.weeklyInsightCard}>
            <Text style={styles.weeklyInsightText}>
              Regular physical activity supports your dog&apos;s cardiovascular health, joint mobility, and mental wellbeing. Most dogs benefit from 30-60 minutes of daily exercise, adjusted for age, breed, and health conditions.
            </Text>
            <View style={styles.weeklyInsightDivider} />
            <Pressable 
              style={styles.weeklyInsightLink}
              onPress={() => Linking.openURL('https://www.akc.org/expert-advice/health/how-much-exercise-does-dog-need/')}
            >
              <Text style={styles.weeklyInsightLinkText}>Learn more about exercise needs →</Text>
            </Pressable>
            <Text style={styles.thirdPartyDisclaimer}>Links may lead to third-party content.</Text>
          </View>
        </View>

        <View style={styles.disclaimerCard}>
          <AlertCircle size={16} color={Colors.dark.textSecondary} />
          <Text style={styles.disclaimerText}>
            This app provides conditioning and wellness awareness. Always consult a veterinarian for health concerns.
          </Text>
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
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  headerContent: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  existingUsersLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginTop: 16,
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.success,
  },
  heroBreed: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 0,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 1,
  },
  heroStatSubLabel: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.dark.border,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  conditioningCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  conditioningHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 10,
  },
  conditioningIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  conditioningInfo: {
    flex: 1,
  },
  conditioningTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  conditioningSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  conditioningBody: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  disclaimerCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.dark.textSecondary,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  coachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coachSettingsButton: {
    padding: 4,
  },
  coachSettingsContainer: {
    position: 'relative' as const,
  },
  coachSettingsTooltip: {
    right: 0,
    left: 'auto' as const,
    minWidth: 220,
  },
  coachCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  coachCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCardHeaderText: {
    flex: 1,
  },
  coachCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  coachCardSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  tooltipText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
    marginTop: 10,
  },
  coachCardAction: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  coachCardActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    textAlign: 'center' as const,
  },
  coachExpandedContent: {
    marginTop: 4,
  },
  coachDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 14,
  },
  expandedSection: {
    marginBottom: 12,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  expandedSectionHint: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
  },
  coachActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  coachActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachActivityDetails: {
    flex: 1,
  },
  coachActivityName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  coachActivityMeta: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  coachActivityReasoning: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  coachButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  coachButtonPrimary: {
    backgroundColor: Colors.dark.primary,
  },
  coachButtonText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
  },
  coachButtonTextPrimary: {
    color: Colors.dark.text,
  },
  coachIconContainerDone: {
    backgroundColor: Colors.dark.success + '15',
  },
  coachActivityIconRecovery: {
    backgroundColor: Colors.dark.success + '15',
  },
  doneCheckmark: {
    marginLeft: 'auto' as const,
  },
  buttonHintText: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    marginTop: 8,
    marginBottom: 14,
  },
  weeklyRangeCard: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  weeklyRangeTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  weeklyRangeHint: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  weeklyRangeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  weeklyRangeStat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  weeklyRangeValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  weeklyRangeValuePrimary: {
    color: Colors.dark.primary,
  },
  weeklyRangeLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  weeklyRangeDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 16,
  },
  alternativesContainer: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  alternativesTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  alternativeItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
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
  coachButtonDone: {
    backgroundColor: Colors.dark.success + '20',
  },
  coachButtonTextDone: {
    color: Colors.dark.success,
  },
  coachButtonActive: {
    backgroundColor: Colors.dark.primary + '20',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  coachButtonTextActive: {
    color: Colors.dark.primary,
  },
  weeklyInsightCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  weeklyInsightText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 21,
  },
  weeklyInsightDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  weeklyInsightLink: {
    paddingVertical: 4,
  },
  weeklyInsightLinkText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  thirdPartyDisclaimer: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    marginTop: 8,
  },
  healthNotesSection: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden' as const,
  },
  healthNotesHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 12,
    paddingBottom: 4,
  },
  healthNotesHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  healthNotesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  healthNotesCount: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  healthNotesHint: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  healthNotesContent: {
    padding: 12,
    paddingTop: 0,
  },
  healthNoteInputRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
  },
  healthNoteInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.dark.text,
  },
  healthNoteAddButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  healthNoteAddButtonDisabled: {
    backgroundColor: Colors.dark.surface,
  },

  recentNoteContainer: {
    marginBottom: 8,
  },
  recentNoteLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.textTertiary,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  healthNoteItem: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    padding: 10,
  },
  healthNoteText: {
    fontSize: 13,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  healthNoteDate: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  healthNotesEmpty: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: 12,
  },
  viewAllNotesButton: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center' as const,
  },
  viewAllNotesText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
});
