
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
