import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: 'calendar_today' },
  { to: '/progress', label: 'Progress', icon: 'insights' },
  { to: '/foods', label: 'Foods', icon: 'nutrition' },
  { to: '/settings', label: 'Settings', icon: 'tune' },
];

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const username = user?.user_metadata?.username ?? 'User';

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Today';
    if (path.startsWith('/progress')) return 'Progress';
    if (path.startsWith('/foods') || path.startsWith('/add')) return 'Foods';
    if (path.startsWith('/settings')) return 'Settings';
    return 'CALCal';
  };

  return (
    <div className="min-h-screen bg-page-background text-ink-primary font-body-md flex flex-col justify-between">
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-page-background/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(26,38,32,0.04)]">
        <div className="h-16 px-space-md max-w-lg mx-auto md:max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="text-primary-container font-headline-sm text-headline-sm font-semibold">CALCal</span>
            <span className="font-label-sm text-label-sm text-ink-secondary">/</span>
            <h1 className="font-title-sm text-title-sm text-ink-primary capitalize">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              aria-label="Notifications"
              className="w-10 h-10 flex items-center justify-center rounded-full text-ink-secondary hover:text-ink-primary transition-colors"
              type="button"
            >
              <Icon name="notifications" size={22} />
            </button>
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs cursor-default select-none shadow-sm"
              title={`Logged in as ${username}`}
            >
              {username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col relative w-full pt-16 pb-24 bg-page-background flex-1 max-w-lg mx-auto md:max-w-2xl px-space-md">
        <Outlet />
      </main>

      {/* Fixed Bottom Navigation matching Stitch */}
      <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-primary-container shadow-[0_-2px_12px_rgba(20,42,30,0.08)]">
        <div className="flex items-center justify-around h-16 px-gutter max-w-lg mx-auto md:max-w-2xl">
          {NAV_ITEMS.map((item) => {
            const isMatch = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[52px] min-h-[44px] px-space-sm py-1 rounded-xl transition-colors',
                  isMatch
                    ? 'text-header-text bg-primary font-semibold shadow-inner'
                    : 'text-header-text/60 hover:text-header-text'
                )}
              >
                <Icon name={item.icon} size={22} />
                <span className="font-label-sm text-label-sm mt-0.5">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
