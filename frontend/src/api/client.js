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

  // Bills endpoints
  async getBills(entityId) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request(`/bills${query}`);
  }

  async createBill(data) {
    return this.request('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBill(id, data) {
    return this.request(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBill(id) {
    return this.request(`/bills/${id}`, { method: 'DELETE' });
  }

  async markBillPaid(id, amount = null) {
    const query = amount ? `?amount=${amount}` : '';
    return this.request(`/bills/${id}/mark-paid${query}`, { method: 'POST' });
  }

  // Reports endpoints
  async generateReport(reportType, entityId, startDate, endDate, categoryId = null) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        report_type: reportType,
        entity_id: entityId,
        start_date: startDate,
        end_date: endDate,
        category_id: categoryId,
      }),
    });
  }

  async getReportPresets() {
    return this.request('/reports/presets');
  }

  async createReportPreset(data) {
    return this.request('/reports/presets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteReportPreset(id) {
    return this.request(`/reports/presets/${id}`, { method: 'DELETE' });
  }

  // Tax Planning endpoints
  async getTaxScenarios(entityId, taxYear = null) {
    let query = `entity_id=${entityId}`;
    if (taxYear) query += `&tax_year=${taxYear}`;
    return this.request(`/tax/scenarios?${query}`);
  }

  async createTaxScenario(data) {
    return this.request('/tax/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTaxScenario(id) {
    return this.request(`/tax/scenarios/${id}`, { method: 'DELETE' });
  }

  // Groups endpoints
  async getGroups() {
    return this.request('/groups');
  }

  async createGroup(data) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id, data) {
    return this.request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id) {
    return this.request(`/groups/${id}`, { method: 'DELETE' });
  }

  async getGroupMembers(groupId) {
    return this.request(`/groups/${groupId}/members`);
  }

  async addGroupMember(groupId, userEmail, role = 'member') {
    return this.request(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId, user_email: userEmail, role }),
    });
  }

  async removeGroupMember(groupId, memberId) {
    return this.request(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  }

  async getGroupAccess(groupId) {
    return this.request(`/groups/${groupId}/access`);
  }

  async grantGroupAccess(groupId, entityId, accessLevel = 'read') {
    return this.request(`/groups/${groupId}/access`, {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId, entity_id: entityId, access_level: accessLevel }),
    });
  }

  async revokeGroupAccess(groupId, accessId) {
    return this.request(`/groups/${groupId}/access/${accessId}`, { method: 'DELETE' });
  }

  // Financial Profiles endpoints
  async getFinancialProfiles(entityId = null) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request(`/financial-profiles${query}`);
  }

  async getFinancialProfile(entityId) {
    return this.request(`/financial-profiles/${entityId}`);
  }

  async saveFinancialProfile(data) {
    return this.request('/financial-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Import endpoints
  async getImportBatches(entityId = null) {
    const query = entityId ? `?entity_id=${entityId}` : '';
    return this.request(`/imports/batches${query}`);
  }

  async importCSV(entityId, accountId, file) {
    const formData = new FormData();
    formData.append('entity_id', entityId);
    formData.append('account_id', accountId);
    formData.append('file', file);

    const response = await fetch(`${API_URL}/imports/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Import failed');
    }

    return response.json();
  }

  async importPDF(entityId, accountId, file) {
    const formData = new FormData();
    formData.append('entity_id', entityId);
    formData.append('account_id', accountId);
    formData.append('file', file);

    const response = await fetch(`${API_URL}/imports/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'PDF import failed');
    }

    return response.json();
  }

  async deleteImportBatch(id, deleteTransactions = false) {
    const query = deleteTransactions ? '?delete_transactions=true' : '';
    return this.request(`/imports/batches/${id}${query}`, { method: 'DELETE' });
  }

  // AI Functions endpoints
  async detectAnomalies(entityId) {
    return this.request(`/ai/detect-anomalies?entity_id=${entityId}`, { method: 'POST' });
  }

  async forecastCashFlow(entityId, months = 3) {
    return this.request(`/ai/forecast-cash-flow?entity_id=${entityId}&forecast_months=${months}`, { method: 'POST' });
  }

  async identifyCostSavings(entityId) {
    return this.request(`/ai/identify-cost-savings?entity_id=${entityId}`, { method: 'POST' });
  }

  async generateBudget(entityId, month) {
    return this.request(`/ai/generate-budget?entity_id=${entityId}&month=${month}`, { method: 'POST' });
  }

  async categorizeTransaction(transactionId, entityId) {
    return this.request(`/ai/categorize-transaction?transaction_id=${transactionId}&entity_id=${entityId}`, { method: 'POST' });
  }

  async generateTags(transactionId) {
    return this.request(`/ai/generate-tags?transaction_id=${transactionId}`, { method: 'POST' });
  }

  async getGoalRecommendations(goalId) {
    return this.request(`/ai/goal-recommendations?goal_id=${goalId}`, { method: 'POST' });
  }

  async estimateTax(entityId, taxYear, filingStatus) {
    return this.request(`/ai/estimate-tax?entity_id=${entityId}&tax_year=${taxYear}&filing_status=${filingStatus}`, { method: 'POST' });
  }

  async forecastBudget(entityId, months = 3) {
    return this.request(`/ai/forecast-budget?entity_id=${entityId}&forecast_months=${months}`, { method: 'POST' });
  }

  async detectBills(entityId) {
    return this.request(`/ai/detect-bills?entity_id=${entityId}`, { method: 'POST' });
  }

  // Notifications endpoints
  async getNotifications(limit = 20, unreadOnly = false) {
    return this.request(`/notifications?limit=${limit}&unread_only=${unreadOnly}`);
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  async markNotificationsRead(notificationIds) {
    return this.request('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'POST' });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }

  async checkAlerts(entityId) {
    return this.request(`/notifications/check-alerts?entity_id=${entityId}`, { method: 'POST' });
  }

  async getNotificationPreferences() {
    return this.request('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences) {
    return this.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async sendTestEmail(email, subject = 'Test Email from BlackieFi') {
    return this.request('/notifications/send-test-email', {
      method: 'POST',
      body: JSON.stringify({ email, subject }),
    });
  }

  // ==========================================================================
  // Knowledge Lab
  // ==========================================================================

  async uploadKnowledgeDocument(file, description = null, tags = null, entityId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags);
    if (entityId) formData.append('entity_id', entityId);

    const response = await fetch(`${API_URL}/knowledge/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async getKnowledgeDocuments(params = {}) {
    const query = new URLSearchParams();
    if (params.entity_id) query.append('entity_id', params.entity_id);
    if (params.file_type) query.append('file_type', params.file_type);
    if (params.tag) query.append('tag', params.tag);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/knowledge/documents${queryStr}`);
  }

  async getKnowledgeDocument(docId) {
    return this.request(`/knowledge/documents/${docId}`);
  }

  async deleteKnowledgeDocument(docId) {
    return this.request(`/knowledge/documents/${docId}`, { method: 'DELETE' });
  }

  async analyzeKnowledgeDocument(docId, query = null) {
    const formData = new FormData();
    if (query) formData.append('query', query);

    const response = await fetch(`${API_URL}/knowledge/analyze/${docId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(error.detail || 'Analysis failed');
    }

    return response.json();
  }

  async getKnowledgeStats() {
    return this.request('/knowledge/stats');
  }

  async chatWithKnowledgeBase(message) {
    const formData = new FormData();
    formData.append('message', message);

    const response = await fetch(`${API_URL}/knowledge/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Chat failed' }));
      throw new Error(error.detail || 'Chat failed');
    }

    return response.json();
  }

  // ==========================================================================
  // Strategy Studio
  // ==========================================================================

  async getStrategyFrameworks() {
    return this.request('/strategy/frameworks');
  }

  async createStrategyFramework(framework) {
    return this.request('/strategy/frameworks', {
      method: 'POST',
      body: JSON.stringify(framework),
    });
  }

  async deleteStrategyFramework(frameworkId) {
    return this.request(`/strategy/frameworks/${frameworkId}`, { method: 'DELETE' });
  }

  async analyzeWithStrategy(frameworkId, assetType, tickerOrName, additionalContext = null) {
    return this.request('/strategy/analyze', {
      method: 'POST',
      body: JSON.stringify({
        framework_id: frameworkId,
        asset_type: assetType,
        ticker_or_name: tickerOrName,
        additional_context: additionalContext,
      }),
    });
  }

  async compareStrategies(assetType, tickerOrName, frameworkIds) {
    return this.request('/strategy/compare', {
      method: 'POST',
      body: JSON.stringify({
        asset_type: assetType,
        ticker_or_name: tickerOrName,
        framework_ids: frameworkIds,
      }),
    });
  }

  async getStrategyHistory(limit = 20) {
    return this.request(`/strategy/history?limit=${limit}`);
  }

  async getStrategyAnalysisDetail(analysisId) {
    return this.request(`/strategy/history/${analysisId}`);
  }

  // ==========================================================================
  // Analysis Lab
  // ==========================================================================

  async comprehensiveAnalysis(assetType, identifier, depth = 'standard', includeSections = []) {
    return this.request('/analysis/comprehensive', {
      method: 'POST',
      body: JSON.stringify({
        asset_type: assetType,
        identifier: identifier,
        analysis_depth: depth,
        include_sections: includeSections,
      }),
    });
  }

  async riskAssessment(assetType, identifier, investmentAmount, timeHorizon) {
    return this.request('/analysis/risk-assessment', {
      method: 'POST',
      body: JSON.stringify({
        asset_type: assetType,
        identifier: identifier,
        investment_amount: investmentAmount,
        time_horizon: timeHorizon,
      }),
    });
  }

  async dueDiligence(assetType, identifier, dealSize = null) {
    return this.request('/analysis/due-diligence', {
      method: 'POST',
      body: JSON.stringify({
        asset_type: assetType,
        identifier: identifier,
        deal_size: dealSize,
      }),
    });
  }

  async marketResearch(sector, focusArea = null) {
    const formData = new FormData();
    formData.append('sector', sector);
    if (focusArea) formData.append('focus_area', focusArea);

    const response = await fetch(`${API_URL}/analysis/market-research`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Research failed' }));
      throw new Error(error.detail || 'Research failed');
    }

    return response.json();
  }

  async portfolioAnalysis(entityId) {
    const formData = new FormData();
    formData.append('entity_id', entityId);

    const response = await fetch(`${API_URL}/analysis/portfolio-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(error.detail || 'Analysis failed');
    }

    return response.json();
  }

  async getAnalysisHistory(analysisType = null, limit = 20) {
    let query = `limit=${limit}`;
    if (analysisType) query += `&analysis_type=${analysisType}`;
    return this.request(`/analysis/history?${query}`);
  }

  // =============================================================================
  // AUDIT LOG ENDPOINTS
  // =============================================================================

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.userId) query.append('user_id', params.userId);
    if (params.entityId) query.append('entity_id', params.entityId);
    if (params.action) query.append('action', params.action);
    if (params.resourceType) query.append('resource_type', params.resourceType);
    if (params.severity) query.append('severity', params.severity);
    if (params.startDate) query.append('start_date', params.startDate);
    if (params.endDate) query.append('end_date', params.endDate);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);
    return this.request(`/audit/logs?${query.toString()}`);
  }

  async getAuditLogEntry(entryId) {
    return this.request(`/audit/logs/${entryId}`);
  }

  async verifyAuditLogIntegrity(entryId) {
    return this.request(`/audit/logs/${entryId}/verify`);
  }

  async getMyActivity(days = 30, limit = 50) {
    return this.request(`/audit/my-activity?days=${days}&limit=${limit}`);
  }

  async getSecurityEvents(hours = 24, limit = 100) {
    return this.request(`/audit/security-events?hours=${hours}&limit=${limit}`);
  }

  async getEntityAuditTrail(entityId, limit = 100) {
    return this.request(`/audit/entity/${entityId}/trail?limit=${limit}`);
  }

  async getAuditStatistics(days = 7) {
    return this.request(`/audit/statistics?days=${days}`);
  }

  async getAuditActions() {
    return this.request('/audit/actions');
  }

  // =============================================================================
  // BACKUP & RECOVERY ENDPOINTS
  // =============================================================================

  async listBackups() {
    return this.request('/admin/backup/list');
  }

  async createBackup(backupType = 'full', compress = true, includeAudit = true) {
    return this.request('/admin/backup/create', {
      method: 'POST',
      body: JSON.stringify({
        backup_type: backupType,
        compress,
        include_audit: includeAudit,
      }),
    });
  }

  async restoreBackup(backupName, collections = null, dropExisting = false) {
    return this.request('/admin/backup/restore', {
      method: 'POST',
      body: JSON.stringify({
        backup_name: backupName,
        collections,
        drop_existing: dropExisting,
      }),
    });
  }

  async deleteBackup(backupName) {
    return this.request(`/admin/backup/${backupName}`, {
      method: 'DELETE',
    });
  }

  async cleanupBackups(retentionDays = 30, keepMinimum = 5) {
    return this.request('/admin/backup/cleanup', {
      method: 'POST',
      body: JSON.stringify({
        retention_days: retentionDays,
        keep_minimum: keepMinimum,
      }),
    });
  }

  async getDatabaseStats() {
    return this.request('/admin/backup/stats');
  }

  async exportMyData(includeAiData = true) {
    return this.request(`/admin/backup/export-my-data?include_ai_data=${includeAiData}`, {
      method: 'POST',
    });
  }

  getBackupDownloadUrl(backupName) {
    const token = this.getToken();
    return `${API_URL}/admin/backup/download/${backupName}?token=${token}`;
  }
}

export const api = new ApiClient();
export default api;
