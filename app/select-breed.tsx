import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput } from "react-native";
import KeyboardAwareScreen from "@/components/KeyboardAwareScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Search } from "lucide-react-native";
import Colors from "@/constants/colors";
import { DOG_BREEDS } from "@/constants/breeds";

export default function SelectBreedScreen() {
  const params = useLocalSearchParams<{ mode: string; current?: string; breedId?: string; source?: string; pendingState?: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBreeds = DOG_BREEDS.filter(breed =>
    breed.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBreed = (breed: string) => {
    console.log('[SelectBreed] Selected breed:', breed, 'mode:', params.mode);
    
    if (params.mode === 'manage' && params.breedId) {
      router.navigate({
        pathname: '/manage-breeds',
        params: { 
          selectedBreed: breed, 
          breedId: params.breedId,
          source: params.source,
          pendingState: params.pendingState
        }
      });
    } else {
      router.navigate({
        pathname: '/edit-profile',
        params: { selectedBreed: breed, breedMode: params.mode }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          title: 'Select Breed',
          headerShown: true,
        }} 
      />
      
      <KeyboardAwareScreen
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={20} color={Colors.dark.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search breeds..."
              placeholderTextColor={Colors.dark.textTertiary}
              autoFocus
            />
          </View>
        </View>

        {filteredBreeds.map((breed) => (
          <Pressable
            key={breed}
            style={[
              styles.breedItem,
              params.current === breed && styles.breedItemSelected
            ]}
            onPress={() => handleSelectBreed(breed)}
          >
            <Text style={[
              styles.breedText,
              params.current === breed && styles.breedTextSelected
            ]}>
              {breed}
            </Text>
            {params.current === breed && (
              <View style={styles.selectedIndicator} />
            )}
          </Pressable>
        ))}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  breedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  breedItemSelected: {
    backgroundColor: Colors.dark.primary + '10',
  },
  breedText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  breedTextSelected: {
    fontWeight: '600' as const,
    color: Colors.dark.primary,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
  },
});
