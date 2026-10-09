import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

const SESSION_DISMISSED_KEY = 'ibnias_pwa_update_dismissed_session';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFunction, setUpdateFunction] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    // Session-only dismissal: sessionStorage disappears when tab/app is closed
    try {
      return sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        // App is ready to work offline
      },
      onRegisteredSW(swUrl, registration) {
        if (!registration) return;

        // Periodic check for SW update (e.g. every 60 minutes)
        const checkInterval = setInterval(() => {
          if (!(!navigator.onLine)) {
            registration.update().catch(() => {
              // Ignore network check errors
            });
          }
        }, 60 * 60 * 1000);

        // Also check whenever document visibility returns to visible (user switches back to tab or PWA)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(checkInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      },
      onRegisterError(error) {
        console.warn('SW registration failed:', error);
      },
    });

    setUpdateFunction(() => updateSW);
  }, []);

  // Dismiss notification for the current session only
  const dismissUpdate = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
    setIsDismissed(true);
  }, []);

  // Trigger update & reload safely
  const updateNow = useCallback(async () => {
    if (!updateFunction) {
      window.location.reload();
      return;
    }
    setUpdating(true);
    try {
      // Clear session dismissal on actual update so next versions will trigger
      try {
        sessionStorage.removeItem(SESSION_DISMISSED_KEY);
      } catch {
        // Ignore
      }
      await updateFunction(true);
    } catch (err) {
      console.warn('Error activating service worker update, reloading directly:', err);
      window.location.reload();
    }
  }, [updateFunction]);

  // Show banner only if an update is waiting and user has not dismissed it in this session
  const showBanner = needRefresh && !isDismissed;

  return {
    showBanner,
    needRefresh,
    updating,
    updateNow,
    dismissUpdate,
  };
}
