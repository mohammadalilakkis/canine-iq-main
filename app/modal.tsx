import { Stack, router } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '@/constants/colors';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Modal' }} />
      <Pressable onPress={() => router.back()} style={styles.button}>
        <Text style={styles.text}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
  },
  button: {
    padding: 16,
  },
  text: {
    color: Colors.dark.text,
    fontSize: 16,
  },
});
