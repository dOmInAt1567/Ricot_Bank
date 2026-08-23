import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { initTelegram, showBackButton, isTelegram } from '@/lib/telegram';
import BottomNav from '@/components/BottomNav';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import TransferPage from '@/pages/TransferPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import CreditsPage from '@/pages/CreditsPage';
import AdminPage from '@/pages/AdminPage';

function BackButtonManager() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isTelegram()) return;
    if (location.pathname === '/') {
      showBackButton(() => {});
      return;
    }
    const cleanup = showBackButton(() => navigate('/'));
    return cleanup;
  }, [location.pathname, navigate]);

  return null;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen surface-bg flex items-center justify-center">
        <span className="w-10 h-10 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'creator';

  return (
    <div className="min-h-screen surface-bg pb-16">
      <BackButtonManager />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {isAdmin && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initTelegram();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
