export type WeightUnit = 'kg' | 'lbs';

export interface DogProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female';
  weight: number; // Always stored in kg
  preferredWeightUnit: WeightUnit;
  profileImageBase64?: string;
  breedMakeup?: BreedInfo[];
  createdAt: string;
}

export interface BreedInfo {
  breedName: string;
  percentage: number;
  traits: string[];
  strengths: string[];
  risks: string[];
  conditioningNeeds: string;
  isUnknown?: boolean;
}

export interface Activity {
  id: string;
  dogId: string;
  type: 'walk' | 'training' | 'play' | 'run' | 'social' | 'other';
  duration: number;
  effort: 'low' | 'moderate' | 'high';
  trainingPoints: number;
  notes?: string;
  date: string;
  imageBase64?: string;
  weight?: number;
  activityDate: string;
  contributesToGoal?: boolean;
  editedAt?: string;
}

export interface WeeklyInsight {
  id: string;
  title: string;
  content: string;
  category: 'conditioning' | 'health' | 'training' | 'nutrition';
  publishedAt: string;
  externalLink?: string;
}

export interface Goal {
  id: string;
  type: 'weight' | 'conditioning';
  direction?: 'lose' | 'gain';
  name: string;
  targetValue: number;
  startValue: number;
  currentValue: number;
  unit: string;
  weeklyTarget?: number;
  weekStartDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HealthNote {
  id: string;
  dogId?: string;
  text: string;
  date: string;
  createdAt: string;
  weightKg?: number;
  bcsScore?: number | null;
  editedAt?: string;
}
