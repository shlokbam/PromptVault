import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Cpu, FileCode, GitFork, Sparkles, TrendingUp, 
  ArrowRight, Activity, Calendar 
} from 'lucide-react';
import { systemService, authService } from '../services/api';
import type { DashboardStats, ActivityLog, User } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);

    const fetchData = async () => {
      try {
        const statsData = await systemService.getStats();
        const activityData = await systemService.getActivity();
        setStats(statsData);
        // Limit to 6 items on dashboard
        setActivities(activityData.slice(0, 6));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading dashboard workspace...</p>
      </div>
    );
  }

  // Helper to format timestamps
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            Hello, {currentUser?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Here's what is happening across your AI Agent prompt versions today.
          </p>
        </div>

        <Link
          to="/agents"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/10 transition-all-300 hover:scale-[1.02]"
        >
          View Agents
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Total Agents */}
        <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Agents</span>
            <h2 className="text-3xl font-bold font-heading">{stats?.total_agents || 0}</h2>
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Active systems
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Prompts */}
        <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Prompts</span>
            <h2 className="text-3xl font-bold font-heading">{stats?.total_prompts || 0}</h2>
            <span className="text-[10px] text-muted-foreground">Functional types configured</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <FileCode className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Versions */}
        <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Saved Versions</span>
            <h2 className="text-3xl font-bold font-heading">{stats?.total_versions || 0}</h2>
            <span className="text-[10px] text-muted-foreground">Historical revisions</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <GitFork className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Updates Today */}
        <div className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Updates Today</span>
            <h2 className="text-3xl font-bold font-heading">{stats?.total_updates_today || 0}</h2>
            <span className="text-[10px] text-indigo-500 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Prompts saved today
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Split Layout: Quick Agent Access & Recent Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Updates Timeline */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Activity Audit Trail
            </h3>
            <Link to="/activity" className="text-primary hover:underline text-xs flex items-center gap-1">
              View full log
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="relative border-l-2 border-border pl-6 space-y-6 ml-3 py-2">
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No recent activity found.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="relative">
                  {/* Timeline point */}
                  <span className="absolute -left-[31px] top-0.5 bg-background border-2 border-primary w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">
                        {act.action}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(act.created_at)} at {formatTime(act.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground font-bold">
                        {act.user_name.charAt(0)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        Performed by <span className="font-medium text-foreground">{act.user_name}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Platform Quick Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Collaborative Prompting</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Welcome to the organizational repo. Inside PromptVault, AI agents represent namespaces which hold prompts:
            </p>
            <div className="space-y-3 font-mono text-[10px] bg-muted/50 p-4 rounded-xl border border-border">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-primary font-bold">System Prompt</span>
                <span className="text-muted-foreground">Core Agent Behaviors</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-primary font-bold">SQL Prompt</span>
                <span className="text-muted-foreground">Structured Query rules</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-primary font-bold">Chart Prompt</span>
                <span className="text-muted-foreground">Visualization guidelines</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary font-bold">Validation Prompt</span>
                <span className="text-muted-foreground">Output vetting rules</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every save automatically creates an incremental revision, preserving historical rollbacks, comments, and tested questions.
            </p>
          </div>

          <div className="bg-gradient-to-tr from-primary to-indigo-600 rounded-2xl p-6 text-white space-y-3 shadow-md shadow-primary/20">
            <h3 className="font-heading font-semibold text-sm">Need help getting started?</h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Open the Agents tab to review existing agents like <span className="font-semibold underline">Forecast</span>, inspect version timelines, configure automated test suites, or compare revisions side-by-side.
            </p>
            <Link
              to="/agents"
              className="inline-flex items-center gap-1 text-xs font-semibold bg-white text-primary px-3 py-2 rounded-lg hover:bg-slate-100 transition-all-300 mt-2"
            >
              Get Started
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
