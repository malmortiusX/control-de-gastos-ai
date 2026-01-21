
import React, { useState, useEffect } from 'react';
import { Expense, SpendingInsight } from '../types';
import { getFinancialInsights } from '../services/geminiService';

interface AIInsightsProps {
  expenses: Expense[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ expenses }) => {
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (expenses.length < 3) return;
    setLoading(true);
    const data = await getFinancialInsights(expenses);
    setInsights(data);
    setLoading(false);
  };

  useEffect(() => {
    if (expenses.length >= 3 && expenses.length % 3 === 0) { // Fetch periodically
      fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length]);

  if (expenses.length < 3) {
    return (
      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
        <p className="text-indigo-800 text-sm italic">
          Añade al menos 3 gastos para que nuestro analista IA pueda darte consejos personalizados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          Análisis de IA
        </h3>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Analizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border ${
              insight.type === 'warning' ? 'bg-red-50 border-red-100' :
              insight.type === 'saving' ? 'bg-emerald-50 border-emerald-100' :
              'bg-blue-50 border-blue-100'
            }`}
          >
            <h4 className={`font-bold text-sm ${
              insight.type === 'warning' ? 'text-red-800' :
              insight.type === 'saving' ? 'text-emerald-800' :
              'text-blue-800'
            }`}>
              {insight.title}
            </h4>
            <p className="text-sm mt-1 text-slate-700">{insight.description}</p>
          </div>
        ))}
        {insights.length === 0 && !loading && (
          <button 
            onClick={fetchInsights}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
          >
            Generar primer análisis
          </button>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
