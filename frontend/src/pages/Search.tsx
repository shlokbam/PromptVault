import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Cpu, FileCode, HelpCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { searchService, authService } from '../services/api';
import type { SearchMatch } from '../types';

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const performSearch = async () => {
      if (!query.trim()) return;
      setLoading(true);
      try {
        const response = await searchService.search(query);
        setResults(response.results);
      } catch (err) {
        console.error('Error during search:', err);
      } finally {
        setLoading(false);
      }
    };
    performSearch();
  }, [query, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground font-mono">Running search queries...</p>
      </div>
    );
  }

  // Group results by type
  const agents = results.filter(r => r.type === 'agent');
  const versions = results.filter(r => r.type === 'version');
  const testCases = results.filter(r => r.type === 'test_case');
  const comments = results.filter(r => r.type === 'comment');

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      
      {/* Search Result Title */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Global Search Results</h1>
        <p className="text-muted-foreground text-xs mt-1">
          Showing matches for keyword: <span className="font-mono text-primary font-semibold">"{query}"</span> ({results.length} total matches)
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <SearchIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">No Results Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Try searching for terms inside prompt contents, agent names, expected test answers, or user comments.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Category 1: Agents */}
          {agents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" /> Agents ({agents.length})
              </h2>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {agents.map((match) => (
                  <Link
                    key={match.id}
                    to={match.route_path}
                    className="p-4 hover:bg-muted/40 transition-all-300 flex items-center justify-between text-xs group"
                  >
                    <div className="space-y-1">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-all-300">{match.title}</span>
                      <p className="text-muted-foreground text-[10px]">{match.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Category 2: Versions */}
          {versions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-emerald-500" /> Saved Prompts ({versions.length})
              </h2>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {versions.map((match) => (
                  <Link
                    key={match.id}
                    to={match.route_path}
                    className="p-4 hover:bg-muted/40 transition-all-300 flex items-center justify-between text-xs group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-all-300">{match.title}</span>
                      <p className="text-[10px] text-muted-foreground italic font-mono">{match.subtitle}</p>
                      <pre className="p-2 bg-muted/30 border border-border/50 rounded-lg text-[9px] font-mono text-muted-foreground overflow-x-auto whitespace-pre truncate">
                        {match.snippet}
                      </pre>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-all-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Category 3: Tested Questions */}
          {testCases.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" /> Test Suite Matches ({testCases.length})
              </h2>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {testCases.map((match) => (
                  <Link
                    key={match.id}
                    to={match.route_path}
                    className="p-4 hover:bg-muted/40 transition-all-300 flex items-center justify-between text-xs group"
                  >
                    <div className="space-y-1 flex-1 pr-6">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-all-300">{match.title}</span>
                      <p className="text-muted-foreground font-semibold text-[10px]">{match.subtitle}</p>
                      <p className="text-muted-foreground text-[9px] font-mono">{match.snippet}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-all-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Category 4: Comments */}
          {comments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Discussion Threads ({comments.length})
              </h2>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {comments.map((match) => (
                  <Link
                    key={match.id}
                    to={match.route_path}
                    className="p-4 hover:bg-muted/40 transition-all-300 flex items-center justify-between text-xs group"
                  >
                    <div className="space-y-1.5 flex-1 pr-6">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-all-300">{match.title}</span>
                      <p className="text-muted-foreground font-semibold text-[10px] bg-muted/30 border border-border/50 p-2 rounded-lg italic">
                        "{match.subtitle}"
                      </p>
                      <p className="text-muted-foreground text-[9px]">{match.snippet}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-all-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
export default Search;
