export type DriveLevel = 'low' | 'medium' | 'high';

export const BREED_DRIVE_DATA: Record<string, DriveLevel> = {
  'Afghan Hound': 'medium',
  'Airedale Terrier': 'high',
  'Akita': 'medium',
  'Alaskan Malamute': 'high',
  'American Bulldog': 'medium',
  'American Bully': 'low',
  'American Pit Bull Terrier': 'high',
  'American Staffordshire Terrier': 'high',
  'Australian Cattle Dog': 'high',
  'Australian Shepherd': 'high',
  'Basenji': 'high',
  'Basset Hound': 'low',
  'Beagle': 'medium',
  'Belgian Malinois': 'high',
  'Belgian Tervuren': 'high',
  'Bernese Mountain Dog': 'medium',
  'Bichon Frise': 'medium',
  'Bloodhound': 'medium',
  'Border Collie': 'high',
  'Border Terrier': 'high',
  'Borzoi': 'medium',
  'Boston Terrier': 'medium',
  'Boxer': 'high',
  'Brittany': 'high',
  'Bull Terrier': 'high',
  'Bulldog': 'low',
  'Bullmastiff': 'low',
  'Cairn Terrier': 'high',
  'Cane Corso': 'medium',
  'Cavalier King Charles Spaniel': 'low',
  'Chihuahua': 'medium',
  'Chinese Crested': 'medium',
  'Chow Chow': 'low',
  'Cocker Spaniel': 'medium',
  'Collie': 'high',
  'Corgi (Pembroke Welsh)': 'high',
  'Corgi (Cardigan Welsh)': 'high',
  'Dachshund': 'medium',
  'Dalmatian': 'high',
  'Doberman Pinscher': 'high',
  'Dogo Argentino': 'high',
  'Dutch Shepherd': 'high',
  'English Setter': 'high',
  'English Springer Spaniel': 'high',
  'Fox Terrier': 'high',
  'French Bulldog': 'low',
  'German Shepherd': 'high',
  'German Shorthaired Pointer': 'high',
  'Giant Schnauzer': 'high',
  'Golden Retriever': 'high',
  'Great Dane': 'medium',
  'Great Pyrenees': 'medium',
  'Greyhound': 'medium',
  'Havanese': 'medium',
  'Husky (Siberian)': 'high',
  'Irish Setter': 'high',
  'Irish Wolfhound': 'medium',
  'Italian Greyhound': 'medium',
  'Jack Russell Terrier': 'high',
  'Japanese Chin': 'low',
  'Labrador Retriever': 'high',
  'Lhasa Apso': 'low',
  'Maltese': 'low',
  'Mastiff': 'low',
  'Miniature Pinscher': 'high',
  'Miniature Schnauzer': 'medium',
  'Newfoundland': 'medium',
  'Old English Sheepdog': 'medium',
  'Papillon': 'medium',
  'Pekingese': 'low',
  'Pointer': 'high',
  'Pomeranian': 'medium',
  'Poodle (Standard)': 'high',
  'Poodle (Miniature)': 'medium',
  'Poodle (Toy)': 'medium',
  'Portuguese Water Dog': 'high',
  'Pug': 'low',
  'Rhodesian Ridgeback': 'high',
  'Rottweiler': 'medium',
  'Saint Bernard': 'low',
  'Saluki': 'high',
  'Samoyed': 'high',
  'Schipperke': 'high',
  'Scottish Terrier': 'medium',
  'Shar Pei': 'low',
  'Shetland Sheepdog': 'high',
  'Shiba Inu': 'medium',
  'Shih Tzu': 'low',
  'Staffordshire Bull Terrier': 'high',
  'Vizsla': 'high',
  'Weimaraner': 'high',
  'West Highland White Terrier': 'high',
  'Whippet': 'medium',
  'Yorkshire Terrier': 'medium',
  'Mixed Breed': 'medium',
  'Other': 'medium',
};

export const BASE_MINIMUM_POINTS = 220;

export interface BreedRecommendation {
  baseMinimum: number;
  recommendedMin: number;
  recommendedMax: number;
  averageDrive: DriveLevel;
  explanation: string;
}

export function calculateBreedRecommendation(
  breedMakeup?: { breedName: string; percentage: number; isUnknown?: boolean }[]
): BreedRecommendation {
  if (!breedMakeup || breedMakeup.length === 0) {
    return {
      baseMinimum: BASE_MINIMUM_POINTS,
      recommendedMin: 280,
      recommendedMax: 360,
      averageDrive: 'medium',
      explanation: 'Based on general dog activity requirements',
    };
  }

  let totalWeight = 0;
  let weightedDriveScore = 0;

  for (const breed of breedMakeup) {
    const driveLevel = BREED_DRIVE_DATA[breed.breedName] || 'medium';
    const weight = breed.percentage / 100;
    
    let driveScore = 1.5;
    if (driveLevel === 'low') driveScore = 1.0;
    if (driveLevel === 'high') driveScore = 2.0;
    
    weightedDriveScore += driveScore * weight;
    totalWeight += weight;
  }

  const averageDriveScore = totalWeight > 0 ? weightedDriveScore / totalWeight : 1.5;

  let recommendedMin: number;
  let recommendedMax: number;
  let averageDrive: DriveLevel;

  if (averageDriveScore < 1.3) {
    averageDrive = 'low';
    recommendedMin = 220;
    recommendedMax = 280;
  } else if (averageDriveScore < 1.7) {
    averageDrive = 'medium';
    recommendedMin = 280;
    recommendedMax = 360;
  } else {
    averageDrive = 'high';
    recommendedMin = 360;
    recommendedMax = 500;
  }

  const primaryBreed = breedMakeup[0]?.breedName || 'Mixed Breed';
  const isMultiBreed = breedMakeup.length > 1;
  
  let explanation = `Based on ${primaryBreed}`;
  if (isMultiBreed) {
    explanation += ` mix composition`;
  }

  return {
    baseMinimum: BASE_MINIMUM_POINTS,
    recommendedMin,
    recommendedMax,
    averageDrive,
    explanation,
  };
}
