import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType: string | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    connectionType: null,
  });

  const updateConnectionType = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      setStatus(prev => ({
        ...prev,
        connectionType: connection?.effectiveType || null,
      }));
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection type changes
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
      connection?.addEventListener('change', updateConnectionType);
      updateConnectionType();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
        connection?.removeEventListener('change', updateConnectionType);
      }
    };
  }, [updateConnectionType]);

  const resetWasOffline = useCallback(() => {
    setStatus(prev => ({ ...prev, wasOffline: false }));
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    wasOffline: status.wasOffline,
    connectionType: status.connectionType,
    resetWasOffline,
  };
}
