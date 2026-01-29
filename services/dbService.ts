import { Expense, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const API_BASE = '/api';
const LOCAL_EXPENSES_KEY = 'gastowise_expenses_fallback';
const LOCAL_CATEGORIES_KEY = 'gastowise_categories_fallback';

export const dbService = {
  // Detector de modo (API vs Local)
  async isApiAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/categories`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- Categorías ---
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (res.ok) return await res.json();
    } catch (e) {}
    
    // Fallback a LocalStorage
    const local = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (!local) {
      localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(local);
  },

  async saveCategories(categories: Category[]): Promise<void> {
    try {
      await fetch(`${API_BASE}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categories)
      });
    } catch (e) {}
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
  },

  // --- Gastos ---
  async getExpenses(): Promise<Expense[]> {
    try {
      const res = await fetch(`${API_BASE}/expenses`);
      if (res.ok) return await res.json();
    } catch (e) {}
    
    const data = localStorage.getItem(LOCAL_EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addExpense(expense: Expense): Promise<void> {
    try {
      await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
    } catch (e) {}
    
    // Sincronizar local
    const expenses = await this.getExpenses();
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify([expense, ...expenses]));
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
    } catch (e) {}
    
    const expenses = await this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(filtered));
  }
};
