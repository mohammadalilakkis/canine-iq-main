import { useEffect, useRef, useCallback } from 'react';
import { View, findNodeHandle, Platform } from 'react-native';
import { TooltipId, ScreenId, useTooltips } from '@/contexts/TooltipContext';
import { useDogProfile } from '@/contexts/DogProfileContext';

interface TooltipProps {
  id: TooltipId;
  text: string;
  position?: 'above' | 'below';
  arrowPosition?: 'left' | 'right';
  screen: ScreenId;
}

export default function Tooltip({ id, text, position = 'below', arrowPosition = 'left', screen }: TooltipProps) {
  const { isTooltipVisible, registerTooltip, unregisterTooltip, updateTooltipPosition, activeScreen } = useTooltips();
  const { hasProfile } = useDogProfile();
  const anchorRef = useRef<View>(null);
  const isRegisteredRef = useRef(false);

  const visible = isTooltipVisible(id) && hasProfile;

  const measurePosition = useCallback(() => {
    if (!anchorRef.current) return;

    if (Platform.OS === 'web') {
      const element = anchorRef.current as unknown as HTMLElement;
      if (element && typeof element.getBoundingClientRect === 'function') {
        const domRect = element.getBoundingClientRect();
        const layout = { x: domRect.x, y: domRect.y, width: domRect.width, height: domRect.height };
        
        if (!isRegisteredRef.current) {
          registerTooltip({ id, text, targetLayout: layout, position, arrowPosition, screen });
          isRegisteredRef.current = true;
        } else {
          updateTooltipPosition(id, layout);
        }
      }
    } else {
      const node = findNodeHandle(anchorRef.current);
      if (node) {
        anchorRef.current.measureInWindow((x, y, width, height) => {
          if (x !== undefined && y !== undefined) {
            const layout = { x, y, width, height };
            
            if (!isRegisteredRef.current) {
              registerTooltip({ id, text, targetLayout: layout, position, arrowPosition, screen });
              isRegisteredRef.current = true;
            } else {
              updateTooltipPosition(id, layout);
            }
          }
        });
      }
    }
  }, [id, text, position, arrowPosition, screen, registerTooltip, updateTooltipPosition]);

  useEffect(() => {
    if (!visible || activeScreen !== screen) {
      if (isRegisteredRef.current) {
        unregisterTooltip(id);
        isRegisteredRef.current = false;
      }
      return;
    }

    const timeout = setTimeout(measurePosition, 100);
    const interval = setInterval(measurePosition, 500);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      if (isRegisteredRef.current) {
        unregisterTooltip(id);
        isRegisteredRef.current = false;
      }
    };
  }, [visible, id, measurePosition, unregisterTooltip, activeScreen, screen]);

  if (!visible || activeScreen !== screen) {
    return null;
  }

  return <View ref={anchorRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none" />;
}
