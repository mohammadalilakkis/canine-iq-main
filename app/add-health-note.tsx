import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput, Alert, Modal, Platform } from "react-native";
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { X, Heart } from "lucide-react-native";
import Colors from "@/constants/colors";
import { useActivities } from "@/contexts/ActivityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDogProfile } from "@/contexts/DogProfileContext";
import { WeightUnit } from "@/types/dog";
import { convertDisplayValue, parseWeightToKg } from "@/utils/weightUtils";



const NOTE_TYPES = [
  { id: 'general', label: 'General Observation' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'medication', label: 'Medication' },
  { id: 'behavior', label: 'Behavior Change' },
  { id: 'appetite', label: 'Appetite' },
  { id: 'injury', label: 'Injury' },
  { id: 'vet_visit', label: 'Vet Visit' },
];

export default function AddHealthNoteScreen() {
  const { addHealthNote, updateHealthNote, healthNotes } = useActivities();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { trackMeaningfulAction } = useAuth();
  const { profile } = useDogProfile();
  
  const isEditMode = !!params.editId;
  const editingNote = isEditMode ? healthNotes.find(n => n.id === params.editId) : null;
  
  const [noteType, setNoteType] = useState<string>('general');
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile?.preferredWeightUnit || 'kg');
  const [bcsScore, setBcsScore] = useState<number | null>(null);

  useEffect(() => {
    if (editingNote) {
      const typeMatch = editingNote.text.match(/^\[([^\]]+)\]/);
      if (typeMatch) {
        const typeLabel = typeMatch[1];
        const foundType = NOTE_TYPES.find(t => t.label === typeLabel);
        if (foundType) {
          setNoteType(foundType.id);
        }
        setNoteText(editingNote.text.replace(/^\[[^\]]+\]\s*/, ''));
      } else {
        setNoteText(editingNote.text);
      }
      if (editingNote.createdAt) {
        setSelectedDate(new Date(editingNote.createdAt));
      }
      if (editingNote.weightKg !== undefined && editingNote.weightKg !== null) {
        const weightVal = typeof editingNote.weightKg === 'number' ? editingNote.weightKg : parseFloat(String(editingNote.weightKg));
        if (typeof weightVal === 'number' && !isNaN(weightVal)) {
          const converted = weightUnit === 'lbs' ? weightVal * 2.20462 : weightVal;
          const displayWeight = typeof converted === 'number' ? converted.toFixed(1) : '0.0';
          setWeight(displayWeight);
        }
      }
      if (editingNote.bcsScore !== undefined && editingNote.bcsScore !== null) {
        setBcsScore(editingNote.bcsScore);
      }
    }
  }, [editingNote, weightUnit]);

  const handleSave = () => {
    if (!noteText.trim()) {
      Alert.alert('Required', 'Please enter a health note');
      return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    if (selectedDate > now) {
      Alert.alert('Invalid Date', 'Cannot add notes in the future');
      return;
    }

    if (selectedDate < sevenDaysAgo) {
      Alert.alert('Invalid Date', 'Cannot backdate notes more than 7 days');
      return;
    }

    setIsSaving(true);

    const selectedType = NOTE_TYPES.find(t => t.id === noteType);
    const fullNoteText = `[${selectedType?.label || 'General'}] ${noteText.trim()}`;

    if (isEditMode && editingNote) {
      const parsedWeight = weight.trim() ? parseWeightToKg(weight, weightUnit) : null;
      const updatedWeightKg = parsedWeight !== null ? parsedWeight : undefined;
      console.log('[AddHealthNote] Updating health note:', fullNoteText, 'Weight (kg):', updatedWeightKg, 'BCS:', bcsScore);
      updateHealthNote(editingNote.id, { text: fullNoteText, createdAt: selectedDate.toISOString(), weightKg: updatedWeightKg, bcsScore: bcsScore });
      setIsSaving(false);
      Alert.alert('Success', 'Health note updated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      const weightKg = weight.trim() ? parseWeightToKg(weight, weightUnit) : undefined;
      console.log('[AddHealthNote] Saving health note:', fullNoteText, 'Date:', selectedDate.toISOString(), 'Weight (kg):', weightKg, 'BCS:', bcsScore);
      addHealthNote(fullNoteText, selectedDate.toISOString(), weightKg ?? undefined, bcsScore);
      setIsSaving(false);
      Alert.alert('Success', 'Health note added', [
        { text: 'OK', onPress: () => {
          trackMeaningfulAction();
          router.back();
        }}
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: isEditMode ? "Edit Health Note" : "Add Health Note",
          headerShown: true,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <X size={24} color={Colors.dark.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable 
              onPress={handleSave}
              disabled={isSaving || !noteText.trim()}
              style={{ opacity: (!noteText.trim() || isSaving) ? 0.5 : 1 }}
            >
              <Text style={styles.saveHeaderButton}>Save</Text>
            </Pressable>
          ),
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Heart size={24} color={Colors.dark.success} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Health Note</Text>
            <Text style={styles.headerSubtitle}>
              Track health observations for your vet records
            </Text>
          </View>
        </View>

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
          <Text style={styles.sectionTitle}>Note Type</Text>
          <View style={styles.typeGrid}>
            {NOTE_TYPES.map(type => (
              <Pressable
                key={type.id}
                style={[
                  styles.typeButton,
                  noteType === type.id && styles.typeButtonActive
                ]}
                onPress={() => setNoteType(type.id)}
              >
                <Text style={[
                  styles.typeButtonText,
                  noteType === type.id && styles.typeButtonTextActive
                ]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Describe the health observation..."
            placeholderTextColor={Colors.dark.textTertiary}
            multiline
            numberOfLines={6}
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Condition Score (Optional)</Text>
          <Text style={styles.bcsDescription}>
            Rate your dog&apos;s body condition on a scale of 1 to 9
          </Text>
          <View style={styles.bcsContainer}>
            <Pressable
              style={[styles.bcsStepperButton, bcsScore !== null && bcsScore > 1 ? styles.bcsStepperButtonActive : styles.bcsStepperButtonDisabled]}
              onPress={() => {
                if (bcsScore !== null && bcsScore > 1) {
                  setBcsScore(bcsScore - 1);
                }
              }}
              disabled={bcsScore === null || bcsScore <= 1}
            >
              <Text style={[styles.bcsStepperText, bcsScore !== null && bcsScore > 1 ? styles.bcsStepperTextActive : styles.bcsStepperTextDisabled]}>−</Text>
            </Pressable>
            <Pressable
              style={[styles.bcsValueContainer, bcsScore !== null && styles.bcsValueContainerActive]}
              onPress={() => {
                if (bcsScore === null) {
                  setBcsScore(5);
                }
              }}
            >
              <Text style={[styles.bcsValue, bcsScore !== null && styles.bcsValueActive]}>
                {bcsScore !== null ? bcsScore : '—'}
              </Text>
              <Text style={styles.bcsValueLabel}>
                {bcsScore !== null ? `${bcsScore} / 9` : 'Tap to set'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.bcsStepperButton, bcsScore !== null && bcsScore < 9 ? styles.bcsStepperButtonActive : styles.bcsStepperButtonDisabled]}
              onPress={() => {
                if (bcsScore !== null && bcsScore < 9) {
                  setBcsScore(bcsScore + 1);
                } else if (bcsScore === null) {
                  setBcsScore(5);
                }
              }}
              disabled={bcsScore !== null && bcsScore >= 9}
            >
              <Text style={[styles.bcsStepperText, bcsScore !== null && bcsScore < 9 ? styles.bcsStepperTextActive : styles.bcsStepperTextDisabled]}>+</Text>
            </Pressable>
          </View>
          {bcsScore !== null && (
            <View style={styles.bcsScaleRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
                <Pressable
                  key={score}
                  style={[styles.bcsScaleDot, score === bcsScore && styles.bcsScaleDotActive]}
                  onPress={() => setBcsScore(score)}
                >
                  <Text style={[styles.bcsScaleNumber, score === bcsScore && styles.bcsScaleNumberActive]}>
                    {score}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {bcsScore !== null && (
            <Pressable onPress={() => setBcsScore(null)} style={styles.bcsClearButton}>
              <Text style={styles.bcsClearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>
            Health notes help you track patterns and provide valuable information during vet visits. Include dates, symptoms, and any relevant details.
          </Text>
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
  saveHeaderButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.success,
  },
  headerCard: {
    margin: 20,
    backgroundColor: Colors.dark.success + '15',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.success + '30',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
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
    borderColor: Colors.dark.success,
    backgroundColor: Colors.dark.success + '10',
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.textTertiary,
  },
  unitToggleTextActive: {
    color: Colors.dark.success,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.dark.success + '20',
    borderColor: Colors.dark.success,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.dark.success,
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
    minHeight: 140,
    paddingTop: 16,
  },

  tipCard: {
    margin: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 12,
    padding: 16,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    lineHeight: 19,
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
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  dateOptionSelected: {
    backgroundColor: Colors.dark.success + '15',
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  dateOptionTextSelected: {
    color: Colors.dark.success,
  },
  dateOptionDate: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  dateOptionDateSelected: {
    color: Colors.dark.success,
  },
  datePickerCancel: {
    padding: 16,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  bcsDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  bcsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 16,
  },
  bcsStepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  bcsStepperButtonActive: {
    backgroundColor: Colors.dark.success + '20',
    borderColor: Colors.dark.success,
  },
  bcsStepperButtonDisabled: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  bcsStepperText: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  bcsStepperTextActive: {
    color: Colors.dark.success,
  },
  bcsStepperTextDisabled: {
    color: Colors.dark.textTertiary,
  },
  bcsValueContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bcsValueContainerActive: {
    borderColor: Colors.dark.success,
    backgroundColor: Colors.dark.success + '10',
  },
  bcsValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.textTertiary,
  },
  bcsValueActive: {
    color: Colors.dark.success,
  },
  bcsValueLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  bcsScaleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  bcsScaleDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bcsScaleDotActive: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success,
  },
  bcsScaleNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textTertiary,
  },
  bcsScaleNumberActive: {
    color: Colors.dark.text,
  },
  bcsClearButton: {
    alignSelf: 'center' as const,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  bcsClearText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
});
