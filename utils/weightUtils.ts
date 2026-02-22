import { WeightUnit } from '@/types/dog';

export const KG_TO_LBS = 2.20462;

export const convertKgToLbs = (kg: number): number => kg * KG_TO_LBS;

export const convertLbsToKg = (lbs: number): number => lbs / KG_TO_LBS;

export const roundWeight = (value: number): number => {
  return Math.round(value * 10) / 10;
};

export const formatWeightForDisplay = (kgValue: number, unit: WeightUnit): string => {
  const converted = unit === 'lbs' ? convertKgToLbs(kgValue) : kgValue;
  return roundWeight(converted).toString();
};

export const formatWeightWithUnit = (kgValue: number, unit: WeightUnit): string => {
  const displayValue = formatWeightForDisplay(kgValue, unit);
  return `${displayValue} ${unit}`;
};

export const parseWeightToKg = (inputValue: string, inputUnit: WeightUnit): number | null => {
  const parsed = parseFloat(inputValue);
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }
  const kgValue = inputUnit === 'lbs' ? convertLbsToKg(parsed) : parsed;
  return roundWeight(kgValue);
};

export const convertDisplayValue = (
  currentValue: string,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): string => {
  if (!currentValue) return '';
  const parsed = parseFloat(currentValue);
  if (isNaN(parsed)) return '';
  
  if (fromUnit === toUnit) return currentValue;
  
  const converted = fromUnit === 'kg' ? convertKgToLbs(parsed) : convertLbsToKg(parsed);
  return roundWeight(converted).toString();
};
