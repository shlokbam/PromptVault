import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, GitCompare, Calendar, User as UserIcon } from 'lucide-react';
import { agentService, versionService, authService } from '../services/api';
import type { Agent, PromptVersion } from '../types';
import { parseUTCDate } from '../utils/date';

export const CompareVersions: React.FC = () => {
  const { agentId, typeName } = useParams<{ agentId: string; typeName: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);

  // Selection states
  const [v1Id, setV1Id] = useState<number | ''>('');
  const [v2Id, setV2Id] = useState<number | ''>('');

  const [v1Obj, setV1Obj] = useState<PromptVersion | null>(null);
  const [v2Obj, setV2Obj] = useState<PromptVersion | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      if (!agentId || !typeName) return;
      try {
        const aId = parseInt(agentId);
        // Load agent
        const agents = await agentService.getAgents();
        const curAgent = agents.find(a => a.id === aId);
        if (!curAgent) {
          navigate('/agents');
          return;
        }
        setAgent(curAgent);

        // Load prompt types
        const types = await agentService.getPromptTypes(aId);
        const curType = types.find(t => t.type_name === typeName);
        if (!curType) {
          navigate(`/agents/${agentId}`);
          return;
        }

        // Load versions
        const versionsList = await versionService.getVersions(curType.id);
        setVersions(versionsList);

        if (versionsList.length >= 2) {
          // Set V1 as second latest (versions[1]) and V2 as latest (versions[0])
          setV1Id(versionsList[1].id);
          setV2Id(versionsList[0].id);
          setV1Obj(versionsList[1]);
          setV2Obj(versionsList[0]);
        } else if (versionsList.length === 1) {
          setV1Id(versionsList[0].id);
          setV2Id(versionsList[0].id);
          setV1Obj(versionsList[0]);
          setV2Obj(versionsList[0]);
        }
      } catch (err) {
        console.error('Error loading diff data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [agentId, typeName, navigate]);

  // Sync objects when dropdown IDs change
  useEffect(() => {
    if (v1Id) {
      const found = versions.find(v => v.id === v1Id);
      setV1Obj(found || null);
    } else {
      setV1Obj(null);
    }
  }, [v1Id, versions]);

  useEffect(() => {
    if (v2Id) {
      const found = versions.find(v => v.id === v2Id);
      setV2Obj(found || null);
    } else {
      setV2Obj(null);
    }
  }, [v2Id, versions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Loading diff engine...</p>
      </div>
    );
  }

  // Language mapping
  const getLanguage = () => {
    if (typeName === 'SQL') return 'sql';
    if (typeName === 'Chart') return 'json';
    return 'markdown';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans h-[82vh] flex flex-col justify-between">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/agents/${agentId}/prompts/${typeName}`}
            className="p-2 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold font-mono">
              <span>{agent?.name}</span>
              <span>/</span>
              <span>{typeName}</span>
            </div>
            <h1 className="text-xl font-heading font-bold flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary animate-pulse" />
              Side-by-Side Version Diff
            </h1>
          </div>
        </div>

        {/* Dropdown selectors */}
        <div className="flex items-center gap-4 bg-muted/40 p-2 border border-border rounded-2xl text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground font-mono">Original (Left):</span>
            <select
              value={v1Id}
              onChange={(e) => setV1Id(Number(e.target.value))}
              className="bg-card px-2 py-1.5 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} - {v.change_summary.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          <span className="text-muted-foreground font-mono">vs</span>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground font-mono">Modified (Right):</span>
            <select
              value={v2Id}
              onChange={(e) => setV2Id(Number(e.target.value))}
              className="bg-card px-2 py-1.5 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} - {v.change_summary.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Version summaries info pane */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border p-4 rounded-2xl text-xs font-mono">
        {/* V1 Details */}
        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center border-b border-border/30 pb-1">
            <span className="font-bold text-foreground">Original Revision (Left)</span>
            <span className="text-[10px] text-primary">v{v1Obj?.version_number || 0}</span>
          </div>
          <p><span className="text-muted-foreground">Change Summary:</span> <strong className="text-foreground">{v1Obj?.change_summary || 'None'}</strong></p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Author: {v1Obj?.author_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date: {v1Obj && parseUTCDate(v1Obj.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* V2 Details */}
        <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center border-b border-border/30 pb-1">
            <span className="font-bold text-foreground">Modified Revision (Right)</span>
            <span className="text-[10px] text-primary">v{v2Obj?.version_number || 0}</span>
          </div>
          <p><span className="text-muted-foreground">Change Summary:</span> <strong className="text-foreground">{v2Obj?.change_summary || 'None'}</strong></p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> Author: {v2Obj?.author_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date: {v2Obj && parseUTCDate(v2Obj.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* Monaco DiffEditor */}
      <div className="flex-1 w-full bg-[#1e1e1e] border border-border rounded-2xl overflow-hidden mt-6 shadow-sm relative min-h-[300px]">
        {versions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">
            No versions saved to perform comparison.
          </div>
        ) : (
          <DiffEditor
            theme="vs-dark"
            language={getLanguage()}
            original={v1Obj?.content || ''}
            modified={v2Obj?.content || ''}
            options={{
              readOnly: true,
              fontSize: 13,
              fontFamily: 'Fira Code, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              renderSideBySide: true
            }}
          />
        )}
      </div>

    </div>
  );
};
export default CompareVersions;
