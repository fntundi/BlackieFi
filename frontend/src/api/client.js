// BlackieFi API Client v2
// Use environment variable for API URL, fallback to localhost for development
const API_URL = process.env.REACT_APP_BACKEND_URL 
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'http://localhost:8001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('blackiefi_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('blackiefi_token', token);
    } else {
      localStorage.removeItem('blackiefi_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(username, email, password, fullName) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, full_name: fullName }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordReset(email) {
    return this.request('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, newPassword) {
    return this.request('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  logout() {
    this.setToken(null);
  }

  // Settings endpoints
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(data) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAIStatus() {
    return this.request('/settings/ai-status');
  }

  // Entity endpoints
  async getEntities() {
    return this.request('/entities');
  }

  async createEntity(data) {
    return this.request('/entities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEntity(id) {
    return this.request(`/entities/${id}`);
  }

  async updateEntity(id, data) {
    return this.request(`/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEntity(id) {
    return this.request(`/entities/${id}`, { method: 'DELETE' });
  }

  // Account endpoints
  async getAccounts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/accounts${query ? '?' + query : ''}`);
  }

  async createAccount(data) {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAccount(id) {
    return this.request(`/accounts/${id}`);
  }

  async updateAccount(id, data) {
    return this.request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id) {
    return this.request(`/accounts/${id}`, { method: 'DELETE' });
  }

  // Category endpoints
  async getCategories(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/categories${query ? '?' + query : ''}`);
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Transaction endpoints
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? '?' + query : ''}`);
  }

  async createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransaction(id) {
    return this.request(`/transactions/${id}`);
  }

  async updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  // Recurring transaction endpoints
  async getRecurringTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/recurring${query ? '?' + query : ''}`);
  }

  async createRecurringTransaction(data) {
    return this.request('/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRecurringTransaction(id, data) {
    return this.request(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRecurringTransaction(id) {
    return this.request(`/recurring/${id}`, { method: 'DELETE' });
  }

  // Budget endpoints
  async getBudgets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/budgets${query ? '?' + query : ''}`);
  }

  async createBudget(data) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id, data) {
    return this.request(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id) {
    return this.request(`/budgets/${id}`, { method: 'DELETE' });
  }

  // Debt endpoints
  async getDebts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/debts${query ? '?' + query : ''}`);
  }

  async createDebt(data) {
    return this.request('/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDebt(id, data) {
    return this.request(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDebt(id) {
    return this.request(`/debts/${id}`, { method: 'DELETE' });
  }

  // Investment endpoints
  async getInvestmentVehicles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/investment-vehicles${query ? '?' + query : ''}`);
  }

  async createInvestmentVehicle(data) {
    return this.request('/investment-vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvestmentVehicle(id, data) {
    return this.request(`/investment-vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvestmentVehicle(id) {
    return this.request(`/investment-vehicles/${id}`, { method: 'DELETE' });
  }

  async getInvestmentHoldings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/investment-holdings${query ? '?' + query : ''}`);
  }

  async createInvestmentHolding(data) {
    return this.request('/investment-holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvestmentHolding(id, data) {
    return this.request(`/investment-holdings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvestmentHolding(id) {
    return this.request(`/investment-holdings/${id}`, { method: 'DELETE' });
  }

  // Asset endpoints
  async getAssets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/assets${query ? '?' + query : ''}`);
  }

  async createAsset(data) {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAsset(id, data) {
    return this.request(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id) {
    return this.request(`/assets/${id}`, { method: 'DELETE' });
  }

  // Inventory endpoints
  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inventory${query ? '?' + query : ''}`);
  }

  async createInventoryItem(data) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventoryItem(id, data) {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryItem(id) {
    return this.request(`/inventory/${id}`, { method: 'DELETE' });
  }

  // Financial goal endpoints
  async getGoals(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/goals${query ? '?' + query : ''}`);
  }

  async createGoal(data) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id, data) {
    return this.request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateGoalStatus(id, status) {
    return this.request(`/goals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteGoal(id) {
    return this.request(`/goals/${id}`, { method: 'DELETE' });
  }

  // Admin LLM Configuration endpoints
  async getLLMProviders() {
    return this.request('/admin/llm/providers');
  }

  async getProviderModels(provider) {
    return this.request(`/admin/llm/providers/${provider}/models`);
  }

  async updateProviderConfig(provider, config) {
    return this.request(`/admin/llm/providers/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async setActiveProvider(provider) {
    return this.request(`/admin/llm/providers/${provider}/set-active`, {
      method: 'POST',
    });
  }

  async testProvider(provider, prompt) {
    return this.request('/admin/llm/test', {
      method: 'POST',
      body: JSON.stringify({ provider, prompt }),
    });
  }

  async aiChat(message, context, feature = 'general') {
    return this.request('/admin/llm/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context, feature }),
    });
  }
}

export const api = new ApiClient();
export default api;
