import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Send, Receipt, User as UserIcon, CreditCard, Shield } from 'lucide-react';
import { hapticImpact } from '@/lib/telegram';
import { useAuth } from '@/context/AuthContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const items = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transfer', label: 'Transfer', icon: Send },
    { path: '/credits', label: 'Credits', icon: CreditCard },
    { path: '/history', label: 'History', icon: Receipt },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  const isAdmin = profile?.role === 'admin' || profile?.role === 'creator';

  return (
    <nav className="fixed bottom-0 left-0 right-0 nav-bg border-t nav-border z-50">
      <div className="max-w-4xl mx-auto flex items-stretch">
        {items.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => {
                hapticImpact('light');
                navigate(item.path);
              }}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition"
            >
              <div className={`p-1.5 rounded-lg transition ${active ? 'bg-primary-surface' : ''}`}>
                <Icon
                  className={`w-5 h-5 transition ${active ? 'text-primary' : 'text-faint'}`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </div>
              <span
                className={`text-[11px] font-medium transition ${active ? 'text-primary' : 'text-faint'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => {
              hapticImpact('light');
              navigate('/admin');
            }}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 transition"
          >
            <div className={`p-1.5 rounded-lg transition ${location.pathname === '/admin' ? 'bg-primary-surface' : ''}`}>
              <Shield
                className={`w-5 h-5 transition ${location.pathname === '/admin' ? 'text-primary' : 'text-faint'}`}
                strokeWidth={location.pathname === '/admin' ? 2.4 : 2}
              />
            </div>
            <span
              className={`text-[11px] font-medium transition ${location.pathname === '/admin' ? 'text-primary' : 'text-faint'}`}
            >
              Admin
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}
