import { useEffect } from 'react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

declare global {
  interface Window {
    plausible?: (...args: unknown[]) => void;
  }
}

export function AnalyticsProvider() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    // Only load analytics if user has given consent
    if (!consent?.analytics) {
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[data-domain="ftrack.uk"]')) {
      return;
    }

    // Load Plausible Analytics (privacy-friendly, GDPR compliant)
    const script = document.createElement('script');
    script.src = 'https://plausible.io/js/script.js';
    script.defer = true;
    script.setAttribute('data-domain', 'ftrack.uk');
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount (though usually not needed)
      const existingScript = document.querySelector('script[data-domain="ftrack.uk"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [consent?.analytics]);

  // This component doesn't render anything
  return null;
}

// Utility function to track custom events
export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, { props });
  }
}
