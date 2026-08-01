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
        </div>

      </div>

    </div>
  );
};
export default Settings;
