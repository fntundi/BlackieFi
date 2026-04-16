import axios from "axios";
import { tokenStorage } from "./tokenStorage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const entityId = tokenStorage.getEntityId();
  if (entityId) {
    config.params = { ...config.params, entity_id: entityId };
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export { api, API, BACKEND_URL };
