import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, Platform } from "react-native";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from 'expo-router';
import { X, Plus, Target, Trash2, Edit, TrendingDown, TrendingUp, Zap } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useGoals } from "@/contexts/GoalContext";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { Goal } from "@/types/dog";
import { calculateBreedRecommendation } from "@/constants/breedDrive";

export default function ManageGoalsScreen() {
  const { goals, addGoal, updateGoal, deleteGoal, setActiveGoal, activeGoal, isSaving, getGoalProgress } = useGoals();
  const { profile } = useDogProfile();
  
  const breedRecommendation = useMemo(() => 
    calculateBreedRecommendation(profile?.breedMakeup),
    [profile?.breedMakeup]
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<'weight' | 'conditioning'>('weight');
  const [direction, setDirection] = useState<'lose' | 'gain'>('lose');
  const [targetValue, setTargetValue] = useState('');
  const [startValue, setStartValue] = useState('');

  const handleAddGoal = () => {
    if (goalType === 'weight') {
      if (!targetValue || isNaN(Number(targetValue)) || Number(targetValue) <= 0) {
        Alert.alert('Required', 'Please enter a valid target weight');
        return;
      }
      
      const currentWeight = profile?.weight || Number(startValue) || 0;
      const target = Number(targetValue);
      
      if (editingGoal) {
        updateGoal(editingGoal.id, {
          type: 'weight',
          direction,
          name: `${direction === 'lose' ? 'Weight Loss' : 'Weight Gain'} Goal`,
          targetValue: target,
          startValue: currentWeight,
          unit: 'kg',
        });
        setEditingGoal(null);
      } else {
        addGoal({
          type: 'weight',
          direction,
          name: `${direction === 'lose' ? 'Weight Loss' : 'Weight Gain'} Goal`,
          targetValue: target,
          startValue: currentWeight,
          unit: 'kg',
        });
      }
    } else {
      if (!targetValue || isNaN(Number(targetValue)) || Number(targetValue) <= 0) {
        Alert.alert('Required', 'Please enter a valid weekly training points target');
        return;
      }

      if (editingGoal) {
        updateGoal(editingGoal.id, {
          type: 'conditioning',
          name: 'Conditioning Goal',
          targetValue: Number(targetValue),
          weeklyTarget: Number(targetValue),
          startValue: 0,
          unit: 'points',
        });
        setEditingGoal(null);
      } else {
        addGoal({
          type: 'conditioning',
          name: 'Conditioning Goal',
          targetValue: Number(targetValue),
          weeklyTarget: Number(targetValue),
          startValue: 0,
          unit: 'points',
        });
      }
    }

    setTargetValue('');
    setStartValue('');
    setShowAddForm(false);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalType(goal.type);
    if (goal.type === 'weight') {
      setDirection(goal.direction || 'lose');
      setTargetValue(goal.targetValue.toString());
      setStartValue(goal.startValue.toString());
    } else {
      setTargetValue((goal.weeklyTarget || goal.targetValue).toString());
    }
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setShowAddForm(false);
    setTargetValue('');
    setStartValue('');
    setDirection('lose');
  };

  const handleDeleteGoal = (goalId: string, goalName: string) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goalId) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: 'Manage Goal',
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
        {!showAddForm && goals.length === 0 && (
          <View style={styles.emptyHeader}>
            <Target size={48} color={Colors.dark.primary} />
            <Text style={styles.emptyTitle}>Set a Goal</Text>
            <Text style={styles.emptyText}>
              Choose a goal type to start tracking your dog&apos;s progress.
            </Text>
          </View>
        )}

        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>{editingGoal ? 'Edit Goal' : 'Create Goal'}</Text>
            
            {editingGoal && (
              <View style={styles.editNotice}>
                <Text style={styles.editNoticeText}>
                  You can adjust or replace your goal at any time.
                </Text>
                <Text style={styles.editNoticeSubtext}>
                  Changing goal type will reset progress.
                </Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Goal Type</Text>
              <View style={styles.typeGrid}>
                <Pressable
                  style={[
                    styles.goalTypeCard,
                    goalType === 'weight' && styles.goalTypeCardActive
                  ]}
                  onPress={() => setGoalType('weight')}
                >
                  <View style={styles.goalTypeIcon}>
                    <Target size={24} color={goalType === 'weight' ? Colors.dark.primary : Colors.dark.textSecondary} />
                  </View>
                  <Text style={[
                    styles.goalTypeTitle,
                    goalType === 'weight' && styles.goalTypeTitleActive
                  ]}>
                    Weight Goal
                  </Text>
                  <Text style={styles.goalTypeDescription}>
                    Track weight changes over time and monitor progress toward a target body condition.
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.goalTypeCard,
                    goalType === 'conditioning' && styles.goalTypeCardActive
                  ]}
                  onPress={() => setGoalType('conditioning')}
                >
                  <View style={styles.goalTypeIcon}>
                    <Zap size={24} color={goalType === 'conditioning' ? Colors.dark.primary : Colors.dark.textSecondary} />
                  </View>
                  <Text style={[
                    styles.goalTypeTitle,
                    goalType === 'conditioning' && styles.goalTypeTitleActive
                  ]}>
                    Conditioning Goal
                  </Text>
                  <Text style={styles.goalTypeDescription}>
                    Improve stamina and performance by tracking weekly training points.
                  </Text>
                </Pressable>
              </View>
            </View>

            {goalType === 'weight' && (
              <>
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Direction</Text>
                  <View style={styles.directionRow}>
                    <Pressable
                      style={[
                        styles.directionButton,
                        direction === 'lose' && styles.directionButtonActive
                      ]}
                      onPress={() => setDirection('lose')}
                    >
                      <TrendingDown size={20} color={direction === 'lose' ? Colors.dark.text : Colors.dark.textSecondary} />
                      <Text style={[
                        styles.directionButtonText,
                        direction === 'lose' && styles.directionButtonTextActive
                      ]}>
                        Lose
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.directionButton,
                        direction === 'gain' && styles.directionButtonActive
                      ]}
                      onPress={() => setDirection('gain')}
                    >
                      <TrendingUp size={20} color={direction === 'gain' ? Colors.dark.text : Colors.dark.textSecondary} />
                      <Text style={[
                        styles.directionButtonText,
                        direction === 'gain' && styles.directionButtonTextActive
                      ]}>
                        Gain
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Target Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    placeholder={profile?.weight ? profile.weight.toString() : "0"}
                    placeholderTextColor={Colors.dark.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.helperText}>
                    Weight entries logged during activities will automatically update progress.
                  </Text>
                </View>
              </>
            )}

            {goalType === 'conditioning' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Weekly Training Points Target</Text>
                <TextInput
                  style={styles.input}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder={breedRecommendation.recommendedMin.toString()}
                  placeholderTextColor={Colors.dark.textTertiary}
                  keyboardType="numeric"
                />
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationBoxTitle}>Your Dog&apos;s Recommended Range</Text>
                  <Text style={styles.recommendationBoxValue}>
                    {breedRecommendation.recommendedMin}–{breedRecommendation.recommendedMax} points/week
                  </Text>
                  <Text style={styles.recommendationBoxSubtext}>
                    {breedRecommendation.explanation}
                  </Text>
                </View>
                <Text style={styles.helperText}>
                  A minimum of <Text style={styles.helperTextBold}>{breedRecommendation.baseMinimum} training points per week</Text> is recommended to maintain a healthy dog. Higher drive breeds and breed mixes will benefit from an increased workload.
                </Text>
              </View>
            )}

            <View style={styles.formActions}>
              <Pressable 
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.saveButton}
                onPress={handleAddGoal}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{editingGoal ? 'Update Goal' : 'Create Goal'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!showAddForm && goals.length === 0 && (
          <View style={styles.emptyActions}>
            <Pressable 
              style={styles.createButton}
              onPress={() => setShowAddForm(true)}
            >
              <Plus size={20} color={Colors.dark.text} />
              <Text style={styles.createButtonText}>Set a Goal</Text>
            </Pressable>
          </View>
        )}

        {!showAddForm && goals.length > 0 && (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Your Goals</Text>
              <Pressable 
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
              >
                <Plus size={20} color={Colors.dark.text} />
              </Pressable>
            </View>

            <View style={styles.goalsContainer}>
              {goals.map(goal => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal}
                  isActive={activeGoal?.id === goal.id}
                  progress={getGoalProgress(goal)}
                  onEdit={() => handleEditGoal(goal)}
                  onDelete={() => handleDeleteGoal(goal.id, goal.name)}
                  onSetActive={() => setActiveGoal(goal.id)}
                />
              ))}
            </View>
          </>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

function GoalCard({ goal, isActive, progress, onEdit, onDelete, onSetActive }: { 
  goal: Goal; 
  isActive: boolean;
  progress: number;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
}) {
  const progressBarColor = Colors.dark.primary;

  return (
    <View style={[styles.goalCard, isActive && styles.goalCardActive]}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleContainer}>
          <View style={styles.goalTitleRow}>
            <Text style={styles.goalName}>{goal.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.goalType}>
            {goal.type === 'weight' 
              ? `${goal.direction?.charAt(0).toUpperCase()}${goal.direction?.slice(1)} Weight`
              : 'Weekly Training Points'}
          </Text>
        </View>
        <View style={styles.goalActions}>
          {!isActive && (
            <Pressable 
              onPress={onSetActive}
              style={styles.iconButton}
            >
              <Target size={18} color={Colors.dark.primary} />
            </Pressable>
          )}
          <Pressable onPress={onEdit} style={styles.iconButton}>
            <Edit size={18} color={Colors.dark.primary} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconButton}>
            <Trash2 size={18} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.goalStats}>
        {goal.type === 'weight' ? (
          <>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatLabel}>Start</Text>
              <Text style={styles.goalStatValue}>{goal.startValue} {goal.unit}</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatLabel}>Current</Text>
              <Text style={styles.goalStatValue}>{goal.currentValue} {goal.unit}</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatLabel}>Target</Text>
              <Text style={styles.goalStatValue}>{goal.targetValue} {goal.unit}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatLabel}>This Week</Text>
              <Text style={styles.goalStatValue}>{goal.currentValue} {goal.unit}</Text>
            </View>
            <View style={styles.goalStat}>
              <Text style={styles.goalStatLabel}>Target</Text>
              <Text style={styles.goalStatValue}>{goal.targetValue} {goal.unit}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progress}%`, backgroundColor: progressBarColor }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: progressBarColor }]}>
          {progress.toFixed(0)}%
        </Text>
      </View>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 20,
  },
  editNotice: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  editNoticeText: {
    fontSize: 13,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  editNoticeSubtext: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  typeGrid: {
    gap: 12,
  },
  goalTypeCard: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  goalTypeCardActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '10',
  },
  goalTypeIcon: {
    marginBottom: 12,
  },
  goalTypeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  goalTypeTitleActive: {
    color: Colors.dark.primary,
  },
  goalTypeDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  directionButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  directionButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  directionButtonTextActive: {
    color: Colors.dark.text,
  },
  input: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    lineHeight: 16,
  },
  helperTextBold: {
    fontWeight: '700' as const,
  },
  helperTextHint: {
    fontStyle: 'italic' as const,
    color: Colors.dark.textTertiary,
  },
  recommendationBox: {
    backgroundColor: Colors.dark.primary + '10',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  recommendationBoxTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  recommendationBoxValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 4,
  },
  recommendationBoxSubtext: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  emptyHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  emptyActions: {
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  goalsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  goalCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  goalCardActive: {
    borderColor: Colors.dark.primary,
    borderWidth: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goalName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  goalType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
  },
  activeBadge: {
    backgroundColor: Colors.dark.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  goalStats: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  goalStat: {
    alignItems: 'center',
  },
  goalStatLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginBottom: 4,
  },
  goalStatValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700' as const,
    minWidth: 40,
    textAlign: 'right' as const,
  },
});
