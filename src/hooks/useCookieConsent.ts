import { useState, useEffect, useCallback } from 'react';

const CONSENT_KEY = 'ftrack-cookie-consent';

export interface CookieConsent {
  essential: true; // Always required
  preferences: boolean;
  analytics: boolean;
  timestamp: string;
}

interface UseCookieConsentReturn {
  consent: CookieConsent | null;
  showBanner: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (preferences: Omit<CookieConsent, 'essential' | 'timestamp'>) => void;
  resetConsent: () => void;
}

const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  preferences: false,
  analytics: false,
  timestamp: new Date().toISOString(),
};

export function useCookieConsent(): UseCookieConsentReturn {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookieConsent;
        setConsent(parsed);
        setShowBanner(false);
      } else {
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = useCallback((newConsent: CookieConsent) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      preferences: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    });
  }, [saveConsent]);

  const rejectNonEssential = useCallback(() => {
    saveConsent({
      ...DEFAULT_CONSENT,
      timestamp: new Date().toISOString(),
    });
  }, [saveConsent]);

  const savePreferences = useCallback(
    (preferences: Omit<CookieConsent, 'essential' | 'timestamp'>) => {
      saveConsent({
        essential: true,
        ...preferences,
        timestamp: new Date().toISOString(),
      });
    },
    [saveConsent]
  );

  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(CONSENT_KEY);
      setConsent(null);
      setShowBanner(true);
    } catch (error) {
      console.error('Failed to reset cookie consent:', error);
    }
  }, []);

  return {
    consent,
    showBanner,
    acceptAll,
    rejectNonEssential,
    savePreferences,
    resetConsent,
  };
}
