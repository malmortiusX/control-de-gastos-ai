
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from 'recharts';
import { Expense, Category } from '../types';
import { GET_RANDOM_COLOR } from '../constants';

interface DashboardProps {
  expenses: Expense[];
  categories: Category[];
}

const Dashboard: React.FC<DashboardProps> = ({ expenses, categories }) => {
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const categorySummary = expenses.reduce((acc, exp) => {
    acc[exp.categoryName] = (acc[exp.categoryName] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categorySummary).map(([name, value]) => ({
    name, value
  })).sort((a, b) => b.value - a.value);

  const last7DaysData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const amount = expenses
      .filter(exp => exp.date === dateStr)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    return { 
      date: dateStr.split('-').reverse().slice(0, 2).join('/'), 
      amount 
    };
  }).reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-indigo-100 text-sm font-medium">Inversión Total</p>
          <h2 className="text-3xl font-bold mt-1">{totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'COP' })}</h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">Este Mes</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">
             {expenses
               .filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)))
               .reduce((s, e) => s + Number(e.amount), 0)
               .toLocaleString('es-ES', { style: 'currency', currency: 'COP' })}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <p className="text-slate-500 text-sm font-medium">Categoría Principal</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1 truncate">
            {pieData[0]?.name || '---'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contenedor con altura fija y min-w-0 para Recharts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Distribución de Gastos</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie 
                  data={pieData.length > 0 ? pieData : [{name: 'Sin datos', value: 1}]} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={60} 
                  outerRadius={85} 
                  paddingAngle={8} 
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GET_RANDOM_COLOR(entry.name)} stroke="none" />
                  ))}
                  {pieData.length === 0 && <Cell fill="#f1f5f9" stroke="none" />}
                </Pie>
                <Tooltip 
                  formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}$` : v}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-w-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Actividad Reciente (7d)</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={last7DaysData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11}} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#6366f1" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
