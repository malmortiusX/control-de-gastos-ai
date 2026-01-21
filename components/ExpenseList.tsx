
import React from 'react';
import { Expense } from '../types';
import { GET_RANDOM_COLOR } from '../constants';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete }) => {
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-400">No hay gastos registrados.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Historial de Gastos</h3>
        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{expenses.length} registros</span>
      </div>
      <div className="divide-y divide-slate-50">
        {sortedExpenses.map((expense) => (
          <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ backgroundColor: GET_RANDOM_COLOR(expense.categoryName) }}
              >
                {expense.categoryName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{expense.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{expense.categoryName}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-semibold text-indigo-500">{expense.subCategory || 'General'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-medium text-slate-400">{expense.date}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900">
                -{expense.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
              <button 
                onClick={() => onDelete(expense.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 group-hover:opacity-100"
                aria-label="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;
