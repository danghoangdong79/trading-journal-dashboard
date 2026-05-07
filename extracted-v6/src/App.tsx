import React, { useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context.tsx';
import Sidebar from './components/layout/Sidebar.tsx';
import Topbar from './components/layout/Topbar.tsx';
import Overview from './pages/Overview.tsx';
import Journal from './pages/Journal.tsx';
import Analytics from './pages/Analytics.tsx';
import Calendar from './pages/Calendar.tsx';
import Risk from './pages/Risk.tsx';
import Settings from './pages/Settings.tsx';
import Login from './pages/Login.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authState, settings } = useApp();
  const location = useLocation();

  if (settings.auth.enabled && !authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-blue-500/30 transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
          <Routes>
            <Route path="/overview" element={<Overview />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 px-4 py-6 text-center text-[11px] font-medium text-gray-500 sm:flex-row md:px-8">
          <div className="flex items-center gap-4">
            <span>© 2024 KhangHang1 Journal</span>
            <div className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block" />
            <span className="hidden sm:inline">Real-time Trading Insights</span>
          </div>
          <a href="https://dahodo.com" target="_blank" rel="noopener noreferrer" className="text-center uppercase tracking-widest transition-colors hover:text-blue-500">
            Powered by dahodo.com
          </a>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
