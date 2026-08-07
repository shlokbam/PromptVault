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

// --- VS Code Webview Message Bridge ---
declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage: (msg: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
    vscodeApi?: any;
  }
}

let vscode: any = null;
if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
  if (!window.vscodeApi) {
    window.vscodeApi = window.acquireVsCodeApi();
  }
  vscode = window.vscodeApi;
}

const pendingRequests = new Map<string, { resolve: (value: any) => void, reject: (reason: any) => void }>();

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message && message.type === 'response') {
      const pending = pendingRequests.get(message.id);
      if (pending) {
        pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.data);
        }
      }
    }
  });
}

function sendVsCodeRequest(action: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(2, 11);
    pendingRequests.set(id, { resolve, reject });
    if (vscode) {
      vscode.postMessage({ id, action, payload });
    } else {
      reject(new Error("VS Code API not available"));
    }
  });
}

export const authService = {
  async login(email: string, password: string) {
    if (vscode) {
      const data = await sendVsCodeRequest('login', { email, password });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    }
    const response = await api.post<{ access_token: string; token_type: string; user: User }>('/login', { email, password });
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  },
  async register(name: string, email: string, role: 'Manager' | 'Member', password: string) {
    if (vscode) {
      return sendVsCodeRequest('register', { name, email, role, password });
    }
    const response = await api.post<User>('/register', { name, email, role, password });
    return response.data;
  },
  async changePassword(oldPassword: string, newPassword: string) {
    if (vscode) {
      return sendVsCodeRequest('changePassword', { oldPassword, newPassword });
    }
    const response = await api.post('/users/change-password', { old_password: oldPassword, new_password: newPassword });
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
    if (vscode) {
      return sendVsCodeRequest('getAgents');
    }
    const response = await api.get<Agent[]>('/agents');
    return response.data;
  },
  async createAgent(name: string, description?: string) {
    if (vscode) {
      return sendVsCodeRequest('createAgent', { name, description });
    }
    const response = await api.post<Agent>('/agents', { name, description });
    return response.data;
  },
  async updateAgent(id: number, name: string, description?: string) {
    if (vscode) {
      return sendVsCodeRequest('updateAgent', { id, name, description });
    }
    const response = await api.put<Agent>(`/agents/${id}`, { name, description });
    return response.data;
  },
  async deleteAgent(id: number) {
    if (vscode) {
      return sendVsCodeRequest('deleteAgent', { id });
    }
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  },
  async getPromptTypes(agentId: number) {
    if (vscode) {
      return sendVsCodeRequest('getPromptTypes', { agentId });
    }
    const response = await api.get<PromptType[]>(`/agents/${agentId}/prompt-types`);
    return response.data;
  },
  async createPromptType(agentId: number, typeName: string) {
    if (vscode) {
      return sendVsCodeRequest('createPromptType', { agentId, typeName });
    }
    const response = await api.post<PromptType>('/prompt-types', { type_name: typeName }, { params: { agent_id: agentId } });
    return response.data;
  },
  async deletePromptType(id: number) {
    if (vscode) {
      return sendVsCodeRequest('deletePromptType', { id });
    }
    const response = await api.delete(`/prompt-types/${id}`);
    return response.data;
  }
};

export const versionService = {
  async getVersions(promptTypeId: number) {
    if (vscode) {
      return sendVsCodeRequest('getVersions', { promptTypeId });
    }
    const response = await api.get<PromptVersion[]>(`/prompt-types/${promptTypeId}/versions`);
    return response.data;
  },
  async createVersion(promptTypeId: number, content: string, changeSummary: string, status: string) {
    if (vscode) {
      return sendVsCodeRequest('createVersion', { promptTypeId, content, changeSummary, status });
    }
    const response = await api.post<PromptVersion>(`/prompt-types/${promptTypeId}/versions`, {
      content,
      change_summary: changeSummary,
      status
    });
    return response.data;
  },
  async getVersion(id: number) {
    if (vscode) {
      return sendVsCodeRequest('getVersion', { id });
    }
    const response = await api.get<PromptVersion>(`/versions/${id}`);
    return response.data;
  },
  async restoreVersion(id: number, reason: string) {
    if (vscode) {
      return sendVsCodeRequest('restoreVersion', { id, reason });
    }
    const response = await api.post<PromptVersion>(`/versions/${id}/restore`, { reason });
    return response.data;
  },
  async deleteVersion(id: number) {
    if (vscode) {
      return sendVsCodeRequest('deleteVersion', { id });
    }
    const response = await api.delete(`/versions/${id}`);
    return response.data;
  }
};

export const commentService = {
  async getComments(versionId: number) {
    if (vscode) {
      return sendVsCodeRequest('getComments', { versionId });
    }
    const response = await api.get<Comment[]>(`/versions/${versionId}/comments`);
    return response.data;
  },
  async createComment(versionId: number, comment: string) {
    if (vscode) {
      return sendVsCodeRequest('createComment', { versionId, comment });
    }
    const response = await api.post<Comment>(`/versions/${versionId}/comments`, { comment });
    return response.data;
  }
};

export const testService = {
  async getTests(versionId: number) {
    if (vscode) {
      return sendVsCodeRequest('getTests', { versionId });
    }
    const response = await api.get<TestedQuestion[]>(`/versions/${versionId}/tests`);
    return response.data;
  },
  async createTest(versionId: number, question: string, expectedOutput: string, actualOutput: string, status: 'PASS' | 'FAIL', notes?: string) {
    if (vscode) {
      return sendVsCodeRequest('createTest', { versionId, question, expectedOutput, actualOutput, status, notes });
    }
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
    if (vscode) {
      return sendVsCodeRequest('search', { q });
    }
    const response = await api.get<{ query: string; results: SearchMatch[] }>(`/search?q=${encodeURIComponent(q)}`);
    return response.data;
  }
};

export const systemService = {
  async getActivity() {
    if (vscode) {
      return sendVsCodeRequest('getActivity');
    }
    const response = await api.get<ActivityLog[]>('/activity');
    return response.data;
  },
  async getStats() {
    if (vscode) {
      return sendVsCodeRequest('getStats');
    }
    const response = await api.get<DashboardStats>('/stats');
    return response.data;
  }
};

export default api;
