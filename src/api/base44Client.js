const TOKEN_KEY = 'blackiefi_access_token';

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
  const response = await fetch(path, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body == null ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = raw ? null : await response.json().catch(() => ({}));
    const error = new Error(errorBody?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = errorBody;
    throw error;
  }

  if (raw) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.arrayBuffer();
}

async function bootstrapSession() {
  const session = await request('/api/auth/bootstrap', { method: 'POST' });
  setToken(session.token);
  return session.user;
}

function buildEntityApi(entityName) {
  return {
    list(sort, limit) {
      return request(`/api/entities/${entityName}/list`, {
        method: 'POST',
        body: { sort, limit },
      });
    },
    filter(filter, sort, limit) {
      return request(`/api/entities/${entityName}/list`, {
        method: 'POST',
        body: { filter, sort, limit },
      });
    },
    get(id) {
      return request(`/api/entities/${entityName}/${id}`);
    },
    create(data) {
      return request(`/api/entities/${entityName}`, {
        method: 'POST',
        body: data,
      });
    },
    update(id, data) {
      return request(`/api/entities/${entityName}/${id}`, {
        method: 'PATCH',
        body: data,
      });
    },
    delete(id) {
      return request(`/api/entities/${entityName}/${id}`, {
        method: 'DELETE',
      });
    },
    bulkCreate(rows) {
      return request(`/api/entities/${entityName}/bulk`, {
        method: 'POST',
        body: rows,
      });
    }
  };
}

export const base44 = {
  auth: {
    async me() {
      if (!getToken()) {
        const error = new Error('Authentication required');
        error.status = 401;
        throw error;
      }
      return request('/api/auth/me');
    },
    async bootstrap() {
      return bootstrapSession();
    },
    async logout(redirectUrl) {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore logout failures while clearing local state
      }
      setToken(null);
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      }
    },
    async redirectToLogin(redirectUrl) {
      await bootstrapSession();
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      } else {
        window.location.reload();
      }
    },
  },
  entities: new Proxy({}, {
    get(_target, entityName) {
      return buildEntityApi(entityName);
    }
  }),
  functions: {
    async invoke(name, payload = {}) {
      const response = await request(`/api/functions/${name}`, {
        method: 'POST',
        body: payload,
        raw: name === 'exportReportPDF',
      });

      if (name === 'exportReportPDF') {
        return { data: await response.arrayBuffer() };
      }

      return { data: response };
    }
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        return request('/api/integrations/upload', {
          method: 'POST',
          body: formData,
        });
      },
      async ExtractDataFromUploadedFile(payload) {
        return request('/api/integrations/extract', {
          method: 'POST',
          body: payload,
        });
      }
    }
  },
  appLogs: {
    async logUserInApp(pageName) {
      return request('/api/app-logs', {
        method: 'POST',
        body: { page_name: pageName },
      });
    }
  }
};
