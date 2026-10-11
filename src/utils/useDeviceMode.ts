import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type AspectRatioMode = '16:9' | '3:2';
export type AspectPreference = 'auto' | 'pc' | 'mobile';

export interface DeviceModeInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  aspectRatio: AspectRatioMode;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  preference: AspectPreference;
  setPreference: (pref: AspectPreference) => void;
  togglePreference: () => void;
}

const STORAGE_KEY = 'kana_aspect_preference';

export function useDeviceMode(): DeviceModeInfo {
  const [preference, setPreferenceState] = useState<AspectPreference>(() => {
    if (typeof window === 'undefined') return 'auto';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'pc' || stored === 'mobile' || stored === 'auto') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const setPreference = useCallback((pref: AspectPreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // ignore
    }
  }, []);

  const togglePreference = useCallback(() => {
    setPreferenceState((prev) => {
      const next: AspectPreference = prev === 'auto' ? 'pc' : prev === 'pc' ? 'mobile' : 'auto';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Compute raw device detection
  const width = windowSize.width;
  const height = windowSize.height;
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const coarsePointer = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
  const isPortrait = height > width;

  // Auto detection
  const detectedIsMobile = width < 768 || (isTouch && width < 900 && coarsePointer);
  const detectedIsTablet = !detectedIsMobile && (width < 1024 || (isTouch && coarsePointer));
  const detectedIsDesktop = !detectedIsMobile && !detectedIsTablet;

  const deviceType: DeviceType = detectedIsMobile ? 'mobile' : detectedIsTablet ? 'tablet' : 'desktop';

  // Apply preference override if set
  let isDesktop = detectedIsDesktop;
  let isMobile = detectedIsMobile;
  let isTablet = detectedIsTablet;

  if (preference === 'pc') {
    isDesktop = true;
    isMobile = false;
    isTablet = false;
  } else if (preference === 'mobile') {
    isDesktop = false;
    isMobile = true;
    isTablet = false;
  }

  // Determine Aspect Ratio and Canvas Resolution
  let aspectRatio: AspectRatioMode = '16:9';
  let canvasWidth = 960;
  let canvasHeight = 540;
  let scale = 2.65;

  if (isMobile) {
    if (isPortrait) {
      aspectRatio = '3:2';
      canvasWidth = 720;
      canvasHeight = 540;
      scale = 3.85;
    } else {
      aspectRatio = '16:9';
      canvasWidth = 800;
      canvasHeight = 450;
      scale = 2.4;
    }
  } else if (isTablet) {
    aspectRatio = '16:9';
    canvasWidth = 896;
    canvasHeight = 504;
    scale = 2.55;
  } else {
    // Desktop PC: expansive 16:9 widescreen canvas
    aspectRatio = '16:9';
    canvasWidth = 960;
    canvasHeight = 540;
    scale = 2.65;
  }

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isTouch: Boolean(isTouch),
    orientation: isPortrait ? 'portrait' : 'landscape',
    aspectRatio,
    canvasWidth,
    canvasHeight,
    scale,
    preference,
    setPreference,
    togglePreference,
  };
}
