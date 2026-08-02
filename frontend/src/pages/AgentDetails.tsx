import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, FileCode, 
  ChevronRight, Calendar, User as UserIcon,
  Trash2, ShieldAlert
} from 'lucide-react';
import { agentService, versionService, authService } from '../services/api';
import type { Agent, PromptType, PromptVersion, User } from '../types';
import { parseUTCDate } from '../utils/date';
import { useToast } from '../context/ToastContext';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [typeVersions, setTypeVersions] = useState<Record<number, PromptVersion | null>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const toast = useToast();

  // Modal states for creating a new prompt type
  const [showModal, setShowModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete prompt type states
  const [showDeleteTypeConfirm, setShowDeleteTypeConfirm] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<PromptType | null>(null);
  const [deleteTypeError, setDeleteTypeError] = useState<string | null>(null);
  const [deleteTypeLoading, setDeleteTypeLoading] = useState(false);

  const fetchAgentDetails = async () => {
    if (!id) return;
    try {
      const agentId = parseInt(id);
      const agentData = await agentService.getAgents();
      const activeAgent = agentData.find(a => a.id === agentId);
      
      if (!activeAgent) {
        navigate('/agents');
        return;
      }
      setAgent(activeAgent);

      const types = await agentService.getPromptTypes(agentId);
      setPromptTypes(types);

      // Fetch latest version for each type
      const versionsMap: Record<number, PromptVersion | null> = {};
      for (const pt of types) {
        try {
          const versions = await versionService.getVersions(pt.id);
          // Sort to find latest (versions from API are sorted desc already)
          versionsMap[pt.id] = versions.length > 0 ? versions[0] : null;
        } catch (e) {
          console.error(`Error loading versions for type ${pt.id}`, e);
          versionsMap[pt.id] = null;
        }
      }
      setTypeVersions(versionsMap);
    } catch (err) {
      console.error('Error fetching agent details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromptTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !id) return;
    setCreateLoading(true);
    setCreateError(null);

    try {
      await agentService.createPromptType(parseInt(id), newTypeName.trim());
      setNewTypeName('');
      setShowModal(false);
      
      // Reload prompt types
      await fetchAgentDetails();
      toast.success('Prompt type created successfully.');
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.detail || 'Failed to create prompt type.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeletePromptTypeClick = (pt: PromptType) => {
    setTypeToDelete(pt);
    setDeleteTypeError(null);
    setShowDeleteTypeConfirm(true);
  };

  const handleConfirmDeleteType = async () => {
    if (!typeToDelete) return;
    setDeleteTypeLoading(true);
    setDeleteTypeError(null);
    try {
      await agentService.deletePromptType(typeToDelete.id);
      toast.success(`Prompt type '${typeToDelete.type_name}' deleted successfully.`);
      setShowDeleteTypeConfirm(false);
      setTypeToDelete(null);
      await fetchAgentDetails();
    } catch (err: any) {
      console.error(err);
      setDeleteTypeError(err.response?.data?.detail || 'Failed to delete prompt type.');
    } finally {
      setDeleteTypeLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    fetchAgentDetails();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading namespace registry...</p>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans">
      
      {/* Back to List */}
      <div>
        <Link 
          to="/agents" 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all-300 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Agents
        </Link>
      </div>

      {/* Agent Header Hero */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-heading font-bold tracking-tight">{agent.name}</h1>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
              {agent.description || 'No description provided for this AI agent.'}
            </p>
          </div>
        </div>

        <div className="pt-4 md:pt-0 border-t md:border-t-0 border-border/50 flex md:flex-col gap-4 md:gap-2 text-[10px] text-muted-foreground font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Owner: {agent.creator_name || 'System'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Created: {new Date(parseUTCDate(agent.created_at)).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Prompt Types Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-bold tracking-tight">Prompt Types</h2>
            <p className="text-muted-foreground text-xs">
              Configure, version, and manage parameters for distinct components of the {agent.name} system.
            </p>
          </div>
          {currentUser?.role === 'Manager' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-1.5 bg-primary hover:bg-indigo-600 text-white font-medium rounded-xl text-xs transition-all-300 shadow-sm"
            >
              Create Prompt Type
            </button>
          )}
        </div>

        {promptTypes.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-semibold text-sm text-foreground">No prompt types configured</h3>
              <p className="text-xs text-muted-foreground">
                {currentUser?.role === 'Manager'
                  ? "Create custom prompt categories (e.g. 'System Prompt', 'SQL Prompt', 'Chain of Thought') to start version control."
                  : "Please contact your Team Lead (Manager) to create custom prompt types for this agent workspace."}
              </p>
            </div>
            {currentUser?.role === 'Manager' && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-primary hover:bg-indigo-600 text-white font-medium rounded-xl text-xs transition-all-300 shadow-sm"
              >
                Create Prompt Type
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promptTypes.map((pt) => {
            const latest = typeVersions[pt.id];
            
            // Icon color based on prompt type name
            let typeColor = 'bg-blue-500/10 text-blue-500';
            if (pt.type_name === 'System') typeColor = 'bg-indigo-500/10 text-indigo-500';
            else if (pt.type_name === 'SQL') typeColor = 'bg-emerald-500/10 text-emerald-500';
            else if (pt.type_name === 'Chart') typeColor = 'bg-purple-500/10 text-purple-500';
            else if (pt.type_name === 'Validation') typeColor = 'bg-rose-500/10 text-rose-500';

            return (
              <div 
                key={pt.id}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg hover:shadow-slate-500/5 transition-all-300"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${typeColor} flex items-center justify-center`}>
                        <FileCode className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
                        <span>{pt.type_name} Prompt</span>
                        {currentUser?.role === 'Manager' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeletePromptTypeClick(pt);
                            }}
                            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all-300 ml-1 cursor-pointer"
                            title="Delete Prompt Type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </h3>
                    </div>

                    {latest && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        latest.status === 'Production'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : latest.status === 'Testing'
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            : latest.status === 'Archived'
                              ? 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {latest.status}
                      </span>
                    )}
                  </div>

                  {/* snippet */}
                  <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 font-mono text-[10px] text-muted-foreground h-20 overflow-hidden relative">
                    {latest ? (
                      <pre className="whitespace-pre-wrap line-clamp-3">{latest.content}</pre>
                    ) : (
                      <span className="italic text-center block pt-4 text-muted-foreground/60">No prompt saved yet. Open in editor to save the initial version.</span>
                    )}
                    {latest && <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent"></div>}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {latest ? (
                      <div className="flex flex-col gap-0.5">
                        <span>Ver: <strong className="text-foreground">v{latest.version_number}</strong> ({latest.author_name})</span>
                        <span>Saved: {new Date(parseUTCDate(latest.created_at)).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ) : (
                      <span>v0 (Uninitialized)</span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/agents/${agent.id}/prompts/${pt.type_name}`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-semibold transition-all-300"
                  >
                    Open Editor
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Create Prompt Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm text-foreground">Create Prompt Type</h3>
                <p className="text-[11px] text-muted-foreground">Add a new prompt component category to this Agent namespace.</p>
              </div>
            </div>

            {createError && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreatePromptTypeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Prompt Type Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. System Prompt, SQL Query Prompt, Validation Schema"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewTypeName('');
                    setCreateError(null);
                  }}
                  className="px-3.5 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/30 transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-3.5 py-2 bg-primary hover:bg-indigo-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Prompt Type Confirmation Modal */}
      {showDeleteTypeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold">Delete Prompt Type?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete the prompt type <strong className="text-foreground">'{typeToDelete?.type_name}'</strong>? This action is permanent and will delete all associated prompt versions, test cases, and comments.
            </p>
            {deleteTypeError && (
              <p className="text-[10px] text-destructive font-mono bg-destructive/5 p-2 rounded-lg">{deleteTypeError}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setShowDeleteTypeConfirm(false);
                  setTypeToDelete(null);
                  setDeleteTypeError(null);
                }}
                disabled={deleteTypeLoading}
                className="px-3.5 py-2 hover:bg-muted border border-border text-muted-foreground rounded-xl text-xs font-semibold transition-all-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteType}
                disabled={deleteTypeLoading}
                className="px-3.5 py-2 bg-destructive hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all-300 shadow-sm"
              >
                {deleteTypeLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AgentDetails;
