
export interface Category {
  id: string;
  name: string;
  subCategories: string[];
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string; // Referencia al ID de la categoría
  categoryName: string; // Guardamos el nombre por si se borra la categoría
  subCategory: string;
  description: string;
  date: string;
}

export interface SpendingInsight {
  title: string;
  description: string;
  type: 'saving' | 'warning' | 'info';
}

export interface Family {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  familyId: string;
  familyName: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface FamilyDetail {
  id: string;
  name: string;
  created_at: string;
  userCount: number;
  expenseCount: number;
}

export interface UserDetail {
  id: string;
  username: string;
  family_id: string;
  familyName: string;
  created_at: string;
}
