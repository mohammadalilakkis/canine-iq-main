import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Dna, AlertTriangle, Plus, Settings, ChevronDown, ChevronUp } from "lucide-react-native";
import { router, useFocusEffect, Href } from "expo-router";

import Colors from "@/constants/colors";
import { useDogProfile } from "@/contexts/DogProfileContext";
import Tooltip from "@/components/Tooltip";
import { useBreedAnalysis } from "@/contexts/BreedAnalysisContext";
import { useTooltips } from "@/contexts/TooltipContext";

export default function IntelligenceScreen() {
  const { profile, hasProfile } = useDogProfile();
  const { generateAnalysis, getAnalysis, isGenerating } = useBreedAnalysis();
  
  const [expandedBreeds, setExpandedBreeds] = useState<Record<string, string[]>>({});
  const { setActiveScreen } = useTooltips();

  useFocusEffect(
    useCallback(() => {
      setActiveScreen('intelligence');
      return () => {
        setActiveScreen(null);
      };
    }, [setActiveScreen])
  );

  const breeds = useMemo(() => 
    profile?.breedMakeup && profile.breedMakeup.length > 0
      ? profile.breedMakeup.map(b => ({ 
          name: b.breedName, 
          percentage: b.percentage, 
          isUnknown: b.isUnknown || b.breedName === 'Other' 
        }))
      : [],
    [profile?.breedMakeup]
  )

  const breedNames = breeds.map(b => b.name);
  const analysis = getAnalysis(breedNames);

  useEffect(() => {
    if (hasProfile && breeds.length > 0 && !analysis && !isGenerating) {
      console.log('[Intelligence] Auto-generating analysis for breeds:', breeds);
      generateAnalysis(breeds);
    }
  }, [hasProfile, breeds, analysis, isGenerating, generateAnalysis]);

  const handleManualSelection = () => {
    if (!hasProfile) {
      router.push({ pathname: '/edit-profile' } as Href);
    } else {
      router.push({
        pathname: '/manage-breeds',
        params: { source: 'intelligence' }
      } as Href);
    }
  };

  const handleRegenerate = () => {
    if (breeds.length > 0) {
      generateAnalysis(breeds);
    }
  };



  const toggleSection = (breedName: string, section: string) => {
    setExpandedBreeds(prev => {
      const breedSections = prev[breedName] || [];
      const isExpanded = breedSections.includes(section);
      
      return {
        ...prev,
        [breedName]: isExpanded 
          ? breedSections.filter(s => s !== section)
          : [...breedSections, section]
      };
    });
  };

  const isSectionExpanded = (breedName: string, section: string) => {
    return expandedBreeds[breedName]?.includes(section) || false;
  };

  const AnalysisSection = ({ breedName, sectionKey, title, content }: { breedName: string; sectionKey: string; title: string; content?: string }) => {
    if (!content) return null;
    
    const isExpanded = isSectionExpanded(breedName, sectionKey);
    
    return (
      <Pressable 
        style={styles.analysisButton}
        onPress={() => toggleSection(breedName, sectionKey)}
      >
        <View style={styles.analysisButtonHeader}>
          <Text style={styles.analysisButtonTitle}>{title}</Text>
          {isExpanded ? (
            <ChevronUp size={18} color={Colors.dark.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.dark.textSecondary} />
          )}
        </View>
        {isExpanded && (
          <Text style={styles.analysisButtonContent}>{content}</Text>
        )}
      </Pressable>
    );
  };

  if (!hasProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Breed Intelligence</Text>
              <Text style={styles.headerSubtitle}>Tailored breed analysis for your dog</Text>
            </View>
          </View>

          <View style={styles.emptyState}>
            <Dna size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No Profile Yet</Text>
            <Text style={styles.emptyText}>
              Create a dog profile to unlock breed-aware conditioning guidance and health insights
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleManualSelection}>
              <Plus size={20} color={Colors.dark.text} />
              <Text style={styles.primaryButtonText}>Create Profile</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/login' } as Href)}>
              <Text style={styles.existingUsersLink}>Existing Users</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (breeds.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Breed Intelligence</Text>
            <Text style={styles.headerSubtitle}>Analyze genetics and breed-specific needs</Text>
          </View>

          <View style={styles.emptyState}>
            <Search size={64} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No Breeds Selected</Text>
            <Text style={styles.emptyText}>
              Add breed information to {profile?.name}&apos;s profile to receive tailored analysis
            </Text>
            <Pressable style={styles.primaryButton} onPress={handleManualSelection}>
              <Search size={20} color={Colors.dark.text} />
              <Text style={styles.primaryButtonText}>Select Breeds</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Breed Intelligence</Text>
            <Text style={styles.headerSubtitle}>Tailored breed analysis for {profile?.name}</Text>
          </View>
          <Pressable onPress={handleManualSelection}>
            <Settings size={24} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Breed Composition</Text>
          <View style={styles.breedCompositionCard}>
            {breeds.map((breed, index) => (
              <View key={`${breed.name}-${index}`} style={styles.breedCompositionRow}>
                <Text style={styles.breedCompositionName}>
                  {breed.name}{breed.isUnknown ? ' (Uncertain)' : ''}
                </Text>
                <Text style={styles.breedCompositionPercentage}>{breed.percentage}%</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.adjustButton} onPress={handleManualSelection}>
            <Settings size={16} color={Colors.dark.primary} />
            <Text style={styles.adjustButtonText}>Adjust Breed Percentages</Text>
          </Pressable>
        </View>



        {isGenerating && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingText}>Analyzing breed genetics and traits...</Text>
          </View>
        )}

        {!isGenerating && analysis && analysis.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.breedAnalysisTitleContainer}>
                <Text style={styles.sectionTitle}>Breed Analysis</Text>
                <Tooltip
                  id="intelligence_breed_insights"
                  text="Learn insights based on your dog's breed & composition"
                  position="below"
                  screen="intelligence"
                />
              </View>
              <Pressable onPress={handleRegenerate}>
                <Text style={styles.regenerateButton}>Regenerate</Text>
              </Pressable>
            </View>
            
            {analysis.map((breedAnalysis, index) => {
              const sections = [
                { key: 'geneticPurpose', title: 'Genetic Purpose', content: breedAnalysis.geneticPurpose },
                { key: 'mentalTraits', title: 'Mental & Behavioural Traits', content: breedAnalysis.mentalTraits },
                { key: 'physicalConditioning', title: 'Physical Conditioning', content: breedAnalysis.physicalConditioning },
                { key: 'riskAwareness', title: 'Risk & Weakness Awareness', content: breedAnalysis.riskAwareness },
                { key: 'trainingStrategy', title: 'Training & Conditioning Strategy', content: breedAnalysis.trainingStrategy },
              ];

              return (
                <View key={`${breedAnalysis.breedName}-${index}`} style={styles.breedCard}>
                  <View style={styles.breedHeader}>
                    <View style={styles.breedIconContainer}>
                      <Dna size={20} color={Colors.dark.primary} />
                    </View>
                    <View style={styles.breedHeaderText}>
                      <Text style={styles.breedName}>{breedAnalysis.breedName}</Text>
                      {breedAnalysis.percentage && (
                        <Text style={styles.breedPercentage}>{breedAnalysis.percentage}% genetic influence</Text>
                      )}
                    </View>
                  </View>

                  {sections.map(section => (
                    <AnalysisSection 
                      key={section.key}
                      breedName={breedAnalysis.breedName}
                      sectionKey={section.key}
                      title={section.title}
                      content={section.content}
                    />
                  ))}
                </View>
              );
            })}

            {analysis.length > 1 && analysis[0].mixedBreedInteraction && (
              <View style={styles.mixedBreedCard}>
                <Text style={styles.mixedBreedTitle}>Mixed-Breed Interaction</Text>
                <Text style={styles.mixedBreedText}>{analysis[0].mixedBreedInteraction}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.warningCard}>
          <AlertTriangle size={16} color={Colors.dark.warning} />
          <Text style={styles.warningText}>
            Breed analysis is not a medical diagnosis. Consult a veterinarian for health concerns.
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breedAnalysisTitleContainer: {
    position: 'relative' as const,
  },
  breedInsightsTooltip: {
    left: 0,
    minWidth: 200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  regenerateButton: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  breedCompositionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
  },
  breedCompositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breedCompositionName: {
    fontSize: 15,
    color: Colors.dark.text,
    fontWeight: '500' as const,
  },
  breedCompositionPercentage: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  toolCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  toolContent: {
    flex: 1,
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  loadingCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 32,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  breedCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  breedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  breedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breedHeaderText: {
    flex: 1,
  },
  breedName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  breedPercentage: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  analysisButton: {
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  analysisButtonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisButtonTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  analysisButtonContent: {
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  mixedBreedCard: {
    backgroundColor: Colors.dark.primary + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '30',
  },
  mixedBreedTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 8,
  },
  mixedBreedText: {
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  warningCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: Colors.dark.warning + '15',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.dark.warning + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: Colors.dark.text,
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
  existingUsersLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dark.primary,
    marginTop: 16,
  },
});
