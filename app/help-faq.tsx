import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Stack } from "expo-router";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react-native";
import Colors from "@/constants/colors";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "How does the K9 Coach work?",
    answer:
      "The K9 Coach is your dog's personalized fitness and wellness advisor built right into Canine iQ. It analyzes your dog's breed composition, age, weight, activity history, and health notes to deliver tailored recommendations.\n\nHere's how it works:\n\n• Breed-Aware Guidance: The coach understands breed-specific traits — energy levels, common health concerns, and exercise needs — so recommendations fit your dog's natural tendencies.\n\n• Activity Analysis: Based on the activities you log (walks, runs, training sessions, play), the coach tracks patterns, identifies trends, and suggests adjustments. For example, if your dog hasn't hit their daily movement target, the coach may suggest a short walk or play session.\n\n• Health Integration: Health notes like weight changes, body condition scores, and vet visits feed into the coach's recommendations. If your dog's weight is trending up, the coach may suggest increasing activity or adjusting intensity.\n\n• Adaptive Suggestions: The more data you log, the smarter the coach gets. It adapts over time to your dog's routine, seasonal changes, and evolving health needs.\n\nYou can access the K9 Coach settings from the Dashboard. No internet connection is required — the coach works fully offline using your locally stored data.",
  },
  {
    question: "How do I add a new activity?",
    answer:
      "From the Activity tab, tap the \"+\" button at the top right. Choose your activity type (walk, run, training, etc.), fill in the details like duration and intensity, then tap Save. The activity will appear in your log immediately.",
  },
  {
    question: "How do I add a health note?",
    answer:
      "Go to the Activity tab and tap \"Add Health Note\" or use the \"+\" button. You can record weight, body condition score, veterinary visits, medications, and general observations. Health notes help you track your dog's wellness over time.",
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer:
      "On the login screen, tap \"Forgot Password\" and enter the email address associated with your account. You'll receive a password reset link via email. If you don't see it, check your spam folder.",
  },
  {
    question: "I'm not receiving the verification email.",
    answer:
      "Verification emails can sometimes be delayed or filtered. Check your spam/junk folder first. If you still don't see it after a few minutes, try signing up again with the same email. Make sure the email address is typed correctly.",
  },
  {
    question: "Can I use the app without creating an account?",
    answer:
      "Yes! Canine iQ works fully offline and without an account. All your data is stored locally on your device. Creating an account is optional and enables cloud backup so you don't lose data if you switch devices.",
  },
  {
    question: "How do notifications work?",
    answer:
      "You can enable or disable notifications from App Settings. When enabled, you may receive reminders for activity goals, health check-ins, and app updates. You can toggle them off at any time.",
  },
  {
    question: "How is my dog's breed information used?",
    answer:
      "Breed data helps personalize activity recommendations and intelligence insights based on breed-specific traits, energy levels, and health considerations. You can adjust breed percentages in your dog's profile at any time.",
  },
  {
    question: "Can I edit or delete a logged activity?",
    answer:
      "Currently, activities are logged as a permanent record to maintain accuracy. If you made an error, you can add a new note or activity with the correct information. Future updates may include editing capabilities.",
  },
  {
    question: "What is the Generate Report feature?",
    answer:
      "Generate Report creates a summary of your dog's activity history, health notes, and trends over a selected period. This is useful for sharing with your veterinarian or keeping personal records.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Your data is stored locally on your device by default. If you create an account, data is synced to secure cloud servers. We do not sell or share your personal information. See our Privacy Policy for full details.",
  },
];

export default function HelpFAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Help & FAQ" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.pageDescription}>
          Find answers to common questions about using Canine iQ.
        </Text>

        {FAQ_DATA.map((item, index) => (
          <Pressable
            key={index}
            style={[
              styles.faqCard,
              expandedIndex === index && styles.faqCardExpanded,
            ]}
            onPress={() => toggleExpand(index)}
          >
            <View style={styles.questionRow}>
              <Text style={styles.questionText}>{item.question}</Text>
              {expandedIndex === index ? (
                <ChevronUp size={18} color={Colors.dark.textTertiary} />
              ) : (
                <ChevronDown size={18} color={Colors.dark.textTertiary} />
              )}
            </View>
            {expandedIndex === index && (
              <Text style={styles.answerText}>{item.answer}</Text>
            )}
          </Pressable>
        ))}

        <View style={styles.contactSection}>
          <View style={styles.contactHeader}>
            <MessageSquare size={18} color={Colors.dark.primary} />
            <Text style={styles.contactTitle}>Still need help?</Text>
          </View>
          <Text style={styles.contactText}>
            Reach out to us at support@canineiq.app and we'll get back to you as
            soon as possible.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  pageDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  faqCardExpanded: {
    borderColor: Colors.dark.primary + "40",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.text,
    lineHeight: 21,
  },
  answerText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 21,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  contactSection: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 16,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  contactText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  bottomSpacer: {
    height: 20,
  },
});
