import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const TOOLTIP_STORAGE_KEY = 'canine_iq_dismissed_tooltips';

export type TooltipId = 
  | 'dashboard_coach_settings'
  | 'activity_log_actions'
  | 'intelligence_breed_insights';

export type ScreenId = 'dashboard' | 'activity' | 'intelligence' | 'profile';

export interface TooltipRegistration {
  id: TooltipId;
  text: string;
  targetLayout: { x: number; y: number; width: number; height: number };
  position: 'above' | 'below';
  arrowPosition: 'left' | 'right';
  screen: ScreenId;
}

export const [TooltipProvider, useTooltips] = createContextHook(() => {
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<TooltipId>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [registeredTooltips, setRegisteredTooltips] = useState<Map<TooltipId, TooltipRegistration>>(new Map());
  const [activeScreen, setActiveScreen] = useState<ScreenId | null>(null);

  useEffect(() => {
    const loadDismissedTooltips = async () => {
      try {
        const stored = await AsyncStorage.getItem(TOOLTIP_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as TooltipId[];
          setDismissedTooltips(new Set(parsed));
        }
      } catch (error) {
        console.log('[TooltipContext] Error loading dismissed tooltips:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadDismissedTooltips();
  }, []);

  const dismissTooltip = useCallback(async (tooltipId: TooltipId) => {
    setDismissedTooltips(prev => {
      const updated = new Set(prev);
      updated.add(tooltipId);
      
      AsyncStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify([...updated])).catch(error => {
        console.log('[TooltipContext] Error saving dismissed tooltip:', error);
      });
      
      return updated;
    });
    setRegisteredTooltips(prev => {
      const updated = new Map(prev);
      updated.delete(tooltipId);
      return updated;
    });
  }, []);

  const isTooltipVisible = useCallback((tooltipId: TooltipId) => {
    return isLoaded && !dismissedTooltips.has(tooltipId);
  }, [isLoaded, dismissedTooltips]);

  const registerTooltip = useCallback((registration: TooltipRegistration) => {
    setRegisteredTooltips(prev => {
      const updated = new Map(prev);
      updated.set(registration.id, registration);
      return updated;
    });
  }, []);

  const unregisterTooltip = useCallback((tooltipId: TooltipId) => {
    setRegisteredTooltips(prev => {
      const updated = new Map(prev);
      updated.delete(tooltipId);
      return updated;
    });
  }, []);

  const getVisibleTooltips = useCallback(() => {
    const visible: TooltipRegistration[] = [];
    registeredTooltips.forEach((reg, id) => {
      if (isLoaded && !dismissedTooltips.has(id) && reg.screen === activeScreen) {
        visible.push(reg);
      }
    });
    return visible;
  }, [registeredTooltips, dismissedTooltips, isLoaded, activeScreen]);

  const updateTooltipPosition = useCallback((id: TooltipId, targetLayout: { x: number; y: number; width: number; height: number }) => {
    setRegisteredTooltips(prev => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const updated = new Map(prev);
      updated.set(id, { ...existing, targetLayout });
      return updated;
    });
  }, []);

  return {
    dismissTooltip,
    isTooltipVisible,
    isLoaded,
    registerTooltip,
    unregisterTooltip,
    getVisibleTooltips,
    updateTooltipPosition,
    setActiveScreen,
    activeScreen,
  };
});
