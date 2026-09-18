import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show the prompt
  if (isInstalled) {
    return null;
  }

  // Android / Chromium native install flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold shadow-sm transition active:scale-95 touch-manipulation"
        title="Instalar como App en tu teléfono"
      >
        <Download className="h-4 w-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari instruction modal
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-800/80 hover:bg-teal-700 text-teal-100 text-xs font-medium border border-teal-600/40"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Instalar en iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-teal-900 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-teal-600" />
                  Instalar en tu iPhone
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg shrink-0 mt-0.5">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <p>
                    1. Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg shrink-0 mt-0.5">
                    <Download className="h-4 w-4" />
                  </div>
                  <p>
                    2. Desplázate hacia abajo y selecciona <strong>Agregar a pantalla de inicio</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 active:scale-98 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
