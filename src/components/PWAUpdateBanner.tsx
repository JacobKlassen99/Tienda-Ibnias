import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

interface PWAUpdateBannerProps {
  show: boolean;
  updating: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({
  show,
  updating,
  onUpdate,
  onDismiss,
}) => {
  if (!show) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-50 sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0 mt-0.5 border border-teal-500/30">
            <Sparkles className="h-5 w-5 text-teal-400" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Nueva versión disponible
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Hay una actualización de la aplicación.
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
            title="Descartar por ahora"
            aria-label="Descartar aviso de actualización"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            Descartar
          </button>

          <button
            onClick={onUpdate}
            disabled={updating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
