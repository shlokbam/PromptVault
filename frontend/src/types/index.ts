export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Manager' | 'Member';
  created_at: string;
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  creator_name?: string;
}

export interface PromptType {
  id: number;
  agent_id: number;
  type_name: 'System' | 'SQL' | 'Chart' | 'Validation' | string;
}

export interface PromptVersion {
  id: number;
  prompt_type_id: number;
  version_number: number;
  content: string;
  change_summary: string;
  status: 'Draft' | 'Testing' | 'Production' | 'Archived';
  author_id: number;
  author_name: string;
  created_at: string;
  restored_from_version?: number;
  prompt_type_name?: string;
  agent_name?: string;
  agent_id?: number;
}

export interface TestedQuestion {
  id: number;
  prompt_version_id: number;
  question: string;
  expected_output: string;
  actual_output: string;
  status: 'PASS' | 'FAIL';
  notes?: string;
}

export interface Comment {
  id: number;
  prompt_version_id: number;
  author_id: number;
  author_name: string;
  comment: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  created_at: string;
}

export interface SearchMatch {
  id: number;
  type: 'agent' | 'version' | 'test_case' | 'comment';
  title: string;
  subtitle: string;
  snippet: string;
  route_path: string;
}

export interface DashboardStats {
  total_agents: number;
  total_prompts: number;
  total_versions: number;
  total_updates_today: number;
}
