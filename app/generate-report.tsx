import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  FileDown,
  Share2,
  Calendar,
  ChevronDown,
  Check,
  FileText,
  TrendingUp,
  Activity as ActivityIcon,
  ClipboardList,
  X,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useDogProfile } from '@/contexts/DogProfileContext';
import { useActivities } from '@/contexts/ActivityContext';
import { generateReportHTML } from '@/utils/reportGenerator';
import * as Haptics from 'expo-haptics';

type DateRangeOption = '30' | '60' | '90' | 'custom';

interface DateRangeChoice {
  key: DateRangeOption;
  label: string;
  shortLabel: string;
}

const DATE_RANGES: DateRangeChoice[] = [
  { key: '30', label: 'Last 30 Days', shortLabel: '30 days' },
  { key: '60', label: 'Last 60 Days', shortLabel: '60 days' },
  { key: '90', label: 'Last 90 Days', shortLabel: '90 days' },
  { key: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function GenerateReportScreen() {
  const { profile } = useDogProfile();
  const { activities, healthNotes } = useActivities();

  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('30');
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth());
  const [tempDay, setTempDay] = useState(new Date().getDate());

  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start: Date;

    if (selectedRange === 'custom') {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const cEnd = new Date(customEnd);
      cEnd.setHours(23, 59, 59, 999);
      return { start, end: cEnd };
    }

    const days = parseInt(selectedRange, 10);
    start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [selectedRange, customStart, customEnd]);

  const rangeLabel = useMemo(() => {
    if (selectedRange === 'custom') {
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
      };
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    return DATE_RANGES.find((r) => r.key === selectedRange)?.label || '';
  }, [selectedRange, customStart, customEnd]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const d = new Date(a.activityDate || a.date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [activities, dateRange]);

  const filteredNotes = useMemo(() => {
    return healthNotes.filter((n) => {
      const d = new Date(n.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [healthNotes, dateRange]);

  const stats = useMemo(() => {
    const totalDuration = filteredActivities.reduce((s, a) => s + a.duration, 0);
    const weightNotes = filteredNotes.filter((n) => n.weightKg != null && n.weightKg > 0);
    const bcsNotes = filteredNotes.filter((n) => n.bcsScore != null && n.bcsScore > 0);
    return {
      activityCount: filteredActivities.length,
      totalHours: (totalDuration / 60).toFixed(1),
      noteCount: filteredNotes.length,
      weightCount: weightNotes.length,
      bcsCount: bcsNotes.length,
    };
  }, [filteredActivities, filteredNotes]);

  const openDatePicker = useCallback((type: 'start' | 'end') => {
    const d = type === 'start' ? customStart : customEnd;
    setTempYear(d.getFullYear());
    setTempMonth(d.getMonth());
    setTempDay(d.getDate());
    setShowDatePicker(type);
  }, [customStart, customEnd]);

  const confirmDatePicker = useCallback(() => {
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const clampedDay = Math.min(tempDay, daysInMonth);
    const newDate = new Date(tempYear, tempMonth, clampedDay);

    if (showDatePicker === 'start') {
      if (newDate > customEnd) {
        Alert.alert('Invalid Range', 'Start date cannot be after end date.');
        return;
      }
      setCustomStart(newDate);
    } else {
      if (newDate < customStart) {
        Alert.alert('Invalid Range', 'End date cannot be before start date.');
        return;
      }
      if (newDate > new Date()) {
        Alert.alert('Invalid Range', 'End date cannot be in the future.');
        return;
      }
      setCustomEnd(newDate);
    }
    setShowDatePicker(null);
  }, [tempYear, tempMonth, tempDay, showDatePicker, customStart, customEnd]);

  const getFilename = useCallback(() => {
    const name = profile?.name?.replace(/\s+/g, '_') || 'Dog';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${name}_Fitness_Report_${dd}${mm}${yyyy}`;
  }, [profile]);

  const handleGenerate = useCallback(async () => {
    if (!profile) {
      Alert.alert('No Profile', 'Please create a dog profile first.');
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('[Report] Generating PDF report...');
      console.log('[Report] Range:', rangeLabel);
      console.log('[Report] Activities:', filteredActivities.length, 'Notes:', filteredNotes.length);

      const html = generateReportHTML({
        profile,
        activities: filteredActivities,
        healthNotes: filteredNotes,
        dateRange,
        rangeLabel,
      });

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('[Report] PDF generated at:', uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${profile.name} Fitness Report`,
          UTI: 'com.adobe.pdf',
        });
        console.log('[Report] PDF shared successfully');
      } else {
        Alert.alert('PDF Ready', 'Your report has been generated successfully.');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Report] Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  }, [profile, filteredActivities, filteredNotes, dateRange, rangeLabel, getFilename]);

  const handleDownload = useCallback(async () => {
    if (!profile) {
      Alert.alert('No Profile', 'Please create a dog profile first.');
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const html = generateReportHTML({
        profile,
        activities: filteredActivities,
        healthNotes: filteredNotes,
        dateRange,
        rangeLabel,
      });

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Save ${profile.name} Fitness Report`,
            UTI: 'com.adobe.pdf',
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Report] Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [profile, filteredActivities, filteredNotes, dateRange, rangeLabel]);

  const formatDisplayDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  };

  const daysInSelectedMonth = new Date(tempYear, tempMonth + 1, 0).getDate();

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Generate Report', headerBackTitle: 'Back' }} />
        <View style={styles.emptyContainer}>
          <FileText size={48} color={Colors.dark.textTertiary} />
          <Text style={styles.emptyTitle}>No Profile Found</Text>
          <Text style={styles.emptyText}>Create a dog profile to generate reports.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Generate Report', headerBackTitle: 'Back' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <FileText size={28} color={Colors.dark.primary} />
          </View>
          <Text style={styles.heroTitle}>Fitness & Conditioning Report</Text>
          <Text style={styles.heroSubtitle}>
            Generate a professional PDF summary of {profile.name}&apos;s health and activity data
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATE RANGE</Text>
          <View style={styles.rangeChips}>
            {DATE_RANGES.map((r) => (
              <Pressable
                key={r.key}
                style={[
                  styles.rangeChip,
                  selectedRange === r.key && styles.rangeChipActive,
                ]}
                onPress={() => {
                  setSelectedRange(r.key);
                  Haptics.selectionAsync();
                }}
                testID={`range-${r.key}`}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    selectedRange === r.key && styles.rangeChipTextActive,
                  ]}
                >
                  {r.shortLabel}
                </Text>
                {selectedRange === r.key && (
                  <Check size={14} color={Colors.dark.text} />
                )}
              </Pressable>
            ))}
          </View>

          {selectedRange === 'custom' && (
            <View style={styles.customDateRow}>
              <Pressable
                style={styles.datePickerBtn}
                onPress={() => openDatePicker('start')}
                testID="date-start"
              >
                <Calendar size={16} color={Colors.dark.primary} />
                <View>
                  <Text style={styles.dateLabel}>From</Text>
                  <Text style={styles.dateValue}>{formatDisplayDate(customStart)}</Text>
                </View>
              </Pressable>
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>→</Text>
              </View>
              <Pressable
                style={styles.datePickerBtn}
                onPress={() => openDatePicker('end')}
                testID="date-end"
              >
                <Calendar size={16} color={Colors.dark.primary} />
                <View>
                  <Text style={styles.dateLabel}>To</Text>
                  <Text style={styles.dateValue}>{formatDisplayDate(customEnd)}</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPORT PREVIEW</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewDogName}>{profile.name}</Text>
              <Text style={styles.previewRange}>{rangeLabel}</Text>
            </View>

            <View style={styles.previewStats}>
              <View style={styles.previewStat}>
                <View style={[styles.previewStatIcon, { backgroundColor: Colors.dark.primary + '18' }]}>
                  <ActivityIcon size={16} color={Colors.dark.primary} />
                </View>
                <Text style={styles.previewStatValue}>{stats.activityCount}</Text>
                <Text style={styles.previewStatLabel}>Activities</Text>
              </View>

              <View style={styles.previewStatDivider} />

              <View style={styles.previewStat}>
                <View style={[styles.previewStatIcon, { backgroundColor: '#4CAF5018' }]}>
                  <TrendingUp size={16} color={Colors.dark.success} />
                </View>
                <Text style={styles.previewStatValue}>{stats.totalHours}h</Text>
                <Text style={styles.previewStatLabel}>Duration</Text>
              </View>

              <View style={styles.previewStatDivider} />

              <View style={styles.previewStat}>
                <View style={[styles.previewStatIcon, { backgroundColor: '#FF980018' }]}>
                  <ClipboardList size={16} color={Colors.dark.warning} />
                </View>
                <Text style={styles.previewStatValue}>{stats.noteCount}</Text>
                <Text style={styles.previewStatLabel}>Notes</Text>
              </View>
            </View>

            <View style={styles.previewDetails}>
              <View style={styles.previewDetailRow}>
                <Text style={styles.previewDetailLabel}>Weight records</Text>
                <Text style={styles.previewDetailValue}>{stats.weightCount}</Text>
              </View>
              <View style={styles.previewDetailRow}>
                <Text style={styles.previewDetailLabel}>BCS records</Text>
                <Text style={styles.previewDetailValue}>{stats.bcsCount}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPORT INCLUDES</Text>
          <View style={styles.includesList}>
            {[
              'Dog profile & breed info',
              'Weight trend chart',
              'Body Condition Score trend',
              'Activity log with details',
              'Health notes history',
              'Period summary statistics',
            ].map((item, i) => (
              <View key={i} style={styles.includeItem}>
                <Check size={14} color={Colors.dark.success} />
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
            testID="generate-report"
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={Colors.dark.text} />
            ) : (
              <Share2 size={20} color={Colors.dark.text} />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : 'Generate & Share PDF'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.downloadButton, isGenerating && styles.downloadButtonDisabled]}
            onPress={handleDownload}
            disabled={isGenerating}
            testID="download-report"
          >
            <FileDown size={20} color={Colors.dark.primary} />
            <Text style={styles.downloadButtonText}>Download PDF</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Report data includes locally saved entries that may not yet be synced to the cloud. BCS values are owner-recorded observations.
        </Text>
      </ScrollView>

      <Modal
        visible={showDatePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(null)}>
          <Pressable style={styles.dateModal} onPress={() => {}}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>
                {showDatePicker === 'start' ? 'Start Date' : 'End Date'}
              </Text>
              <Pressable onPress={() => setShowDatePicker(null)} hitSlop={12}>
                <X size={20} color={Colors.dark.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map((y) => (
                    <Pressable
                      key={y}
                      style={[styles.datePickerItem, tempYear === y && styles.datePickerItemActive]}
                      onPress={() => setTempYear(y)}
                    >
                      <Text style={[styles.datePickerItemText, tempYear === y && styles.datePickerItemTextActive]}>
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>Month</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, i) => (
                    <Pressable
                      key={m}
                      style={[styles.datePickerItem, tempMonth === i && styles.datePickerItemActive]}
                      onPress={() => setTempMonth(i)}
                    >
                      <Text style={[styles.datePickerItemText, tempMonth === i && styles.datePickerItemTextActive]}>
                        {m.substring(0, 3)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerColumnLabel}>Day</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.datePickerItem, tempDay === d && styles.datePickerItemActive]}
                      onPress={() => setTempDay(d)}
                    >
                      <Text style={[styles.datePickerItemText, tempDay === d && styles.datePickerItemTextActive]}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Pressable style={styles.dateConfirmButton} onPress={confirmDatePicker}>
              <Text style={styles.dateConfirmText}>Confirm</Text>
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
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center' as const,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 28,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.dark.textTertiary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  rangeChips: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  rangeChip: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rangeChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  rangeChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
  rangeChipTextActive: {
    color: Colors.dark.text,
  },
  customDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 14,
    gap: 8,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.dark.textTertiary,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginTop: 2,
  },
  dateSeparator: {
    paddingHorizontal: 2,
  },
  dateSeparatorText: {
    fontSize: 16,
    color: Colors.dark.textTertiary,
  },
  previewCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden' as const,
  },
  previewHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  previewDogName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  previewRange: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  previewStats: {
    flexDirection: 'row' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center' as const,
  },
  previewStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  previewStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  previewStatLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    marginTop: 2,
  },
  previewStatDivider: {
    width: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 4,
  },
  previewDetails: {
    padding: 16,
  },
  previewDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
  },
  previewDetailLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  previewDetailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  includesList: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  includeItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  includeText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  actionsSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  downloadButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: Colors.dark.surface,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  dateModal: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  dateModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  dateModalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  datePickerRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerColumnLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.dark.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  datePickerScroll: {
    height: 180,
  },
  datePickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
    marginBottom: 2,
  },
  datePickerItemActive: {
    backgroundColor: Colors.dark.primary,
  },
  datePickerItemText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '500' as const,
  },
  datePickerItemTextActive: {
    color: Colors.dark.text,
    fontWeight: '700' as const,
  },
  dateConfirmButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  dateConfirmText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
});
