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
  orientation: 'portrait' | 'landscape'; // Physical screen orientation
  layoutMode: 'portrait' | 'landscape';  // Effective layout mode based on preference & orientation
  aspectRatio: AspectRatioMode;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  preference: AspectPreference;
  setPreference: (pref: AspectPreference) => void;
  togglePreference: () => void;
  toggleAspectRatio: () => void;
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

  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? (window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth) : 1280,
    height: typeof window !== 'undefined' ? (window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight) : 720,
  }));

  // Debounced viewport observer using requestAnimationFrame, ignoring minor mobile address bar changes (< 80px)
  useEffect(() => {
    let rAF = 0;
    const handleResize = () => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const vp = window.visualViewport;
        const newWidth = vp ? Math.round(vp.width) : window.innerWidth;
        const newHeight = vp ? Math.round(vp.height) : window.innerHeight;

        setWindowSize((prev) => {
          const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          // Ignore insignificant browser address bar height changes on touch screens
          if (isTouchDevice && prev.width === newWidth && Math.abs(prev.height - newHeight) < 80) {
            return prev;
          }
          return { width: newWidth, height: newHeight };
        });
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      cancelAnimationFrame(rAF);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
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

  // Determine effective layout mode based on preference:
  // - If preference is 'pc', force landscape layout regardless of viewport orientation
  // - If preference is 'mobile', force portrait layout
  // - If 'auto', follow physical orientation
  const layoutMode: 'portrait' | 'landscape' =
    preference === 'pc' ? 'landscape' :
    preference === 'mobile' ? 'portrait' :
    isPortrait ? 'portrait' : 'landscape';

  const toggleAspectRatio = useCallback(() => {
    if (layoutMode === 'portrait') {
      setPortraitRatio((prev) => (prev === '1:1' ? '3:2' : '1:1'));
    } else {
      setLandscapeRatio((prev) => (prev === '16:9' ? '3:2' : '16:9'));
    }
  }, [layoutMode]);

  // Determine Aspect Ratio and Canvas Resolution
  let aspectRatio: AspectRatioMode = '16:9';
  let canvasWidth = 960;
  let canvasHeight = 540;
  let baseScale = 2.65;

  if (layoutMode === 'portrait') {
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

  const scale = baseScale;

  return {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    isTouch: Boolean(isTouch),
    orientation: isPortrait ? 'portrait' : 'landscape',
    layoutMode,
    aspectRatio,
    canvasWidth,
    canvasHeight,
    scale,
    preference,
    setPreference,
    togglePreference,
    toggleAspectRatio,
  };
}
