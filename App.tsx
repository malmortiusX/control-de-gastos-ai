
import React, { useState, useEffect, useCallback } from 'react';
import { Expense, Category, User } from './types';
import { dbService } from './services/dbService';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import AIInsights from './components/AIInsights';
import CategoryManager from './components/CategoryManager';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import { generateUUID } from './utils/uuid';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(dbService.getCurrentUser());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'admin'>('dashboard');
  const [isOnline, setIsOnline] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [online, loadedExpenses, loadedCategories] = await Promise.all([
        dbService.isApiAvailable(),
        dbService.getExpenses(),
        dbService.getCategories()
      ]);
      setIsOnline(online);
      setExpenses(loadedExpenses);
      setCategories(loadedCategories);
    } catch (error: any) {
      if (error?.code === 'SESSION_EXPIRED') {
        setUser(null);
      } else {
        console.error("Error sincronizando:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos cuando el usuario está autenticado
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    dbService.logout();
    setUser(null);
    setExpenses([]);
    setCategories([]);
    setIsOnline(false);
    setActiveView('dashboard');
  };

  const addExpense = async (newExp: Omit<Expense, 'id'>) => {
    const expense: Expense = { ...newExp, id: generateUUID() };
    try {
      await dbService.addExpense(expense);
      setExpenses(prev => [expense, ...prev]);
    } catch (error: any) {
      if (error?.code === 'SESSION_EXPIRED') handleLogout();
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await dbService.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (error: any) {
      if (error?.code === 'SESSION_EXPIRED') handleLogout();
    }
  };

  const updateCategories = async (newCategories: Category[]) => {
    try {
      await dbService.saveCategories(newCategories);
      setCategories(newCategories);
    } catch (error: any) {
      if (error?.code === 'SESSION_EXPIRED') handleLogout();
    }
  };

  // ── Sin sesión: mostrar login ─────────────────
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ── Cargando datos ────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Cargando datos de {user.familyName}...</p>
        </div>
      </div>
    );
  }

  // ── Dashboard principal ───────────────────────
  return (
    <div className="min-h-screen pb-12 bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

          {/* Logo + info */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 leading-none">
                GastoWise <span className="text-indigo-600">PRO</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isOnline ? 'Base de datos Online' : 'Modo Offline (Local)'}
                </p>
              </div>
            </div>
          </div>

          {/* Sesión del usuario + navegación */}
          <div className="flex items-center gap-2">
            {/* Info de familia */}
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
              <div className="bg-indigo-600 rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="leading-none">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Familia</p>
                <p className="text-xs font-bold text-indigo-700">{user.familyName}</p>
              </div>
              <span className="text-indigo-300 text-xs">•</span>
              <p className="text-xs font-semibold text-indigo-500">{user.username}</p>
            </div>

            {/* Botón Ajustes */}
            <button
              onClick={() => setActiveView(activeView === 'settings' ? 'dashboard' : 'settings')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${activeView === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              ⚙️ Ajustes
            </button>

            {/* Botón Administración */}
            <button
              onClick={() => setActiveView(activeView === 'admin' ? 'dashboard' : 'admin')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 ${activeView === 'admin' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              👥 Admin
            </button>

            {/* Botón Cerrar sesión */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {activeView === 'settings' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CategoryManager categories={categories} onUpdateCategories={updateCategories} />
          </div>
        ) : activeView === 'admin' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AdminPanel currentUserId={user.id} />
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
        <p>© 2024 GastoWise PRO • {user.familyName} • {isOnline ? 'API Conectada' : 'Persistencia Local'}
          {activeView !== 'dashboard' && (
            <> • <button onClick={() => setActiveView('dashboard')} className="underline hover:text-slate-600">← Volver al Dashboard</button></>
          )}
        </p>
      </footer>
    </div>
  );
};

export default App;
