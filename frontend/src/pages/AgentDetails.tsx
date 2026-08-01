import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, FileCode, 
  ChevronRight, Calendar, User as UserIcon
} from 'lucide-react';
import { agentService, versionService, authService } from '../services/api';
import type { Agent, PromptType, PromptVersion } from '../types';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [typeVersions, setTypeVersions] = useState<Record<number, PromptVersion | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }

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
            <span>Created: {new Date(agent.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Prompt Types Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-heading font-bold tracking-tight">Prompt Types</h2>
          <p className="text-muted-foreground text-xs">
            Configure, version, and manage parameters for distinct components of the {agent.name} system.
          </p>
        </div>

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
                      <h3 className="font-heading font-semibold text-sm">
                        {pt.type_name} Prompt
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
                        <span>Saved: {new Date(latest.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
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
      </div>

    </div>
  );
};
export default AgentDetails;
