
import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../types';

interface ExpenseFormProps {
  categories: Category[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ categories, onAddExpense }) => {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Reset subcategory when category changes
  useEffect(() => {
    const cat = categories.find(c => c.id === categoryId);
    if (cat && cat.subCategories.length > 0) {
      setSubCategory(cat.subCategories[0]);
    } else {
      setSubCategory('');
    }
  }, [categoryId, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !categoryId) return;

    const selectedCat = categories.find(c => c.id === categoryId);

    onAddExpense({
      amount: parseFloat(amount),
      categoryId: categoryId,
      categoryName: selectedCat?.name || 'Desconocida',
      subCategory,
      description,
      date
    });

    setAmount('');
    setDescription('');
  };

  const selectedCategoryObj = categories.find(c => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Nuevo Gasto</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Monto (€)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Categoría Principal</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
            required
          >
            <option value="">Seleccionar...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Subcategoría</label>
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            disabled={!categoryId || (selectedCategoryObj?.subCategories.length === 0)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {selectedCategoryObj?.subCategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
            {!selectedCategoryObj?.subCategories.length && <option value="">Sin subcategorías</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
            placeholder="Ej: Cena con amigos"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95"
      >
        Añadir Gasto
      </button>
    </form>
  );
};

export default ExpenseForm;
