import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Cpu, History, Settings, Search, 
  LogOut, Sun, Moon, User as UserIcon, Terminal 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/api';
import type { User } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Agents', path: '/agents', icon: Cpu },
    { name: 'Activity Log', path: '/activity', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (!currentUser) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-all-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between shrink-0 h-screen sticky top-0">
        <div>
          {/* Logo / Brand */}
          <div className="p-6 flex items-center gap-3 border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                PromptVault
              </span>
              <span className="block text-[10px] text-muted-foreground font-mono">v1.0.0</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all-300 ${
                    isActive 
                      ? 'bg-primary/10 text-primary border-l-4 border-primary pl-3' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t border-border bg-muted/40 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="truncate flex-1">
              <span className="block text-xs font-semibold text-foreground truncate">{currentUser.name}</span>
              <span className="block text-[10px] text-muted-foreground truncate">{currentUser.email}</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-semibold uppercase ${
              currentUser.role === 'Manager' 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                : 'bg-green-500/10 text-green-500 border border-green-500/20'
            }`}>
              {currentUser.role}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-all-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prompts, comments, tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-input rounded-xl bg-muted/30 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300"
            />
          </form>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>



            {/* Quick Actions profile icon */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all-300"
              >
                <UserIcon className="w-4 h-4" />
              </button>
              
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-20 font-sans">
                    <div className="px-4 py-2 border-b border-border">
                      <span className="block text-xs font-semibold text-foreground">{currentUser.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{currentUser.role} Account</span>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all-300"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-4 py-2 text-xs text-destructive hover:bg-destructive/5 transition-all-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-8 bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
};
export default Layout;
