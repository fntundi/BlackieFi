// BlackieFi API Client - Next.js Version
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    this.setToken(null);
  }

  async getProfile() {
    return this.request<any>('/auth/profile');
  }

  // Entities
  async getEntities() {
    return this.request<any[]>('/entities');
  }

  async getEntity(id: string) {
    return this.request<any>(`/entities/${id}`);
  }

  async createEntity(data: any) {
    return this.request<any>('/entities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Accounts
  async getAccounts(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/accounts${query}`);
  }

  async createAccount(data: any) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transactions
  async getTransactions(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/transactions?${query}`);
  }

  async createTransaction(data: any) {
    return this.request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('/categories');
  }

  // Budgets
  async getBudgets(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/budgets${query}`);
  }

  // Goals
  async getGoals(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/goals${query}`);
  }

  // Investments
  async getInvestments(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/investments${query}`);
  }

  // Assets
  async getAssets(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/assets${query}`);
  }

  // Debts
  async getDebts(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any[]>(`/debts${query}`);
  }

  // Dashboard
  async getDashboardSummary(entityId?: string) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request<any>(`/dashboard/summary${query}`);
  }

  // Audit Logs
  async getAuditLogs(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any>(`/audit/logs?${query}`);
  }

  async getAuditStatistics(days: number = 7) {
    return this.request<any>(`/audit/statistics?days=${days}`);
  }

  async getSecurityEvents(hours: number = 24, limit: number = 100) {
    return this.request<any>(`/audit/security-events?hours=${hours}&limit=${limit}`);
  }

  // Backup
  async listBackups() {
    return this.request<any>('/admin/backup/list');
  }

  async createBackup(backupType: string = 'full', compress: boolean = true) {
    return this.request<any>('/admin/backup/create', {
      method: 'POST',
      body: JSON.stringify({ backup_type: backupType, compress }),
    });
  }

  async getDatabaseStats() {
    return this.request<any>('/admin/backup/stats');
  }

  async getBackupSchedule() {
    return this.request<any>('/admin/backup/schedule');
  }

  async updateBackupSchedule(settings: any) {
    return this.request<any>('/admin/backup/schedule', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Market Data
  async getMarketDataProviders() {
    return this.request<any>('/market/providers');
  }

  async updateMarketDataProvider(provider: string, config: any) {
    return this.request<any>(`/market/providers/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async testMarketDataProvider(provider: string) {
    return this.request<any>(`/market/providers/${provider}/test`, {
      method: 'POST',
    });
  }

  async getStockQuote(symbol: string) {
    return this.request<any>(`/market/stocks/quote/${symbol}`);
  }

  async searchStocks(query: string) {
    return this.request<any>(`/market/stocks/search?q=${encodeURIComponent(query)}`);
  }

  async getCryptoPrice(coinId: string) {
    return this.request<any>(`/market/crypto/price/${coinId}`);
  }

  async getTopCryptos(limit: number = 10) {
    return this.request<any>(`/market/crypto/top?limit=${limit}`);
  }

  async searchCryptos(query: string) {
    return this.request<any>(`/market/crypto/search?q=${encodeURIComponent(query)}`);
  }

  // Notifications
  async getNotifications(unreadOnly: boolean = false) {
    const query = unreadOnly ? '?unread_only=true' : '';
    return this.request<any>(`/notifications${query}`);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'POST' });
  }

  // AI Co-Pilot
  async analyzeWithAI(type: string, data: any) {
    return this.request<any>(`/analysis/${type}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
export default api;
