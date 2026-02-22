import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { isNetworkError } from '@/utils/networkHelper';

export interface BreedAnalysis {
  breedName: string;
  percentage?: number;
  geneticPurpose: string;
  mentalTraits: string;
  physicalConditioning: string;
  riskAwareness: string;
  trainingStrategy: string;
  mixedBreedInteraction?: string;
}

const breedAnalysisSchema = z.object({
  breeds: z.array(z.object({
    breedName: z.string(),
    percentage: z.number().optional(),
    geneticPurpose: z.string(),
    mentalTraits: z.string(),
    physicalConditioning: z.string(),
    riskAwareness: z.string(),
    trainingStrategy: z.string(),
  })),
  mixedBreedInteraction: z.string().optional(),
});

const buildAnalysisPrompt = (breeds: { name: string; percentage?: number; isUnknown?: boolean }[]) => {
  const hasOther = breeds.some(b => b.isUnknown || b.name === 'Other');
  
  let prompt = `You are an expert canine geneticist and conditioning specialist. Analyze the following breed(s) and provide comprehensive, structured insights.

CRITICAL INSTRUCTIONS:
- Use confident, structured, non-diagnostic language
- Present information as likely genetic influences, not certainties
- Avoid casual or entertainment-style pet advice
- Base insights on breed function, genetics, and working purpose
- Be authoritative but calm
- Output ONLY valid JSON matching the exact schema provided
- Do NOT include markdown, commentary, or prose outside the JSON object

`;

  if (breeds.length === 1) {
    const breed = breeds[0];
    if (breed.isUnknown || breed.name === 'Other') {
      prompt += `BREED TO ANALYZE: Other (unknown or uncertain genetic background)

For the "Other" breed component, provide GENERIC, NON-BREED-SPECIFIC guidance focusing on:
- General canine genetics and variability
- Universal conditioning principles applicable to any dog
- Common behavioral patterns across breeds
- Health observation cues that apply broadly
- Use conditional language like "Dogs with unknown lineage may..." or "Watch for patterns such as..."
- DO NOT reference any specific breed characteristics
- Focus on observation-based conditioning and load management

For each field:
- geneticPurpose: Explain general canine development and variation
- mentalTraits: Describe universal behavioral considerations
- physicalConditioning: Provide general conditioning principles
- riskAwareness: List common canine health and conditioning risks
- trainingStrategy: Give adaptable, observation-based training guidance`;
    } else {
      prompt += `BREED TO ANALYZE: ${breed.name}${breed.percentage ? ` (${breed.percentage}% genetic influence)` : ''}

Provide detailed analysis for this breed across all five required fields:
1. geneticPurpose: What the breed was originally developed to do
2. mentalTraits: Trainability, focus, sensitivity, and behavioral tendencies
3. physicalConditioning: Type, frequency, and intensity of activity needed
4. riskAwareness: Joint stress, overuse risks, and behavioral burnout patterns
5. trainingStrategy: Actionable guidance on training styles and recovery needs`;
    }
  } else {
    prompt += `BREEDS TO ANALYZE:\n`;
    breeds.forEach(b => {
      const label = (b.isUnknown || b.name === 'Other') ? 'Other (uncertain genetics)' : b.name;
      prompt += `- ${label}${b.percentage ? ` (${b.percentage}% genetic influence)` : ''}\n`;
    });
    
    prompt += `\nProvide SEPARATE analysis for EACH breed.\n`;
    
    if (hasOther) {
      prompt += `\nFor the "Other" breed component, provide GENERIC, NON-BREED-SPECIFIC guidance. Use conditional language and focus on universal principles. DO NOT reference specific breed traits for the "Other" section.\n`;
    }
    
    prompt += `\nThen provide mixedBreedInteraction explaining how these traits may interact, conflict, or dominate in training and conditioning.`;
  }
  
  return prompt;
};

const BREED_ANALYSIS_KEY = '@canine_intelligence:breed_analyses';

export const [BreedAnalysisProvider, useBreedAnalysis] = createContextHook(() => {
  const [analyses, setAnalyses] = useState<Map<string, BreedAnalysis[]>>(new Map());
  const queryClient = useQueryClient();

  const analysesQuery = useQuery({
    queryKey: ['breedAnalyses'],
    queryFn: async () => {
      console.log('[BreedAnalysis] Loading analyses from storage');
      try {
        const stored = await AsyncStorage.getItem(BREED_ANALYSIS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return new Map<string, BreedAnalysis[]>(Object.entries(parsed));
        }
        return new Map<string, BreedAnalysis[]>();
      } catch (error) {
        console.error('[BreedAnalysis] Error loading analyses:', error);
        return new Map<string, BreedAnalysis[]>();
      }
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (analysesQuery.data) {
      console.log('[BreedAnalysis] Loaded analyses from storage:', analysesQuery.data.size, 'entries');
      setAnalyses(analysesQuery.data);
    }
  }, [analysesQuery.data]);

  const generateAnalysisMutation = useMutation({
    mutationFn: async (breeds: { name: string; percentage?: number; isUnknown?: boolean }[]) => {
      const breedNames = breeds.map(b => b.name).join(' + ');
      
      const prompt = buildAnalysisPrompt(breeds);
      console.log('[BreedAnalysis] Generating analysis with prompt:', prompt);

      const response = await generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema: breedAnalysisSchema,
      });
      
      console.log('[BreedAnalysis] Received structured response:', response);
      
      const analyses: BreedAnalysis[] = response.breeds.map(breed => ({
        breedName: breed.breedName,
        percentage: breed.percentage,
        geneticPurpose: breed.geneticPurpose,
        mentalTraits: breed.mentalTraits,
        physicalConditioning: breed.physicalConditioning,
        riskAwareness: breed.riskAwareness,
        trainingStrategy: breed.trainingStrategy,
        mixedBreedInteraction: response.mixedBreedInteraction,
      }));
      
      return { key: breedNames, analyses };
    },
    onSuccess: async (data) => {
      console.log('[BreedAnalysis] Analysis generated successfully');
      const newAnalyses = new Map(analyses).set(data.key, data.analyses);
      setAnalyses(newAnalyses);
      
      try {
        const obj = Object.fromEntries(newAnalyses.entries());
        await AsyncStorage.setItem(BREED_ANALYSIS_KEY, JSON.stringify(obj));
        console.log('[BreedAnalysis] Analyses persisted to storage');
        queryClient.invalidateQueries({ queryKey: ['breedAnalyses'] });
      } catch (error) {
        console.error('[BreedAnalysis] Error persisting analyses:', error);
      }
    },
    onError: (error) => {
      if (isNetworkError(error)) {
        console.log('[BreedAnalysis] Offline: analysis generation skipped, will retry when connected');
      } else {
        console.log('[BreedAnalysis] Generation error:', error);
      }
    }
  });



  const getAnalysis = (breedNames: string[]) => {
    const key = breedNames.join(' + ');
    return analyses.get(key) || null;
  };

  const generateAnalysis = (breeds: { name: string; percentage?: number }[]) => {
    console.log('[BreedAnalysis] Generating analysis for:', breeds);
    generateAnalysisMutation.mutate(breeds);
  };

  const getBreedTrainingPointsRange = (breedMakeup?: { breedName: string; percentage: number; isUnknown?: boolean }[]) => {
    if (!breedMakeup || breedMakeup.length === 0) {
      return { minimum: 220, optimalMin: 300, optimalMax: 420 };
    }

    const workingBreeds = ['German Shepherd', 'Belgian Malinois', 'Border Collie', 'Australian Shepherd', 
      'Australian Cattle Dog', 'Siberian Husky', 'Alaskan Malamute', 'Doberman', 'Rottweiler'];
    
    const bullyMastiffBreeds = ['American Bully', 'English Bulldog', 'French Bulldog', 
      'Mastiff', 'Bull Mastiff', 'Cane Corso', 'Pug', 'Boston Terrier'];

    let workingPercentage = 0;
    let bullyMastiffPercentage = 0;
    let unknownPercentage = 0;

    breedMakeup.forEach(breed => {
      if (breed.isUnknown || breed.breedName === 'Other') {
        unknownPercentage += breed.percentage;
      } else if (workingBreeds.some(wb => breed.breedName.includes(wb))) {
        workingPercentage += breed.percentage;
      } else if (bullyMastiffBreeds.some(bm => breed.breedName.includes(bm))) {
        bullyMastiffPercentage += breed.percentage;
      }
    });

    if (bullyMastiffPercentage >= 50) {
      return { minimum: 220, optimalMin: 260, optimalMax: 340 };
    }
    
    if (workingPercentage >= 50) {
      return { minimum: 260, optimalMin: 380, optimalMax: 520 };
    }

    if (unknownPercentage >= 50) {
      return { minimum: 220, optimalMin: 300, optimalMax: 420 };
    }

    const weightedMin = (workingPercentage * 260 + bullyMastiffPercentage * 220 + unknownPercentage * 220) / 100;
    const weightedOptMin = (workingPercentage * 380 + bullyMastiffPercentage * 260 + unknownPercentage * 300) / 100;
    const weightedOptMax = (workingPercentage * 520 + bullyMastiffPercentage * 340 + unknownPercentage * 420) / 100;

    return {
      minimum: Math.round(weightedMin || 220),
      optimalMin: Math.round(weightedOptMin || 300),
      optimalMax: Math.round(weightedOptMax || 420)
    };
  };

  return {
    analyses,
    generateAnalysis,
    getAnalysis,
    getBreedTrainingPointsRange,
    isGenerating: generateAnalysisMutation.isPending,
    isLoading: analysesQuery.isLoading,
    error: generateAnalysisMutation.error && !isNetworkError(generateAnalysisMutation.error) ? generateAnalysisMutation.error : null,
  };
});
