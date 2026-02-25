import { Expense, SpendingInsight } from '../types';

const API_BASE = 'http://200.116.208.83/control-gastos/api';
const AUTH_KEY = 'gastowise_auth';

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) return JSON.parse(stored).token ?? null;
  } catch { /* sesión corrupta */ }
  return null;
}

export const getFinancialInsights = async (expenses: Expense[]): Promise<SpendingInsight[]> => {
  if (expenses.length === 0) return [];

  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}/ai/insights`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expenses }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.insights || [];
  } catch (error) {
    console.error('Error fetching insights:', error);
    return [{
      title: 'IA no disponible',
      description: 'No pudimos conectar con el analista inteligente en este momento.',
      type: 'info'
    }];
  }
};
