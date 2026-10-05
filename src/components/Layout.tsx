import { type ReactNode } from 'react';
import { Radar, LayoutDashboard, Network, Bug, Package, Server, Ticket, Upload, ScrollText, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useRouter, type Route } from '@/lib/router';

const NAV_ITEMS: { route: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { route: { name: 'dashboard' }, label: 'Dashboard', icon: LayoutDashboard },
  { route: { name: 'graph' }, label: 'Dependency Graph', icon: Network },
  { route: { name: 'findings' }, label: 'Findings', icon: Bug },
  { route: { name: 'packages' }, label: 'Packages', icon: Package },
  { route: { name: 'services' }, label: 'Services', icon: Server },
  { route: { name: 'tickets' }, label: 'Remediation', icon: Ticket },
  { route: { name: 'upload' }, label: 'Upload SBOM', icon: Upload },
  { route: { name: 'audit' }, label: 'Audit Log', icon: ScrollText },
];

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { route, navigate } = useRouter();

  const isActive = (item: Route) => {
    if (item.name === route.name) return true;
    if (item.name === 'findings' && route.name === 'finding') return true;
    return false;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-dark-50 dark:bg-dark-950">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-dark-200 dark:border-dark-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Radar size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-dark-900 dark:text-dark-50">Supply Chain Radar</h1>
            <p className="text-[10px] text-dark-400">Dependency Risk Intelligence</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-dark-500 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-dark-200 dark:border-dark-800 px-3 py-3">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-dark-500 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
