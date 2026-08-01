import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft, Copy, Download, Save, RotateCcw, GitCompare, 
  Trash2, Play, Plus, ShieldAlert, FileCode, X
} from 'lucide-react';
import { 
  agentService, versionService, commentService, 
  testService, authService 
} from '../services/api';
import type { 
  Agent, PromptType, PromptVersion, 
  TestedQuestion, Comment, User 
} from '../types';

export const PromptEditor: React.FC = () => {
  const { agentId, typeName } = useParams<{ agentId: string; typeName: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeVersionIdParam = searchParams.get('versionId');
  const activeTabParam = searchParams.get('tab') || 'versions';

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [promptType, setPromptType] = useState<PromptType | null>(null);
  
  // Versions
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Editor metadata
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const editorRef = useRef<any>(null);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Tests
  const [tests, setTests] = useState<TestedQuestion[]>([]);
  const [testQuestion, setTestQuestion] = useState('');
  const [testExpected, setTestExpected] = useState('');
  const [testActual, setTestActual] = useState('');
  const [testStatus, setTestStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [showAddTest, setShowAddTest] = useState(false);

  // Save Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Draft' | 'Testing' | 'Production' | 'Archived'>('Draft');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Restore Modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);

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
        setPromptType(curType);

        // Load versions
        const versionsList = await versionService.getVersions(curType.id);
        setVersions(versionsList);

        // Determine which version to load
        if (versionsList.length > 0) {
          let targetVersion = versionsList[0]; // default to latest
          if (activeVersionIdParam) {
            const vId = parseInt(activeVersionIdParam);
            const found = versionsList.find(v => v.id === vId);
            if (found) targetVersion = found;
          }
          loadVersionIntoEditor(targetVersion, versionsList[0].id);
        } else {
          // No versions yet
          setEditorContent('-- Write your initial prompt here');
          setIsReadOnly(false);
        }
      } catch (err) {
        console.error('Error loading editor data:', err);
      }
    };

    loadData();
  }, [agentId, typeName, activeVersionIdParam, navigate]);

  // Handle version content, comments, tests loading
  const loadVersionIntoEditor = async (version: PromptVersion, latestId: number) => {
    setSelectedVersion(version);
    setEditorContent(version.content);
    
    // Read-only if viewing an older version
    const isOld = version.id !== latestId;
    setIsReadOnly(isOld);

    // Update counts
    calculateCounts(version.content);

    // Load comments and tests for this version
    try {
      const coms = await commentService.getComments(version.id);
      setComments(coms);
      
      const tsts = await testService.getTests(version.id);
      setTests(tsts);
    } catch (e) {
      console.error('Error fetching version items:', e);
    }
  };

  const calculateCounts = (text: string) => {
    setCharCount(text.length);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setEditorContent(val);
    calculateCounts(val);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    alert('Copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([editorContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${agent?.name}_${typeName}_v${selectedVersion?.version_number || 0}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeSummary.trim()) {
      setSaveError('Change summary is mandatory.');
      return;
    }
    if (!promptType) return;
    setSaveError(null);
    setSaveLoading(true);

    try {
      await versionService.createVersion(
        promptType.id,
        editorContent,
        changeSummary,
        saveStatus
      );
      
      // Close modal
      setShowSaveModal(false);
      setChangeSummary('');
      
      // Reload versions and set to latest
      const updatedVersions = await versionService.getVersions(promptType.id);
      setVersions(updatedVersions);
      loadVersionIntoEditor(updatedVersions[0], updatedVersions[0].id);
      setSearchParams({ versionId: updatedVersions[0].id.toString() });
      
      alert('New version saved successfully!');
    } catch (err: any) {
      console.error(err);
      setSaveError(err.response?.data?.detail || 'Failed to save version.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersion || !promptType) return;
    if (!restoreReason.trim()) {
      alert('Restore reason is mandatory.');
      return;
    }
    setRestoreLoading(true);

    try {
      const newVersion = await versionService.restoreVersion(
        selectedVersion.id,
        restoreReason
      );

      setShowRestoreModal(false);
      setRestoreReason('');

      // Reload versions
      const updatedVersions = await versionService.getVersions(promptType.id);
      setVersions(updatedVersions);
      loadVersionIntoEditor(updatedVersions[0], updatedVersions[0].id);
      setSearchParams({ versionId: updatedVersions[0].id.toString() });

      alert(`Restored from Version ${selectedVersion.version_number} successfully! Created Version ${newVersion.version_number}.`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to restore version.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!selectedVersion || !promptType) return;
    if (!window.confirm(`Are you sure you want to delete Version ${selectedVersion.version_number}? This cannot be undone.`)) {
      return;
    }

    try {
      await versionService.deleteVersion(selectedVersion.id);
      alert('Version deleted successfully!');
      
      // Reload versions
      const updatedVersions = await versionService.getVersions(promptType.id);
      setVersions(updatedVersions);
      if (updatedVersions.length > 0) {
        loadVersionIntoEditor(updatedVersions[0], updatedVersions[0].id);
        setSearchParams({ versionId: updatedVersions[0].id.toString() });
      } else {
        setSelectedVersion(null);
        setEditorContent('-- Write your initial prompt here');
        setIsReadOnly(false);
        setSearchParams({});
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete version.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedVersion) return;

    try {
      const commentObj = await commentService.createComment(selectedVersion.id, newComment);
      setComments([...comments, commentObj]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment.');
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim() || !testExpected.trim() || !selectedVersion) {
      alert('Please fill in required test fields');
      return;
    }

    try {
      const testObj = await testService.createTest(
        selectedVersion.id,
        testQuestion,
        testExpected,
        testActual,
        testStatus,
        'Manual user evaluation'
      );
      setTests([...tests, testObj]);
      setTestQuestion('');
      setTestExpected('');
      setTestActual('');
      setTestStatus('PASS');
      setShowAddTest(false);
    } catch (err) {
      console.error('Error adding test case:', err);
      alert('Failed to add test case.');
    }
  };

  // Mock a "Test Runner" execution
  const handleRunTestCaseMock = async (testIndex: number) => {
    const targetTest = tests[testIndex];
    alert(`Running test case: "${targetTest.question}"...\n\nEvaluating expected vs actual...`);
    
    // Simulate updating actual output
    const updatedTests = [...tests];
    updatedTests[testIndex] = {
      ...targetTest,
      actual_output: targetTest.expected_output, // Mock positive outcome
      status: 'PASS'
    };
    setTests(updatedTests);
  };

  // Statistics calculation for Test Cases
  const passedTestsCount = tests.filter(t => t.status === 'PASS').length;
  const failedTestsCount = tests.filter(t => t.status === 'FAIL').length;
  const totalTestsCount = tests.length;
  const successRate = totalTestsCount > 0 ? Math.round((passedTestsCount / totalTestsCount) * 100) : 0;

  // Language mapping for Monaco syntax highlighting
  const getLanguage = () => {
    if (typeName === 'SQL') return 'sql';
    if (typeName === 'Chart') return 'json';
    return 'markdown';
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const isManager = currentUser?.role === 'Manager';

  return (
    <div className={`space-y-6 font-sans ${isFullScreen ? 'fixed inset-0 bg-background z-50 p-6' : 'max-w-7xl mx-auto'}`}>
      
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isFullScreen && (
            <Link 
              to={`/agents/${agentId}`}
              className="p-2 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">
                {agent?.name}
              </span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-xs font-semibold text-primary">
                {typeName} Prompt
              </span>
            </div>
            <h1 className="text-xl font-heading font-bold flex items-center gap-2">
              Workspace Editor 
              {selectedVersion && (
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  (v{selectedVersion.version_number})
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {isFullScreen && (
            <button
              onClick={() => setIsFullScreen(false)}
              className="px-4 py-2 border border-border hover:bg-muted rounded-xl text-xs font-semibold transition-all-300"
            >
              Exit Full Screen
            </button>
          )}

          {selectedVersion && isReadOnly && (
            <button
              onClick={() => setShowRestoreModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition-all-300"
            >
              <RotateCcw className="w-4 h-4" />
              Restore this revision
            </button>
          )}

          {(!selectedVersion || !isReadOnly) && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/10 transition-all-300"
            >
              <Save className="w-4 h-4" />
              Save new version
            </button>
          )}
        </div>
      </div>

      {/* Editor & Side Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Editor (Col span 2) */}
        <div className="lg:col-span-2 border border-border bg-card rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm min-h-[500px]">
          
          {/* Editor Header controls */}
          <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-muted-foreground font-mono text-[10px]">
              <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                <FileCode className="w-3.5 h-3.5" />
                Language: {getLanguage().toUpperCase()}
              </span>
              <span>Chars: {charCount}</span>
              <span>Words: {wordCount}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
                title="Copy prompt"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
                title="Download prompt"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Compare */}
              {versions.length > 1 && (
                <button
                  onClick={() => navigate(`/agents/${agentId}/prompts/${typeName}/compare?agentId=${agentId}`)}
                  className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all-300"
                  title="Compare versions"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="px-2 py-1 border border-border rounded-lg hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-all-300"
              >
                {isFullScreen ? 'Window' : 'Fullscreen'}
              </button>

              {/* Delete version (Manager only) */}
              {isManager && selectedVersion && (
                <button
                  onClick={handleDeleteVersion}
                  className="p-2 border border-destructive/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all-300"
                  title="Delete version"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 w-full bg-[#1e1e1e] relative min-h-[400px]">
            {isReadOnly && (
              <div className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono flex items-center gap-1.5 backdrop-blur-md">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Read-Only Archive</span>
              </div>
            )}
            <Editor
              height="100%"
              theme="vs-dark"
              language={getLanguage()}
              value={editorContent}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                readOnly: isReadOnly,
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 16, bottom: 16 }
              }}
            />
          </div>

          {/* Status Bar */}
          <div className="px-6 py-2 border-t border-border bg-muted/40 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
            <div>
              {isReadOnly ? (
                <span className="text-amber-500 font-semibold">Older revision loaded. Click active timeline version to edit.</span>
              ) : (
                <span className="text-emerald-500 font-semibold">Editable mode. Ready to save next version.</span>
              )}
            </div>
            <div>
              Status: <span className="text-foreground uppercase font-bold">{selectedVersion?.status || 'UNSAVED'}</span>
            </div>
          </div>
        </div>

        {/* Sidebar panels (Col span 1) */}
        <div className="border border-border bg-card rounded-2xl flex flex-col overflow-hidden shadow-sm h-full max-h-[600px]">
          
          {/* Tab Selector */}
          <div className="grid grid-cols-3 border-b border-border text-center bg-muted/10">
            <button
              onClick={() => setSearchParams({ versionId: activeVersionIdParam || '', tab: 'versions' })}
              className={`py-3 text-xs font-semibold transition-all-300 border-b-2 ${
                activeTabParam === 'versions'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setSearchParams({ versionId: activeVersionIdParam || '', tab: 'tests' })}
              className={`py-3 text-xs font-semibold transition-all-300 border-b-2 ${
                activeTabParam === 'tests'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              Tests ({tests.length})
            </button>
            <button
              onClick={() => setSearchParams({ versionId: activeVersionIdParam || '', tab: 'comments' })}
              className={`py-3 text-xs font-semibold transition-all-300 border-b-2 ${
                activeTabParam === 'comments'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              Comments ({comments.length})
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* TAB 1: HISTORY */}
            {activeTabParam === 'versions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revision Timeline</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{versions.length} versions</span>
                </div>

                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                  {versions.map((v) => {
                    const isActive = selectedVersion?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => loadVersionIntoEditor(v, versions[0].id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all-300 flex items-start gap-3 relative hover:scale-[1.01] ${
                          isActive 
                            ? 'bg-primary/5 border-primary shadow-sm' 
                            : 'bg-card border-border hover:bg-muted/40'
                        }`}
                      >
                        {/* Bullet */}
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 border-2 mt-0.5 z-10 ${
                          isActive 
                            ? 'bg-primary border-primary ring-2 ring-primary/20' 
                            : v.status === 'Production'
                              ? 'bg-emerald-500 border-emerald-500'
                              : v.status === 'Testing'
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'bg-zinc-300 border-zinc-300 dark:bg-zinc-700 dark:border-zinc-700'
                        }`}></span>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-bold text-xs">Version {v.version_number}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(v.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-muted-foreground font-semibold line-clamp-1 leading-snug">
                            {v.change_summary}
                          </p>

                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>By {v.author_name}</span>
                            {v.restored_from_version && (
                              <span className="text-amber-500 font-mono">Restored v{v.restored_from_version}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: TEST CASES */}
            {activeTabParam === 'tests' && (
              <div className="space-y-4">
                
                {/* Stats widget */}
                <div className="grid grid-cols-4 gap-2 text-center bg-muted/30 border border-border p-3.5 rounded-xl font-mono">
                  <div>
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold">Total</span>
                    <span className="text-sm font-bold">{totalTestsCount}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold text-emerald-500">Passed</span>
                    <span className="text-sm font-bold text-emerald-500">{passedTestsCount}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold text-rose-500">Failed</span>
                    <span className="text-sm font-bold text-rose-500">{failedTestsCount}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold text-primary">Rate</span>
                    <span className="text-sm font-bold text-primary">{successRate}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Test Suite</span>
                  {!showAddTest && (
                    <button
                      onClick={() => setShowAddTest(true)}
                      className="text-primary hover:underline text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Test
                    </button>
                  )}
                </div>

                {/* Add Test Form */}
                {showAddTest && (
                  <form onSubmit={handleAddTest} className="p-3 bg-muted/20 border border-border rounded-xl space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-border/30">
                      <span className="text-[10px] font-bold text-foreground">New Test Case</span>
                      <button type="button" onClick={() => setShowAddTest(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Question</label>
                      <input
                        type="text"
                        placeholder="What query runs?"
                        value={testQuestion}
                        onChange={(e) => setTestQuestion(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-input rounded-lg bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Expected Output</label>
                      <input
                        type="text"
                        placeholder="Expected text description"
                        value={testExpected}
                        onChange={(e) => setTestExpected(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-input rounded-lg bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Actual Output (Optional)</label>
                      <input
                        type="text"
                        placeholder="Output actual run results"
                        value={testActual}
                        onChange={(e) => setTestActual(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-input rounded-lg bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Status:</label>
                      <label className="flex items-center gap-1 text-[10px] text-emerald-500 cursor-pointer">
                        <input
                          type="radio"
                          name="testStatus"
                          checked={testStatus === 'PASS'}
                          onChange={() => setTestStatus('PASS')}
                        />
                        PASS
                      </label>
                      <label className="flex items-center gap-1 text-[10px] text-rose-500 cursor-pointer">
                        <input
                          type="radio"
                          name="testStatus"
                          checked={testStatus === 'FAIL'}
                          onChange={() => setTestStatus('FAIL')}
                        />
                        FAIL
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-primary hover:bg-indigo-600 text-white font-semibold text-[10px] rounded-lg transition-all-300"
                    >
                      Save Test Question
                    </button>
                  </form>
                )}

                {/* Tests List */}
                <div className="space-y-3">
                  {tests.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No test questions stored for this version.</p>
                  ) : (
                    tests.map((t, idx) => (
                      <div key={t.id} className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2 text-[10px]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-foreground leading-normal">Q: {t.question}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            t.status === 'PASS' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 font-mono text-[9px] text-muted-foreground">
                          <p><span className="text-foreground">Expected:</span> {t.expected_output}</p>
                          <p><span className="text-foreground">Actual:</span> {t.actual_output || <span className="italic text-muted-foreground/50">None</span>}</p>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                          <span className="text-[8px] text-muted-foreground">Verification: Manual</span>
                          <button
                            onClick={() => handleRunTestCaseMock(idx)}
                            className="flex items-center gap-0.5 text-primary hover:underline text-[9px] font-bold"
                          >
                            <Play className="w-2.5 h-2.5" /> Run Mock Test
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: COMMENTS */}
            {activeTabParam === 'comments' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comments Thread</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{comments.length} comments</span>
                </div>

                {/* Comments List */}
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No comments posted yet. Start the discussion!</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-foreground">{c.author_name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {new Date(c.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })} at {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="p-2.5 bg-muted/40 border border-border/50 rounded-xl text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {c.comment}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                {selectedVersion && (
                  <form onSubmit={handleAddComment} className="pt-2 border-t border-border/50 flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask a question or request changes..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3 py-2 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all-300"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3 bg-primary hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-all-300"
                    >
                      Post
                    </button>
                  </form>
                )}

              </div>
            )}

          </div>
        </div>

      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSaveModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all-300"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-heading font-bold mb-1">Commit New Prompt Version</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Every save logs an audit history. A change summary is required.
            </p>

            {saveError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Change Summary (Mandatory)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Added SQL aggregation, improved fiscal year check"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Release Status
                </label>
                <select
                  value={saveStatus}
                  onChange={(e) => setSaveStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300"
                >
                  <option value="Draft">Draft</option>
                  <option value="Testing">Testing</option>
                  <option value="Production">Production</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-xl transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-primary/10 transition-all-300 disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Commit Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Version Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRestoreModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all-300"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-heading font-bold mb-1">Restore Prompt Version</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Restoring DOES NOT overwrite history. Instead, this will save the content of Version {selectedVersion?.version_number} as a new active version.
            </p>

            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Reason for restore
                </label>
                <input
                  type="text"
                  placeholder={`e.g. Restored from Version ${selectedVersion?.version_number}`}
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-input rounded-xl bg-muted/20 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all-300"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-xl transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restoreLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all-300"
                >
                  {restoreLoading ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default PromptEditor;
