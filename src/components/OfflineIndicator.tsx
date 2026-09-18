import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-16 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-medium text-white shadow-xl max-w-md mx-auto animate-bounce"
    >
      <WifiOff className="h-5 w-5 shrink-0" />
      <span>Sin conexión a Internet. Las solicitudes requerirán red.</span>
    </div>
  );
}
