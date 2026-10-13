import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type AspectRatioMode = '16:9' | '3:2' | '1:1';
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
  zoomMultiplier: number;
  setZoomMultiplier: (val: number) => void;
  preference: AspectPreference;
  setPreference: (pref: AspectPreference) => void;
  togglePreference: () => void;
  toggleAspectRatio: () => void;
}

const STORAGE_KEY = 'kana_aspect_preference';
const ZOOM_STORAGE_KEY = 'kana_camera_zoom_mult';

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

  const [portraitRatio, setPortraitRatio] = useState<'1:1' | '3:2'>('1:1');
  const [landscapeRatio, setLandscapeRatio] = useState<'16:9' | '3:2'>('16:9');

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

  const toggleAspectRatio = useCallback(() => {
    if (isPortrait) {
      setPortraitRatio((prev) => (prev === '1:1' ? '3:2' : '1:1'));
    } else {
      setLandscapeRatio((prev) => (prev === '16:9' ? '3:2' : '16:9'));
    }
  }, [isPortrait]);

  const [zoomMultiplier, setZoomMultiplierState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    try {
      const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0.7 && val <= 1.4) return val;
      }
    } catch {
      // ignore
    }
    return 1.0;
  });

  const setZoomMultiplier = useCallback((val: number) => {
    setZoomMultiplierState(val);
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, val.toString());
    } catch {
      // ignore
    }
  }, []);

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
  let baseScale = 2.65;

  if (isPortrait || (isMobile && !isDesktop && isPortrait)) {
    if (portraitRatio === '1:1') {
      aspectRatio = '1:1';
      canvasWidth = 360;
      canvasHeight = 360;
      baseScale = 2.85; // Default zoomed-out by a bit from 3.8 to 2.85
    } else {
      aspectRatio = '3:2';
      canvasWidth = 360;
      canvasHeight = 240;
      baseScale = 2.85; // Default zoomed-out by a bit from 3.8 to 2.85
    }
  } else if (isMobile) {
    aspectRatio = landscapeRatio;
    if (landscapeRatio === '3:2') {
      canvasWidth = 675;
      canvasHeight = 450;
      baseScale = 2.4;
    } else {
      canvasWidth = 800;
      canvasHeight = 450;
      baseScale = 2.4;
    }
  } else if (isTablet) {
    aspectRatio = landscapeRatio;
    canvasWidth = 896;
    canvasHeight = 504;
    baseScale = 2.55;
  } else {
    // Desktop PC: expansive 16:9 widescreen canvas
    aspectRatio = landscapeRatio;
    canvasWidth = 960;
    canvasHeight = 540;
    baseScale = 2.65;
  }

  const scale = Number((baseScale * zoomMultiplier).toFixed(2));

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
    zoomMultiplier,
    setZoomMultiplier,
    preference,
    setPreference,
    togglePreference,
    toggleAspectRatio,
  };
}
