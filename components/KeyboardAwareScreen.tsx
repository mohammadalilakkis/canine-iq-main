import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

/** Extra space above keyboard. 200 gives good clearance on most devices/keyboards (Option A hardening). */
const DEFAULT_EXTRA_HEIGHT = 200;

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  /** Override for long forms where the last field (e.g. current weight) needs more clearance above the keyboard. */
  extraKeyboardHeight?: number;
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
  extraKeyboardHeight,
}: KeyboardAwareScreenProps) {
  const extra = extraKeyboardHeight ?? DEFAULT_EXTRA_HEIGHT;
  return (
    <KeyboardAwareScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      enableOnAndroid={true}
      extraScrollHeight={extra}
      extraHeight={extra}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
