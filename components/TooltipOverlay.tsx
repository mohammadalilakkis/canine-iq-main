import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { TooltipRegistration, useTooltips } from '@/contexts/TooltipContext';
import { useAuth } from '@/contexts/AuthContext';

const TOOLTIP_MAX_WIDTH = 280;
const ARROW_SIZE = 12;
const TOOLTIP_MARGIN = 8;

function TooltipItem({ registration }: { registration: TooltipRegistration }) {
  const { dismissTooltip } = useTooltips();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      dismissTooltip(registration.id);
    });
  };

  const { targetLayout, position, arrowPosition } = registration;
  const screenWidth = Dimensions.get('window').width;

  let tooltipLeft = arrowPosition === 'right' 
    ? targetLayout.x + targetLayout.width - TOOLTIP_MAX_WIDTH 
    : targetLayout.x;

  if (tooltipLeft < 10) tooltipLeft = 10;
  if (tooltipLeft + TOOLTIP_MAX_WIDTH > screenWidth - 10) {
    tooltipLeft = screenWidth - TOOLTIP_MAX_WIDTH - 10;
  }

  const tooltipTop = position === 'below'
    ? targetLayout.y + targetLayout.height + TOOLTIP_MARGIN
    : targetLayout.y - TOOLTIP_MARGIN;

  const arrowLeft = arrowPosition === 'right' 
    ? TOOLTIP_MAX_WIDTH - 32 
    : 20;

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        {
          left: tooltipLeft,
          top: position === 'below' ? tooltipTop : undefined,
          bottom: position === 'above' ? Dimensions.get('window').height - tooltipTop : undefined,
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.arrow,
          position === 'above' ? styles.arrowBelow : styles.arrowAbove,
          { left: arrowLeft },
        ]}
      />
      <View style={styles.content}>
        <Text style={styles.text}>{registration.text}</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function TooltipOverlay() {
  const { getVisibleTooltips } = useTooltips();
  const { tooltipsSuppressed } = useAuth();
  const visibleTooltips = getVisibleTooltips();

  if (visibleTooltips.length === 0 || tooltipsSuppressed) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {visibleTooltips.map((reg) => (
        <TooltipItem key={reg.id} registration={reg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'box-none',
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 99999,
    elevation: 99999,
    maxWidth: TOOLTIP_MAX_WIDTH,
    width: TOOLTIP_MAX_WIDTH,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(35, 38, 45, 0.92)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 99999,
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 18,
  },
  closeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    backgroundColor: 'rgba(35, 38, 45, 0.92)',
    borderWidth: 1,
    borderColor: Colors.dark.primary + '60',
    transform: [{ rotate: '45deg' }],
    zIndex: 99998,
  },
  arrowAbove: {
    top: -6,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  arrowBelow: {
    bottom: -6,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
});
