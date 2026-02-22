import { WeeklyInsight } from '@/types/dog';

export const WEEKLY_INSIGHTS: WeeklyInsight[] = [
  {
    id: '1',
    title: 'Understanding Drive vs. Reactivity',
    content: 'High-drive dogs are often mislabeled as reactive. Learn to distinguish working intensity from behavioral issues. True drive is focused, purposeful energy that can be channeled through training. Reactivity stems from stress, fear, or overstimulation.',
    category: 'training',
    publishedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Joint Stress in Working Breeds',
    content: 'Working breeds require careful conditioning progression. Sudden increases in high-intensity work can stress developing joints. Build gradually, monitor recovery, and balance power work with controlled movement.',
    category: 'health',
    publishedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: '3',
    title: 'Mental Fatigue: The Hidden Factor',
    content: 'Physical exhaustion is obvious. Mental fatigue is not. High-drive dogs need cognitive work as much as physical output. Scent work, problem-solving, and structured obedience prevent behavioral deterioration.',
    category: 'conditioning',
    publishedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '4',
    title: 'Recovery: Not a Weakness',
    content: 'Rest days are performance tools, not concessions. Tissue adaptation occurs during recovery, not during work. Strategic rest prevents injury and maintains sustainable performance over years.',
    category: 'conditioning',
    publishedAt: '2024-01-22T00:00:00Z',
  },
  {
    id: '5',
    title: 'Breed Function & Modern Life',
    content: 'Breeds developed for specific work have genetic needs that don\'t disappear in pet homes. Understanding original function helps owners meet needs appropriately rather than suppress natural behaviors.',
    category: 'training',
    publishedAt: '2024-01-29T00:00:00Z',
  },
  {
    id: '6',
    title: 'Nutritional Demands of High Output',
    content: 'Working dogs have different nutritional needs than sedentary pets. Energy density, protein quality, and meal timing affect performance and recovery. Consult professionals for conditioning-aware nutrition.',
    category: 'nutrition',
    publishedAt: '2024-02-05T00:00:00Z',
  },
];

export function getCurrentWeekInsight(): WeeklyInsight {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const weekOfYear = Math.floor(dayOfYear / 7);
  const index = weekOfYear % WEEKLY_INSIGHTS.length;
  return WEEKLY_INSIGHTS[index];
}
