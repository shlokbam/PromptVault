import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Cpu, Calendar, User as UserIcon, Trash2, X } from 'lucide-react';
import { agentService, authService } from '../services/api';
import type { Agent, User } from '../types';
import { parseUTCDate } from '../utils/date';

export const AgentList: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAgents = async () => {
    try {
      const data = await agentService.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchAgents();
  }, [navigate]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) {
      setCreateError('Agent Name is required');
      return;
    }
    setCreateError(null);
    setCreateLoading(true);

    try {
      await agentService.createAgent(newAgentName, newAgentDesc);
      setNewAgentName('');
      setNewAgentDesc('');
      setShowCreateModal(false);
      fetchAgents(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to create agent');
    } finally {
      setCreateLoading(false);
    }
  };

  const openDeleteConfirm = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid navigating into details
    e.preventDefault();
    setAgentToDelete(id);
    setShowDeleteConfirm(true);
    setDeleteError(null);
  };

  const confirmDeleteAgent = async () => {
    if (agentToDelete === null) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await agentService.deleteAgent(agentToDelete);
      setShowDeleteConfirm(false);
      setAgentToDelete(null);
      fetchAgents();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete agent');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading agent repositories...</p>
      </div>
    );
  }

  const isAllowedToModify = currentUser?.role === 'Manager';

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">AI Agent Registry</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Agents represent separate namespaces containing prompt types for different subsystems (SQL, Charting, core logic).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/10 transition-all-300 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">No Agents Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Start by creating your first AI Agent. Each agent automatically configures default prompts (System, SQL, Chart, Validation).
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all-300"
          >
            Create Agent Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="group bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300 border-l-4 hover:border-l-primary"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm group-hover:text-primary transition-all-300">
                      {agent.name}
                    </h3>
                  </div>
                  
                  {isAllowedToModify && (
                    <button
                      onClick={(e) => openDeleteConfirm(agent.id, e)}
                      className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all-300"
                      title="Delete Agent"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {agent.description || 'No description provided.'}
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  Owner: {agent.creator_name || 'System'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {parseUTCDate(agent.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Agent Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          {/* Modal Card */}
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all-300"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-heading font-bold mb-1">Create AI Agent</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Create a new configuration namespace. This will auto-scaffold System, SQL, Chart, and Validation prompts.
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Forecast, TicketParser"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Specify what this agent operates on..."
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-xl transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-primary/10 transition-all-300 disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create namespace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm text-foreground">Delete Agent Namespace</h3>
                <p className="text-[11px] text-muted-foreground">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this agent? This will permanently delete all associated prompts, versions, test cases, and comments.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAgentToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="px-3.5 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-all-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAgent}
                disabled={deleteLoading}
                className="px-3.5 py-2 bg-destructive hover:bg-red-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {deleteLoading ? 'Deleting...' : 'Delete namespace'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AgentList;
