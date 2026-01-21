
import React, { useState, useEffect } from 'react';
import { Expense, Category } from './types';
import { dbService } from './services/dbService';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import AIInsights from './components/AIInsights';
import CategoryManager from './components/CategoryManager';

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [online, loadedExpenses, loadedCategories] = await Promise.all([
          dbService.isApiAvailable(),
          dbService.getExpenses(),
          dbService.getCategories()
        ]);
        setIsOnline(online);
        setExpenses(loadedExpenses);
        setCategories(loadedCategories);
      } catch (error) {
        console.error("Error sincronizando:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const addExpense = async (newExp: Omit<Expense, 'id'>) => {
    const expense: Expense = { ...newExp, id: crypto.randomUUID() };
    await dbService.addExpense(expense);
    setExpenses(prev => [expense, ...prev]);
  };

  const deleteExpense = async (id: string) => {
    await dbService.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateCategories = async (newCategories: Category[]) => {
    await dbService.saveCategories(newCategories);
    setCategories(newCategories);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 leading-none">GastoWise <span className="text-indigo-600">PRO</span></h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isOnline ? 'Base de datos Online' : 'Modo Offline (Local)'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${
              showConfig ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {showConfig ? '← Dashboard' : '⚙️ Ajustes'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {showConfig ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CategoryManager categories={categories} onUpdateCategories={updateCategories} />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4 space-y-6">
              <ExpenseForm categories={categories} onAddExpense={addExpense} />
              <AIInsights expenses={expenses} />
            </div>
            <div className="xl:col-span-8 space-y-8">
              <Dashboard expenses={expenses} categories={categories} />
              <ExpenseList expenses={expenses} onDelete={deleteExpense} />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pb-8">
        <p>© 2024 GastoWise PRO • {isOnline ? 'API Conectada' : 'Persistencia Local'}</p>
      </footer>
    </div>
  );
};

export default App;
