import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Filter, Layers } from 'lucide-react';
import { systemService, authService } from '../services/api';
import type { ActivityLog as LogItem } from '../types';

export const ActivityLog: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const loadLogs = async () => {
      try {
        const data = await systemService.getActivity();
        setLogs(data);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading activity database...</p>
      </div>
    );
  }

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter ? log.action.toLowerCase().includes(actionFilter.toLowerCase()) : true;
    const matchesUser = userFilter ? log.user_name.toLowerCase().includes(userFilter.toLowerCase()) : true;
    return matchesAction && matchesUser;
  });

  const formatDate = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Audit Trail Log
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Complete, immutable logging of all agent creation, versioning commits, restored actions, and comments.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
          <Filter className="w-4 h-4" />
          <span>Filter Logs:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <input
            type="text"
            placeholder="Search action keyword (e.g. 'SQL', 'Restore')"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all-300"
          />
          <input
            type="text"
            placeholder="Filter by user (e.g. 'Shlok', 'Rahul')"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all-300"
          />
        </div>
      </div>

      {/* Audit Trail List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-muted-foreground">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-foreground uppercase tracking-wider font-mono">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-xs italic">
                    No logs matching selected filters found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-all-300">
                    <td className="px-6 py-4 font-mono text-[10px] whitespace-nowrap text-foreground flex flex-col">
                      <span className="font-semibold">{formatDate(log.created_at)}</span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">{formatTime(log.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] uppercase">
                          {log.user_name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-[9px] font-mono font-medium">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                        {log.entity_type} (ID: {log.entity_id || 'N/A'})
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default ActivityLog;
