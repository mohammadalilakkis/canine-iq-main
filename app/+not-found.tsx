import { Link, Stack } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.text}>This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Return to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontSize: 72,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 24,
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
});
