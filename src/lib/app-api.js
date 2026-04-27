const TOKEN_KEY = "blackiefi_access_token";

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, headers = {}, responseType = "json" } = {}) {
  const token = getToken();
  const response = await fetch(path, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body == null ? undefined : body instanceof FormData ? body : JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody?.error || errorBody?.detail || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = errorBody;
    throw error;
  }

  if (responseType === "blob") {
    return response.blob();
  }

  if (responseType === "text") {
    return response.text();
  }

  return response.json();
}

export const appApi = {
  get(path, options) {
    return request(path, { ...options, method: "GET" });
  },
  post(path, body, options) {
    return request(path, { ...options, method: "POST", body });
  },
  put(path, body, options) {
    return request(path, { ...options, method: "PUT", body });
  },
  patch(path, body, options) {
    return request(path, { ...options, method: "PATCH", body });
  },
  delete(path, options) {
    return request(path, { ...options, method: "DELETE" });
  }
};
