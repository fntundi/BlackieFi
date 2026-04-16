/**
 * Secure token storage abstraction.
 *
 * Uses sessionStorage (tab-scoped, clears on close) instead of localStorage
 * to reduce XSS exposure surface.  A single import change migrates the
 * entire application; swap the implementation here if you later move to
 * httpOnly cookies.
 */

const KEYS = {
  TOKEN: "token",
  USER: "user",
  ENTITY: "currentEntityId",
};

const store = sessionStorage;

export const tokenStorage = {
  getToken: () => store.getItem(KEYS.TOKEN),
  setToken: (t) => store.setItem(KEYS.TOKEN, t),

  getUser: () => {
    try {
      const raw = store.getItem(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (u) => store.setItem(KEYS.USER, JSON.stringify(u)),

  getEntityId: () => store.getItem(KEYS.ENTITY),
  setEntityId: (id) => store.setItem(KEYS.ENTITY, id),

  clear: () => {
    store.removeItem(KEYS.TOKEN);
    store.removeItem(KEYS.USER);
    store.removeItem(KEYS.ENTITY);
  },

  removeToken: () => store.removeItem(KEYS.TOKEN),
  removeUser: () => store.removeItem(KEYS.USER),
};
