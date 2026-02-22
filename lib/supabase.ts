import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://lqbivuiykqfweshoutuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxYml2dWl5a3Fmd2VzaG91dHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzU4MzYsImV4cCI6MjA4NTU1MTgzNn0.CzEYljC0di9Hz9IDPXMUhO66qY-6-wEhTeI3-ML6a84';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface DbDog {
  id: string;
  user_id: string;
  name: string;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  preferred_weight_unit: 'kg' | 'lbs';
  profile_image_base64?: string;
  created_at: string;
  updated_at: string;
}

export interface DbBreedComponent {
  id: string;
  dog_id: string;
  breed_name: string;
  percentage: number;
  traits: string[];
  strengths: string[];
  risks: string[];
  conditioning_needs: string;
  is_unknown: boolean;
  created_at: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  dog_id: string;
  type: 'walk' | 'training' | 'play' | 'run' | 'social' | 'other';
  duration: number;
  effort: 'low' | 'moderate' | 'high';
  training_points: number;
  notes?: string;
  date: string;
  image_base64?: string;
  weight?: number;
  activity_date: string;
  contributes_to_goal: boolean;
  edited_at?: string;
  created_at: string;
}

export interface DbHealthNote {
  id: string;
  user_id: string;
  dog_id: string;
  text: string;
  date: string;
  weight_kg?: number;
  bcs_score?: number | null;
  edited_at?: string;
  created_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  dog_id: string;
  type: 'weight' | 'conditioning';
  direction?: 'lose' | 'gain';
  name: string;
  target_value: number;
  start_value: number;
  current_value: number;
  unit: string;
  weekly_target?: number;
  week_start_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
