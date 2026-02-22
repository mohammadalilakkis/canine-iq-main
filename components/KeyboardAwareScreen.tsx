import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const DEFAULT_EXTRA_HEIGHT = 80;

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
}

/**
 * Wraps content in KeyboardAwareScrollView with consistent props so input fields
 * stay above the keyboard on both iOS and Android.
 */
export default function KeyboardAwareScreen({
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAwareScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      enableOnAndroid={true}
      extraScrollHeight={DEFAULT_EXTRA_HEIGHT}
      extraHeight={DEFAULT_EXTRA_HEIGHT}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
