import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncQueuedChanges, getPendingSyncCount } from '@/lib/sync-service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showReconnected, setShowReconnected] = useState(false);

  // Check pending sync count
  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && pendingCount > 0) {
      handleSync();
    }
    
    // Show reconnected message briefly
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, pendingCount]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncQueuedChanges();
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } finally {
      setIsSyncing(false);
    }
  };

  // Show reconnected banner briefly
  if (showReconnected && pendingCount === 0) {
    return (
      <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm animate-in slide-in-from-top duration-300">
        <CheckCircle2 className="h-4 w-4" />
        <span>Back online</span>
      </div>
    );
  }

  // Show offline banner
  if (isOffline) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <WifiOff className="h-4 w-4" />
        <span>You're offline — changes will sync when connected</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>
    );
  }

  // Show pending sync banner when online but has pending items
  if (isOnline && pendingCount > 0) {
    return (
      <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <CloudOff className="h-4 w-4" />
        <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync</span>
        <Button
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

// Compact offline indicator for header/nav
export function OfflineIndicator() {
  const { isOffline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOffline
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <CloudOff className="h-3 w-3" />
          <span>{pendingCount} pending</span>
        </>
      )}
    </div>
  );
}
