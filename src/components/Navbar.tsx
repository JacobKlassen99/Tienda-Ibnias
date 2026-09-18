import React from 'react';
import { Store, Shield, User, LogOut, FilePlus2, BarChart3, Settings } from 'lucide-react';
import { ActiveTab, UserRole } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  role: UserRole | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  role,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-teal-900 text-white shadow-md border-b border-teal-800">
      {/* Top Bar with Brand & Actions */}
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-teal-950/30">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide leading-tight text-white uppercase">
              Tienda Ibnias
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                  role === 'admin'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                }`}
              >
                {role === 'admin' ? (
                  <>
                    <Shield className="h-3 w-3" /> Admin
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3" /> Usuario
                  </>
                )}
              </span>
              <span className="text-[10px] text-teal-300/80 font-medium">Google Sheets</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          
          <button
            id="logout-btn"
            onClick={() => {
              if (window.confirm('¿Desea cerrar la sesión actual?')) {
                onLogout();
              }
            }}
            className="p-2 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800 active:bg-teal-700 transition"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation (Responsive touch-friendly buttons) */}
      <nav className="max-w-4xl mx-auto px-2 sm:px-4 bg-teal-950/40 border-t border-teal-800/60">
        <div className="grid grid-cols-3 gap-1 py-1.5">
          <button
            id="nav-tab-registrar"
            onClick={() => onSelectTab('registrar')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl font-medium text-xs sm:text-sm transition touch-manipulation ${
              currentTab === 'registrar'
                ? 'bg-white text-teal-950 font-bold shadow-sm'
                : 'text-teal-100 hover:bg-teal-800/60 active:bg-teal-800'
            }`}
          >
            <FilePlus2 className={`h-4 w-4 ${currentTab === 'registrar' ? 'text-teal-700' : 'text-teal-300'}`} />
            <span>Registrar</span>
          </button>

          <button
            id="nav-tab-reportes"
            onClick={() => onSelectTab('reportes')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl font-medium text-xs sm:text-sm transition touch-manipulation ${
              currentTab === 'reportes'
                ? 'bg-white text-teal-950 font-bold shadow-sm'
                : 'text-teal-100 hover:bg-teal-800/60 active:bg-teal-800'
            }`}
          >
            <BarChart3 className={`h-4 w-4 ${currentTab === 'reportes' ? 'text-teal-700' : 'text-teal-300'}`} />
            <span>Reportes</span>
          </button>

          <button
            id="nav-tab-admin"
            onClick={() => onSelectTab('admin')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl font-medium text-xs sm:text-sm transition touch-manipulation ${
              currentTab === 'admin'
                ? 'bg-white text-teal-950 font-bold shadow-sm'
                : 'text-teal-100 hover:bg-teal-800/60 active:bg-teal-800'
            }`}
          >
            <Settings className={`h-4 w-4 ${currentTab === 'admin' ? 'text-teal-700' : 'text-teal-300'}`} />
            <span>Administración</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
