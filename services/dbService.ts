import { Expense, Category, User, AuthSession, FamilyDetail, UserDetail } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const API_BASE = 'http://200.116.208.83/control-gastos/api';
const AUTH_KEY = 'gastowise_auth';

// ─────────────────────────────────────────────
//  ESTADO DE SESIÓN (módulo-level, persiste en memoria)
// ─────────────────────────────────────────────

let authToken: string | null = null;
let currentUser: User | null = null;

// Restaurar sesión desde localStorage al cargar el módulo
try {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    const session: AuthSession = JSON.parse(stored);
    authToken = session.token;
    currentUser = session.user;
  }
} catch {
  // sesión corrupta, ignorar
}

// ─────────────────────────────────────────────
//  HELPERS INTERNOS
// ─────────────────────────────────────────────

function getLocalExpensesKey(): string {
  return `gastowise_expenses_${currentUser?.familyId ?? 'default'}`;
}

function getLocalCategoriesKey(): string {
  return `gastowise_categories_${currentUser?.familyId ?? 'default'}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

/** Fetch con auth. Lanza error 'SESSION_EXPIRED' si recibe 401. */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
  });
  if (res.status === 401) {
    dbService.logout();
    const err = new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
    (err as any).code = 'SESSION_EXPIRED';
    throw err;
  }
  return res;
}

// ─────────────────────────────────────────────
//  SERVICIO PRINCIPAL
// ─────────────────────────────────────────────

export const dbService = {

  // ── Autenticación ────────────────────────────

  getCurrentUser(): User | null {
    return currentUser;
  },

  async login(username: string, password: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    const data: { token: string; user: User } = await res.json();
    authToken = data.token;
    currentUser = data.user;
    const session: AuthSession = { token: data.token, user: data.user };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return data.user;
  },

  logout(): void {
    authToken = null;
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
  },

  // ── Disponibilidad de API ─────────────────────

  async isApiAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // ── Categorías ───────────────────────────────

  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`);
      if (res.ok) {
        const cats: Category[] = await res.json();
        // Sincronizar con localStorage
        localStorage.setItem(getLocalCategoriesKey(), JSON.stringify(cats));
        return cats;
      }
    } catch (e: any) {
      if (e.code === 'SESSION_EXPIRED') throw e;
    }

    // Fallback a LocalStorage
    const local = localStorage.getItem(getLocalCategoriesKey());
    if (!local) {
      localStorage.setItem(getLocalCategoriesKey(), JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(local);
  },

  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE}/categories`, {
        method: 'PUT',
        body: JSON.stringify(categories),
      });
    } catch (e: any) {
      if (e.code === 'SESSION_EXPIRED') throw e;
    }
    localStorage.setItem(getLocalCategoriesKey(), JSON.stringify(categories));
  },

  // ── Gastos ───────────────────────────────────

  async getExpenses(): Promise<Expense[]> {
    try {
      const res = await fetchWithAuth(`${API_BASE}/expenses`);
      if (res.ok) {
        const exps: Expense[] = await res.json();
        localStorage.setItem(getLocalExpensesKey(), JSON.stringify(exps));
        return exps;
      }
    } catch (e: any) {
      if (e.code === 'SESSION_EXPIRED') throw e;
    }

    const data = localStorage.getItem(getLocalExpensesKey());
    return data ? JSON.parse(data) : [];
  },

  async addExpense(expense: Expense): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expense),
      });
    } catch (e: any) {
      if (e.code === 'SESSION_EXPIRED') throw e;
    }

    // Sincronizar local
    const local = localStorage.getItem(getLocalExpensesKey());
    const expenses: Expense[] = local ? JSON.parse(local) : [];
    localStorage.setItem(getLocalExpensesKey(), JSON.stringify([expense, ...expenses]));
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await fetchWithAuth(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      if (e.code === 'SESSION_EXPIRED') throw e;
    }

    const local = localStorage.getItem(getLocalExpensesKey());
    const expenses: Expense[] = local ? JSON.parse(local) : [];
    localStorage.setItem(getLocalExpensesKey(), JSON.stringify(expenses.filter(e => e.id !== id)));
  },

  // ── Administración: Familias ──────────────────

  async getFamilies(): Promise<FamilyDetail[]> {
    const res = await fetchWithAuth(`${API_BASE}/admin/families`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async createFamily(name: string): Promise<{ id: string; name: string }> {
    const res = await fetchWithAuth(`${API_BASE}/admin/families`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async deleteFamily(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/admin/families/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
  },

  // ── Administración: Usuarios ──────────────────

  async getUsers(): Promise<UserDetail[]> {
    const res = await fetchWithAuth(`${API_BASE}/admin/users`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async createUser(username: string, password: string, familyId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/admin/users`, {
      method: 'POST',
      body: JSON.stringify({ username, password, familyId }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  },

  async changePassword(userId: string, password: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  },

  async deleteUser(userId: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
  },
};
