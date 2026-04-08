import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const entityId = localStorage.getItem("currentEntityId");
  if (entityId) {
    config.params = { ...config.params, entity_id: entityId };
  }
  return config;
});

export { api, API, BACKEND_URL };
