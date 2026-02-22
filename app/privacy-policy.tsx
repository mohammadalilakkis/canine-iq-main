import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.lastUpdated}>Last updated: February 2026</Text>

        <Text style={styles.introText}>
          Your privacy is important to us. This Privacy Policy explains how
          Canine iQ ("the App") collects, uses, stores, and protects your
          information when you use our mobile application.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Data We Collect</Text>
          <Text style={styles.bodyText}>
            Canine iQ may collect and store the following types of information:
            {"\n\n"}
            <Text style={styles.bold}>Dog Profile Information:</Text> Name,
            breed, age, weight, sex, and optional profile photo.{"\n\n"}
            <Text style={styles.bold}>Activity Data:</Text> Logged activities
            including type, duration, intensity, distance, and timestamps.
            {"\n\n"}
            <Text style={styles.bold}>Health Notes:</Text> Weight records, body
            condition scores, veterinary visit notes, medications, and general
            health observations.{"\n\n"}
            <Text style={styles.bold}>Account Information:</Text> If you choose
            to create an account, we collect your email address and an encrypted
            password. Account creation is optional.{"\n\n"}
            <Text style={styles.bold}>App Usage Data:</Text> Anonymous usage
            patterns to help us improve features and performance. No personally
            identifiable information is included in this data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. How Your Data Is Stored
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.bold}>Local Storage:</Text> By default, all
            your data is stored locally on your device. This means your
            information never leaves your phone unless you explicitly choose to
            create an account and enable cloud sync.{"\n\n"}
            <Text style={styles.bold}>Cloud Storage:</Text> If you create an
            account, your data may be synced to secure cloud servers to enable
            backup and cross-device access. Cloud data is encrypted in transit
            and at rest.{"\n\n"}
            <Text style={styles.bold}>Data Retention:</Text> Local data persists
            until you delete the app or clear app data. Cloud data is retained
            as long as your account is active. You may request deletion of your
            cloud data at any time by contacting us.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. Notification Preferences
          </Text>
          <Text style={styles.bodyText}>
            Canine iQ offers optional push notifications for activity reminders,
            goal tracking, and health check-in prompts. You can enable or
            disable notifications at any time through App Settings. We do not
            send promotional or marketing notifications. Your notification
            preferences are stored locally on your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
          <Text style={styles.bodyText}>
            Canine iQ may use the following third-party services:{"\n\n"}
            <Text style={styles.bold}>Supabase:</Text> For optional user
            authentication and cloud data storage. Supabase processes your email
            address and encrypted password when you create an account. Their
            privacy policy is available at supabase.com/privacy.{"\n\n"}
            <Text style={styles.bold}>Expo:</Text> For app delivery and
            updates. Expo may collect basic device information for crash
            reporting and performance monitoring.{"\n\n"}
            We do not use any advertising networks, analytics trackers, or data
            brokers. We do not sell, rent, or share your personal information
            with any third party for marketing purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            5. How We Use Your Information
          </Text>
          <Text style={styles.bodyText}>
            We use the information we collect to:{"\n\n"}
            a) Provide and maintain the App's features and functionality.{"\n\n"}
            b) Personalize your experience based on your dog's breed and
            profile.{"\n\n"}
            c) Generate activity reports and health trend summaries.{"\n\n"}
            d) Enable cloud backup and data sync if you create an account.
            {"\n\n"}
            e) Improve the App based on aggregated, anonymized usage data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.bodyText}>
            You have the right to:{"\n\n"}
            a) Access all data stored about you within the App.{"\n\n"}
            b) Export your data through the Generate Report feature.{"\n\n"}
            c) Delete your local data by clearing app data or uninstalling the
            App.{"\n\n"}
            d) Request deletion of cloud data by contacting us at
            privacy@canineiq.app.{"\n\n"}
            e) Opt out of cloud sync at any time by not creating an account or
            by logging out.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            7. Children's Privacy
          </Text>
          <Text style={styles.bodyText}>
            Canine iQ is not directed at children under the age of 13. We do
            not knowingly collect personal information from children. If you
            believe a child has provided us with personal information, please
            contact us so we can take appropriate action.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            8. Changes to This Policy
          </Text>
          <Text style={styles.bodyText}>
            We may update this Privacy Policy from time to time. Changes will be
            reflected within the App with an updated revision date. Your
            continued use of the App after changes are posted constitutes your
            acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have questions or concerns about this Privacy Policy or your
            data, please contact us at privacy@canineiq.app.
          </Text>
        </View>

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
    marginBottom: 16,
  },
  introText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
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
  bold: {
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: 8,
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
