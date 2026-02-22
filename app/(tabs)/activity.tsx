import { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Image, Modal, TextInput } from "react-native";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Clock, Zap, Activity as ActivityIcon, X, Heart, Search, Trash2, ChevronDown, Filter, Pencil, ChevronUp } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams, Href } from "expo-router";
import Colors from "@/constants/colors";
import { useDogProfile } from "@/contexts/DogProfileContext";
import Tooltip from "@/components/Tooltip";
import { useActivities } from "@/contexts/ActivityContext";
import { useGoals } from "@/contexts/GoalContext";
import { Goal, Activity, HealthNote } from "@/types/dog";
import { calculateBreedRecommendation } from "@/constants/breedDrive";
import { useTooltips } from "@/contexts/TooltipContext";
import { formatWeightWithUnit } from "@/utils/weightUtils";

type CombinedEntry = 
  | { type: 'activity'; data: Activity; timestamp: number }
  | { type: 'healthNote'; data: HealthNote; timestamp: number };

export default function ActivityScreen() {
  const { profile, hasProfile } = useDogProfile();
  const { activities, weeklyStats, healthNotes, deleteHealthNote, deleteActivity } = useActivities();
  const { activeGoal } = useGoals();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'activities' | 'healthNotes'>(
    params.filter === 'healthNotes' ? 'healthNotes' : params.filter === 'activities' ? 'activities' : 'all'
  );
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const { setActiveScreen } = useTooltips();

  useFocusEffect(
    useCallback(() => {
      setActiveScreen('activity');
      setVisibleCount(5);
      return () => {
        setActiveScreen(null);
      };
    }, [setActiveScreen])
  );

  const combinedEntries = useMemo((): CombinedEntry[] => {
    const entries: CombinedEntry[] = [];
    
    activities.forEach(activity => {
      entries.push({
        type: 'activity',
        data: activity,
        timestamp: new Date(activity.activityDate || activity.date).getTime(),
      });
    });
    
    healthNotes.forEach(note => {
      entries.push({
        type: 'healthNote',
        data: note,
        timestamp: new Date(note.createdAt || note.date).getTime(),
      });
    });
    
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [activities, healthNotes]);

  const filteredEntries = useMemo(() => {
    let filtered = combinedEntries;
    
    if (entryTypeFilter === 'activities') {
      filtered = filtered.filter(e => e.type === 'activity');
    } else if (entryTypeFilter === 'healthNotes') {
      filtered = filtered.filter(e => e.type === 'healthNote');
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => {
        if (entry.type === 'activity') {
          const activity = entry.data as Activity;
          return (
            activity.type.toLowerCase().includes(query) ||
            (activity.notes?.toLowerCase().includes(query) ?? false)
          );
        } else {
          const note = entry.data as HealthNote;
          return note.text.toLowerCase().includes(query);
        }
      });
    }
    
    return filtered;
  }, [combinedEntries, entryTypeFilter, searchQuery]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEntries.length;
  const remainingCount = filteredEntries.length - visibleCount;

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const month = months[date.getMonth()];
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    return `${dayName} ${dayNum} ${month} · ${time}`;
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return Colors.dark.error;
      case 'moderate': return Colors.dark.warning;
      case 'low': return Colors.dark.textTertiary;
      default: return Colors.dark.textTertiary;
    }
  };

  const getIntensityBg = (intensity: string) => {
    switch (intensity) {
      case 'high': return Colors.dark.error + '20';
      case 'moderate': return Colors.dark.warning + '20';
      case 'low': return Colors.dark.textTertiary + '20';
      default: return Colors.dark.textTertiary + '20';
    }
  };

  const hasActivities = activities.length > 0;
  const hasHealthNotes = healthNotes.length > 0;
  const hasAnyEntries = hasActivities || hasHealthNotes;

  const primaryBreed = profile?.breedMakeup?.[0]?.breedName;
  const breedRecommendation = useMemo(() => 
    calculateBreedRecommendation(profile?.breedMakeup),
    [profile?.breedMakeup]
  );

  if (!hasProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAwareScreen
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.emptyStateHeader}>
            <View>
              <Text style={styles.headerTitle}>Activity Log</Text>
              <Text style={styles.headerSubtitle}>Track conditioning and performance</Text>
            </View>
          </View>

          <View style={styles.emptyState}>
            <ActivityIcon size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No Profile Yet</Text>
            <Text style={styles.emptyText}>
              Create a dog profile to track activities, health, and conditioning.
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
        </KeyboardAwareScreen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Activity Log</Text>
          <Text style={styles.headerSubtitle}>Track conditioning and performance</Text>
        </View>
        <View style={styles.headerActionsContainer}>
          <View style={styles.headerActions}>
            <Pressable 
              style={styles.healthNoteButton}
              onPress={() => router.push({ pathname: '/add-health-note' } as Href)}
            >
              <Heart size={18} color={Colors.dark.text} />
            </Pressable>
            <Pressable 
              style={styles.addButton}
              onPress={() => router.push({ pathname: '/add-activity' } as Href)}
            >
              <Plus size={20} color={Colors.dark.text} />
            </Pressable>
          </View>
          <Tooltip
            id="activity_log_actions"
            text="Log your dog's activity or add a health note here. You can filter your logs below."
            position="below"
            arrowPosition="right"
            screen="activity"
          />
        </View>
      </View>

      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {activeGoal && (
          <View style={styles.goalsSection}>
            <View style={styles.goalsSectionHeader}>
              <Text style={styles.goalsSectionTitle}>Active Goals</Text>
              <Pressable onPress={() => router.push({ pathname: '/manage-goals' } as Href)}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            {[activeGoal].map((goal: Goal) => {
              const range = Math.abs(goal.targetValue - goal.startValue);
              const progress = Math.abs(goal.currentValue - goal.startValue);
              const percentage = range > 0 ? Math.min((progress / range) * 100, 100) : 0;
              
              return (
                <Pressable 
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => router.push({ pathname: '/manage-goals' } as Href)}
                >
                  <View style={styles.goalCardHeader}>
                    <View>
                      <Text style={styles.goalCardName}>{goal.name}</Text>
                      <Text style={styles.goalCardType}>
                        {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.goalCardPercentage}>{percentage.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.goalCardProgressBar}>
                    <View 
                      style={[styles.goalCardProgressFill, { width: `${percentage}%` }]} 
                    />
                  </View>
                  <Text style={styles.goalCardStats}>
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <ActivityIcon size={20} color={Colors.dark.success} />
            <Text style={styles.statValue}>{weeklyStats.count}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={20} color={Colors.dark.primary} />
            <Text style={styles.statValue}>{weeklyStats.totalHours}h</Text>
            <Text style={styles.statLabel}>Time This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Zap size={20} color={Colors.dark.primary} />
            <Text style={styles.statValue}>{weeklyStats.totalTrainingPoints}</Text>
            <Text style={styles.statLabel}>Training Points</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Activity Log</Text>
            <View style={styles.filterContainer}>
              <Pressable 
                style={styles.filterButton}
                onPress={() => setShowFilterDropdown(!showFilterDropdown)}
              >
                <Filter size={16} color={entryTypeFilter !== 'all' ? Colors.dark.primary : Colors.dark.textSecondary} />
                <Text style={[styles.filterButtonText, entryTypeFilter !== 'all' && styles.filterButtonTextActive]}>
                  {entryTypeFilter === 'all' ? 'All' : entryTypeFilter === 'activities' ? 'Activities' : 'Health Notes'}
                </Text>
                <ChevronDown size={14} color={entryTypeFilter !== 'all' ? Colors.dark.primary : Colors.dark.textSecondary} />
              </Pressable>
            </View>
          </View>
          
          {showFilterDropdown && (
            <View style={styles.filterDropdown}>
              <Pressable 
                style={[styles.filterOption, entryTypeFilter === 'all' && styles.filterOptionActive]}
                onPress={() => { setEntryTypeFilter('all'); setShowFilterDropdown(false); }}
              >
                <Text style={[styles.filterOptionText, entryTypeFilter === 'all' && styles.filterOptionTextActive]}>All Entries</Text>
              </Pressable>
              <Pressable 
                style={[styles.filterOption, entryTypeFilter === 'activities' && styles.filterOptionActive]}
                onPress={() => { setEntryTypeFilter('activities'); setShowFilterDropdown(false); }}
              >
                <Text style={[styles.filterOptionText, entryTypeFilter === 'activities' && styles.filterOptionTextActive]}>Activities Only</Text>
              </Pressable>
              <Pressable 
                style={[styles.filterOption, entryTypeFilter === 'healthNotes' && styles.filterOptionActive]}
                onPress={() => { setEntryTypeFilter('healthNotes'); setShowFilterDropdown(false); }}
              >
                <Text style={[styles.filterOptionText, entryTypeFilter === 'healthNotes' && styles.filterOptionTextActive]}>Health Notes Only</Text>
              </Pressable>
            </View>
          )}

          {hasAnyEntries && (
            <View style={styles.searchContainer}>
              <Search size={16} color={Colors.dark.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search activities and notes..."
                placeholderTextColor={Colors.dark.textTertiary}
              />
            </View>
          )}

          {!hasActivities && (
            <Pressable 
              style={styles.firstTimeActivityCard}
              onPress={() => router.push({ pathname: '/add-activity' } as Href)}
            >
              <View style={styles.firstTimeActivityIconContainer}>
                <ActivityIcon size={24} color={Colors.dark.primary} />
              </View>
              <View style={styles.firstTimeCardContent}>
                <Text style={styles.firstTimeCardTitle}>Log Your First Activity</Text>
                <Text style={styles.firstTimeCardSubtitle}>
                  Track walks, training, and play to monitor conditioning
                </Text>
              </View>
              <Plus size={20} color={Colors.dark.primary} />
            </Pressable>
          )}

          {!hasHealthNotes && (
            <Pressable 
              style={styles.firstTimeHealthNoteCard}
              onPress={() => router.push({ pathname: '/add-health-note' } as Href)}
            >
              <View style={styles.firstTimeHealthNoteIconContainer}>
                <Heart size={24} color={Colors.dark.success} />
              </View>
              <View style={styles.firstTimeCardContent}>
                <Text style={styles.firstTimeCardTitle}>Add Your First Health Note</Text>
                <Text style={styles.firstTimeCardSubtitle}>
                  Track health observations for your vet records
                </Text>
              </View>
              <Plus size={20} color={Colors.dark.success} />
            </Pressable>
          )}

          {filteredEntries.length === 0 && hasAnyEntries && searchQuery.trim() && (
            <Text style={styles.noResultsText}>
              No entries match your search.
            </Text>
          )}

          {visibleEntries.map((entry) => {
            if (entry.type === 'activity') {
              const activity = entry.data as Activity;
              return (
                <View key={`activity-${activity.id}`} style={styles.activityEntryCard}>
                  <View style={styles.activityEntryHeader}>
                    <Text style={styles.activityEntryTitle}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                    </Text>
                    <View style={styles.entryActions}>
                      <View style={[
                        styles.activityEntryBadge, 
                        { backgroundColor: getIntensityBg(activity.effort) }
                      ]}>
                        <Text style={[
                          styles.activityEntryBadgeText, 
                          { color: getIntensityColor(activity.effort) }
                        ]}>
                          {activity.effort.charAt(0).toUpperCase() + activity.effort.slice(1)}
                        </Text>
                      </View>
                      <Pressable 
                        style={styles.entryActionButton}
                        onPress={() => router.push({ pathname: '/add-activity', params: { editId: activity.id } } as Href)}
                      >
                        <Pencil size={16} color={Colors.dark.primary} />
                      </Pressable>
                      <Pressable 
                        style={styles.entryActionButton}
                        onPress={() => deleteActivity(activity.id)}
                      >
                        <Trash2 size={16} color={Colors.dark.error} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.activityEntryStats}>
                    {activity.duration} min • {activity.trainingPoints} training pts
                  </Text>
                  {activity.notes && (
                    <Text style={styles.activityEntryNotes}>
                      {activity.notes}
                    </Text>
                  )}
                  {activity.weight && (
                    <Text style={styles.activityEntryWeight}>
                      Weight: {formatWeightWithUnit(activity.weight, profile?.preferredWeightUnit || 'kg')}
                    </Text>
                  )}
                  {activity.imageBase64 && (
                    <Pressable 
                      style={styles.activityPhoto}
                      onPress={() => setSelectedPhoto(activity.imageBase64!.startsWith('data:') ? activity.imageBase64! : `data:image/jpeg;base64,${activity.imageBase64}`)}
                    >
                      <Image 
                        source={{ uri: activity.imageBase64.startsWith('data:') ? activity.imageBase64 : `data:image/jpeg;base64,${activity.imageBase64}` }} 
                        style={styles.activityPhotoImage}
                        onError={(error) => {
                          console.error('[Activity] Image render error for activity:', activity.id, error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('[Activity] Image loaded for activity:', activity.id);
                        }}
                      />
                    </Pressable>
                  )}
                  <View style={styles.entryDateRow}>
                    <Text style={styles.activityEntryDate}>
                      {formatTimestamp(activity.activityDate || activity.date)}
                    </Text>
                    {activity.editedAt && (
                      <Text style={styles.editedLabel}>Edited</Text>
                    )}
                  </View>
                </View>
              );
            } else {
              const note = entry.data as HealthNote;
              return (
                <View key={`note-${note.id}`} style={styles.healthNoteEntryCard}>
                  <View style={styles.healthNoteEntryHeader}>
                    <View style={styles.healthNoteEntryBadge}>
                      <Heart size={12} color={Colors.dark.success} />
                      <Text style={styles.healthNoteEntryBadgeText}>Health Note</Text>
                    </View>
                    <View style={styles.entryActions}>
                      <Pressable 
                        style={styles.entryActionButton}
                        onPress={() => router.push({ pathname: '/add-health-note', params: { editId: note.id } } as Href)}
                      >
                        <Pencil size={16} color={Colors.dark.success} />
                      </Pressable>
                      <Pressable 
                        style={styles.entryActionButton}
                        onPress={() => deleteHealthNote(note.id)}
                      >
                        <Trash2 size={16} color={Colors.dark.error} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.healthNoteEntryText}>{note.text}</Text>
                  {note.weightKg && (
                    <Text style={styles.healthNoteEntryWeight}>
                      Weight: {formatWeightWithUnit(note.weightKg, profile?.preferredWeightUnit || 'kg')}
                    </Text>
                  )}
                  {note.bcsScore != null && (
                    <View style={styles.bcsBadge}>
                      <Text style={styles.bcsBadgeText}>BCS: {note.bcsScore}/9</Text>
                    </View>
                  )}
                  <View style={styles.entryDateRow}>
                    <Text style={styles.healthNoteEntryDate}>
                      {formatTimestamp(note.createdAt || note.date)}
                    </Text>
                    {note.editedAt && (
                      <Text style={styles.editedLabel}>Edited</Text>
                    )}
                  </View>
                </View>
              );
            }
          })}
          
          {(hasMore || visibleCount > 5) && (
            <View style={styles.loadMoreContainer}>
              <Pressable 
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount(prev => prev + 5)}
                disabled={!hasMore}
              >
                <Text style={[styles.loadMoreButtonText, !hasMore && styles.loadMoreButtonTextDisabled]}>
                  {hasMore ? `Show 5 more (${remainingCount} remaining)` : 'All entries shown'}
                </Text>
              </Pressable>
              {visibleCount > 5 && (
                <Pressable 
                  style={styles.condenseButton}
                  onPress={() => setVisibleCount(5)}
                >
                  <ChevronUp size={16} color={Colors.dark.primary} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {primaryBreed && (
          <View style={styles.sectionSeparator}>
            <View style={styles.sectionSeparatorLine} />
          </View>
        )}

        {primaryBreed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditioning Recommendations</Text>
            
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationTitle}>Training Points System</Text>
                {profile?.breedMakeup && profile.breedMakeup.length > 0 && (
                  <View style={styles.recommendationBadge}>
                    <Text style={styles.recommendationBadgeText}>{primaryBreed}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.recommendationText}>
                Training points represent total physical and mental workload across the week — not just time spent walking.
              </Text>
              
              <View style={styles.recommendationRangeBox}>
                <Text style={styles.recommendationRangeTitle}>Your Dog&apos;s Recommended Range</Text>
                <Text style={styles.recommendationRangeValue}>
                  {breedRecommendation.recommendedMin}–{breedRecommendation.recommendedMax} points/week
                </Text>
                <Text style={styles.recommendationRangeSubtext}>
                  {breedRecommendation.explanation}
                </Text>
              </View>

              <Text style={styles.recommendationBaseline}>
                All dogs benefit from a minimum of <Text style={styles.recommendationBaselineBold}>{breedRecommendation.baseMinimum} points per week</Text> for long-term health.
              </Text>
              
              {activeGoal?.type === 'conditioning' && (
                <View style={styles.recommendationTargetBox}>
                  <Text style={styles.recommendationTargetLabel}>Your Conditioning Goal</Text>
                  <Text style={styles.recommendationTargetValue}>{activeGoal.targetValue} points/week</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAwareScreen>

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable 
            style={styles.modalCloseButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <X size={24} color={Colors.dark.text} />
          </Pressable>
          {selectedPhoto && (
            <Image 
              source={{ uri: selectedPhoto }} 
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
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
  headerActionsContainer: {
    position: 'relative' as const,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionsTooltip: {
    right: 0,
    left: 'auto' as const,
    minWidth: 200,
  },
  healthNoteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalsSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  goalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalCardName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  goalCardType: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  goalCardPercentage: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  goalCardProgressBar: {
    height: 6,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalCardProgressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 3,
  },
  goalCardStats: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
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
  recommendationCard: {
    backgroundColor: Colors.dark.primary + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  recommendationBadge: {
    backgroundColor: Colors.dark.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendationBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  recommendationText: {
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendationTargetBox: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  recommendationTargetLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  recommendationTargetValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  recommendationRangeBox: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  recommendationRangeTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  recommendationRangeValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  recommendationRangeSubtext: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  recommendationBaseline: {
    fontSize: 12,
    color: Colors.dark.text,
    lineHeight: 18,
  },
  recommendationBaselineBold: {
    fontWeight: '700' as const,
  },
  activityEntryCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activityEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityEntryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  activityEntryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activityEntryBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  activityEntryStats: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  activityEntryNotes: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  activityEntryWeight: {
    fontSize: 12,
    color: Colors.dark.primary,
    marginBottom: 8,
  },
  activityEntryDate: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginTop: 4,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  loadMoreButton: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  loadMoreButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  loadMoreButtonTextDisabled: {
    color: Colors.dark.textTertiary,
  },
  condenseButton: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.dark.textTertiary,
    fontStyle: 'italic' as const,
  },

  weightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  weightBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  activityPhoto: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityPhotoImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background + 'F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute' as const,
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterContainer: {
    position: 'relative' as const,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterTooltip: {
    right: 0,
    left: 'auto' as const,
    minWidth: 220,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  filterButtonTextActive: {
    color: Colors.dark.primary,
  },
  filterDropdown: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden' as const,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  filterOptionActive: {
    backgroundColor: Colors.dark.primary + '15',
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  filterOptionTextActive: {
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.text,
    padding: 0,
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.dark.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: 24,
  },
  firstTimeActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
    gap: 12,
    marginBottom: 12,
  },
  firstTimeActivityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  firstTimeHealthNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.success + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.success + '30',
    gap: 12,
    marginBottom: 12,
  },
  firstTimeHealthNoteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.success + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  firstTimeCardContent: {
    flex: 1,
  },
  firstTimeCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  firstTimeCardSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  healthNoteEntryCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.success + '50',
  },
  healthNoteEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthNoteEntryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  healthNoteEntryBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.success,
  },
  healthNoteEntryText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  healthNoteEntryWeight: {
    fontSize: 12,
    color: Colors.dark.success,
    marginBottom: 8,
  },
  healthNoteEntryDate: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.dark.surfaceElevated,
  },
  bcsBadge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: Colors.dark.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  bcsBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.success,
  },
  sectionSeparator: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  sectionSeparatorLine: {
    height: 1,
    backgroundColor: Colors.dark.text,
    opacity: 0.12,
  },
  emptyContentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyStateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
  existingUsersLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginTop: 16,
  },
});
