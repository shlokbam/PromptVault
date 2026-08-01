import axios from 'axios';
import type { 
  User, Agent, PromptType, PromptVersion, 
  TestedQuestion, Comment, ActivityLog, 
  SearchMatch, DashboardStats 
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are not on the login page, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post<{ access_token: string; token_type: string; user: User }>('/login', { email, password });
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export const agentService = {
  async getAgents() {
    const response = await api.get<Agent[]>('/agents');
    return response.data;
  },
  async createAgent(name: string, description?: string) {
    const response = await api.post<Agent>('/agents', { name, description });
    return response.data;
  },
  async updateAgent(id: number, name: string, description?: string) {
    const response = await api.put<Agent>(`/agents/${id}`, { name, description });
    return response.data;
  },
  async deleteAgent(id: number) {
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  },
  async getPromptTypes(agentId: number) {
    const response = await api.get<PromptType[]>(`/agents/${agentId}/prompt-types`);
    return response.data;
  }
};

export const versionService = {
  async getVersions(promptTypeId: number) {
    const response = await api.get<PromptVersion[]>(`/prompt-types/${promptTypeId}/versions`);
    return response.data;
  },
  async createVersion(promptTypeId: number, content: string, changeSummary: string, status: string) {
    const response = await api.post<PromptVersion>(`/prompt-types/${promptTypeId}/versions`, {
      content,
      change_summary: changeSummary,
      status
    });
    return response.data;
  },
  async getVersion(id: number) {
    const response = await api.get<PromptVersion>(`/versions/${id}`);
    return response.data;
  },
  async restoreVersion(id: number, reason: string) {
    const response = await api.post<PromptVersion>(`/versions/${id}/restore`, { reason });
    return response.data;
  },
  async deleteVersion(id: number) {
    const response = await api.delete(`/versions/${id}`);
    return response.data;
  }
};

export const commentService = {
  async getComments(versionId: number) {
    const response = await api.get<Comment[]>(`/versions/${versionId}/comments`);
    return response.data;
  },
  async createComment(versionId: number, comment: string) {
    const response = await api.post<Comment>(`/versions/${versionId}/comments`, { comment });
    return response.data;
  }
};

export const testService = {
  async getTests(versionId: number) {
    const response = await api.get<TestedQuestion[]>(`/versions/${versionId}/tests`);
    return response.data;
  },
  async createTest(versionId: number, question: string, expectedOutput: string, actualOutput: string, status: 'PASS' | 'FAIL', notes?: string) {
    const response = await api.post<TestedQuestion>(`/versions/${versionId}/tests`, {
      question,
      expected_output: expectedOutput,
      actual_output: actualOutput,
      status,
      notes
    });
    return response.data;
  }
};

export const searchService = {
  async search(q: string) {
    const response = await api.get<{ query: string; results: SearchMatch[] }>(`/search?q=${encodeURIComponent(q)}`);
    return response.data;
  }
};

export const systemService = {
  async getActivity() {
    const response = await api.get<ActivityLog[]>('/activity');
    return response.data;
  },
  async getStats() {
    const response = await api.get<DashboardStats>('/stats');
    return response.data;
  }
};

export default api;
