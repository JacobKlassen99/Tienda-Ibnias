import React, { useState, useEffect } from 'react';
import { ActiveTab, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { RegisterForms } from './components/RegisterForms';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FilePlus2, BarChart3, Settings } from 'lucide-react';

const STORAGE_TOKEN_KEY = 'ibnias_token_v1';
const STORAGE_ROLE_KEY = 'ibnias_role_v1';

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  });
  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem(STORAGE_ROLE_KEY) as UserRole) || null;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('registrar');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keep localStorage synchronized
  useEffect(() => {
    if (token && role) {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
      localStorage.setItem(STORAGE_ROLE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_ROLE_KEY);
    }
  }, [token, role]);

  // Toast Helpers
  const addToast = (type: 'success' | 'error' | 'warning', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Handlers
  const handleLoginSuccess = (newToken: string, newRole: UserRole) => {
    setToken(newToken);
    setRole(newRole);
    addToast('success', 'Sesión iniciada', `Bienvenido a Tienda Ibnias (${newRole === 'admin' ? 'Administrador' : 'Usuario'})`);
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    setActiveTab('registrar');
    addToast('warning', 'Sesión cerrada');
  };

  const handleSessionExpired = () => {
    setToken(null);
    setRole(null);
    addToast('error', 'Sesión expirada', 'Por favor ingrese su contraseña nuevamente.');
  };

  const handleElevateAdmin = (adminToken: string) => {
    setToken(adminToken);
    setRole('admin');
    addToast('success', 'Privilegios de Administrador concedidos');
  };

  // If not logged in, show Login Screen
  if (!token || !role) {
    return (
      <>
        <LoginView onSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-20 sm:pb-8 selection:bg-teal-600 selection:text-white">
      {/* Header */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        role={role}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto py-2">
        {activeTab === 'registrar' && (
          <RegisterForms
            token={token}
            onSuccessToast={(msg) => addToast('success', 'Registro Exitoso', msg)}
            onErrorToast={(msg) => addToast('error', 'Error al Guardar', msg)}
            onSessionExpired={handleSessionExpired}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportsView
            token={token}
            role={role}
            onSuccessToast={(msg) => addToast('success', 'Operación Completada', msg)}
            onErrorToast={(msg) => addToast('error', 'Error en Reportes', msg)}
            onSessionExpired={handleSessionExpired}
            onElevateAdmin={handleElevateAdmin}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            token={token}
            role={role}
            onElevateAdmin={handleElevateAdmin}
            onSuccessToast={(msg) => addToast('success', 'Administración', msg)}
            onErrorToast={(msg) => addToast('error', 'Error de Administración', msg)}
            onSessionExpired={handleSessionExpired}
          />
        )}
      </main>

      {/* Android Mobile Ergonomic Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 sm:hidden shadow-lg">
        <div className="grid grid-cols-3 gap-1 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('registrar')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'registrar'
                ? 'text-teal-700 font-bold bg-teal-50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FilePlus2 className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">Registrar</span>
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'reportes'
                ? 'text-teal-700 font-bold bg-teal-50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">Reportes</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeTab === 'admin'
                ? 'text-teal-700 font-bold bg-teal-50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">Admin</span>
          </button>
        </div>
      </div>

      {/* Global Notifications & Offline status */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <OfflineIndicator />
    </div>
  );
}
