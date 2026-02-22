import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import Colors from "@/constants/colors";

export default function TermsOfUseScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Terms of Use" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.lastUpdated}>Last updated: February 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Purpose of the App</Text>
          <Text style={styles.bodyText}>
            Canine iQ ("the App") is a mobile application designed to help dog
            owners track their dog's physical activities, health observations,
            and wellness trends. The App provides tools for logging exercises,
            recording health notes, setting fitness goals, and generating
            activity reports. Canine iQ is intended for informational and
            personal record-keeping purposes only.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. User Responsibilities</Text>
          <Text style={styles.bodyText}>
            By using the App, you agree to the following:{"\n\n"}
            a) You will provide accurate information about your dog's profile,
            including breed, age, weight, and health observations.{"\n\n"}
            b) You are responsible for maintaining the confidentiality of your
            account credentials if you choose to create an account.{"\n\n"}
            c) You will not use the App for any unlawful purpose or in violation
            of any applicable laws or regulations.{"\n\n"}
            d) You acknowledge that the App is not a substitute for professional
            veterinary advice, diagnosis, or treatment. Always seek the advice
            of a qualified veterinarian with any questions regarding your dog's
            health.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. Limitations of Liability
          </Text>
          <Text style={styles.bodyText}>
            The App is provided "as is" and "as available" without warranties of
            any kind, either express or implied. Canine iQ does not guarantee
            that:{"\n\n"}
            a) The App will be uninterrupted, error-free, or secure.{"\n\n"}
            b) Any information provided through the App is accurate, complete,
            or reliable for medical or veterinary decisions.{"\n\n"}
            c) Results obtained from using the App will meet your expectations.
            {"\n\n"}
            In no event shall Canine iQ, its developers, or affiliates be
            liable for any direct, indirect, incidental, special, or
            consequential damages arising out of or in connection with your use
            of the App. This includes, but is not limited to, damages for loss
            of data, health outcomes, or any decisions made based on information
            provided by the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Usage Disclaimers</Text>
          <Text style={styles.bodyText}>
            Activity data, health notes, and profile information entered into
            the App are used solely for the purpose of providing the App's
            features and services to you. By default, all data is stored locally
            on your device. If you create an account, your data may be synced to
            cloud servers to enable backup and cross-device access.{"\n\n"}
            Canine iQ does not sell, rent, or share your personal data with
            third parties for marketing purposes. Aggregated, anonymized data
            may be used to improve the App's features and performance.{"\n\n"}
            For full details on how your data is handled, please refer to our
            Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
          <Text style={styles.bodyText}>
            All content, features, and functionality of the App, including but
            not limited to text, graphics, logos, icons, and software, are the
            property of Canine iQ and are protected by applicable intellectual
            property laws. You may not reproduce, distribute, or create
            derivative works from any part of the App without express written
            permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Changes to These Terms</Text>
          <Text style={styles.bodyText}>
            We reserve the right to modify these Terms of Use at any time.
            Changes will be posted within the App and take effect immediately
            upon posting. Your continued use of the App after changes are posted
            constitutes your acceptance of the revised terms.
          </Text>
        </View>

        <Pressable
          style={styles.privacyLink}
          onPress={() => router.push("/privacy-policy")}
        >
          <Text style={styles.privacyLinkText}>View Privacy Policy →</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerAppName}>Canine iQ</Text>
          <Text style={styles.footerMeta}>Version 1.0.0 · Build 1</Text>
        </View>
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
  lastUpdated: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  privacyLink: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    marginBottom: 24,
  },
  privacyLinkText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.dark.primary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  footerAppName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  footerMeta: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
  },
});
