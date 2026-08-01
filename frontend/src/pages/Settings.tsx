import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Shield, Mail, Key, Users } from 'lucide-react';
import api, { authService } from '../services/api';
import type { User } from '../types';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordLoading(true);

    try {
      await authService.changePassword(oldPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);

    const loadUsers = async () => {
      try {
        const response = await api.get<User[]>('/users');
        setAllUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading account settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings & Profile
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Review your account permissions, security parameters, and collaborate with team members.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Profile info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Your Profile</h3>
            
            <div className="flex flex-col items-center py-4 gap-2 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold uppercase border-2 border-primary/20">
                {currentUser?.name.charAt(0)}
              </div>
              <h4 className="font-bold text-sm text-foreground">{currentUser?.name}</h4>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase ${
                currentUser?.role === 'Manager' 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-green-500/10 text-green-500 border border-green-500/20'
              }`}>
                {currentUser?.role} Account
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs border-t border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{currentUser?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Scope: Workspace-wide</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5 text-amber-500">
              <Key className="w-4 h-4" />
              Security Notice
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              PromptVault is currently running in a prototype state. Authentication utilizes secure JWT tokens stored locally.
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Company-wide single-sign-on (SSO) with Microsoft Entra ID is marked for future production releases.
            </p>
          </div>
        </div>

        {/* Right Side: Team list */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Workspace Members ({allUsers.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              These team members have active access to review and modify prompt versions inside PromptVault.
            </p>

            <div className="divide-y divide-border border-t border-border/50 pt-2">
              {allUsers.map((user) => (
                <div key={user.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-muted/10 px-2 rounded-xl transition-all-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold text-[10px]">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground block">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground block">{user.email}</span>
                    </div>
                  </div>
                  
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold uppercase ${
                    user.role === 'Manager' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-green-500/10 text-green-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5 text-foreground">
              <Key className="w-4 h-4 text-primary" />
              Change Password
            </h3>
            <p className="text-xs text-muted-foreground">
              Ensure your account remains secure by updating your password regularly.
            </p>

            {passwordError && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-primary hover:bg-indigo-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Settings;
