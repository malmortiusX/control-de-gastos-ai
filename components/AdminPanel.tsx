import React, { useState, useEffect, useCallback } from 'react';
import { dbService } from '../services/dbService';
import { FamilyDetail, UserDetail } from '../types';

// ── Colores fijos por familia (basados en índice) ────────────────────────────
const FAMILY_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
];
const getFamilyColor = (familyId: string, families: FamilyDetail[]) => {
  const idx = families.findIndex(f => f.id === familyId);
  return FAMILY_COLORS[idx % FAMILY_COLORS.length] ?? FAMILY_COLORS[0];
};

// ── Componente Modal reutilizable ────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

// ── Alerta de error/éxito ────────────────────────────────────────────────────
const Alert: React.FC<{ msg: string; type: 'error' | 'success'; onClose: () => void }> = ({ msg, type, onClose }) => (
  <div className={`flex items-center gap-2 text-sm p-3 rounded-xl mb-4 font-medium ${type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
    {type === 'error'
      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    }
    <span className="flex-1">{msg}</span>
    <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
  </div>
);

// ════════════════════════════════════════════════════════════════
//  PANEL DE FAMILIAS
// ════════════════════════════════════════════════════════════════
const FamiliesTab: React.FC<{ families: FamilyDetail[]; onRefresh: () => void }> = ({ families, onRefresh }) => {
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showAlert = (msg: string, type: 'error' | 'success') => {
    setAlert({ msg, type });
    if (type === 'success') setTimeout(() => setAlert(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await dbService.createFamily(newName.trim());
      setNewName('');
      showAlert('Familia creada exitosamente', 'success');
      onRefresh();
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await dbService.deleteFamily(id);
      showAlert('Familia eliminada', 'success');
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      showAlert(err.message, 'error');
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {alert && <Alert msg={alert.msg} type={alert.type} onClose={() => setAlert(null)} />}

      {/* Formulario: nueva familia */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
        <h4 className="text-sm font-bold text-slate-600 mb-3">Nueva familia</h4>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de la familia..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            }
            Crear
          </button>
        </form>
      </div>

      {/* Lista de familias */}
      <div className="space-y-3">
        {families.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-6">No hay familias registradas</p>
        )}
        {families.map((family, idx) => {
          const color = FAMILY_COLORS[idx % FAMILY_COLORS.length];
          return (
            <div key={family.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 group">
              {/* Icono */}
              <div className={`${color.bg} rounded-xl p-2.5 shrink-0`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${color.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{family.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-600">{family.userCount}</span> usuario{family.userCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-200">•</span>
                  <span className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-600">{family.expenseCount}</span> gasto{family.expenseCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Botón eliminar */}
              <button
                onClick={() => setConfirmDeleteId(family.id)}
                className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
                title="Eliminar familia"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación de eliminación */}
      {confirmDeleteId && (() => {
        const fam = families.find(f => f.id === confirmDeleteId);
        return (
          <Modal title="Eliminar familia" onClose={() => setConfirmDeleteId(null)}>
            <p className="text-slate-600 text-sm mb-1">
              ¿Seguro que deseas eliminar la familia <strong className="text-slate-800">{fam?.name}</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Solo es posible si no tiene usuarios asignados. Sus categorías y gastos también serán eliminados.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeleteId
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Eliminar'}
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  PANEL DE USUARIOS
// ════════════════════════════════════════════════════════════════
const UsersTab: React.FC<{ users: UserDetail[]; families: FamilyDetail[]; currentUserId: string; onRefresh: () => void }> = ({
  users, families, currentUserId, onRefresh
}) => {
  const [form, setForm] = useState({ username: '', password: '', familyId: '' });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [changePassUser, setChangePassUser] = useState<UserDetail | null>(null);
  const [newPass, setNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showAlert = (msg: string, type: 'error' | 'success') => {
    setAlert({ msg, type });
    if (type === 'success') setTimeout(() => setAlert(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.familyId) return;
    setLoading(true);
    try {
      await dbService.createUser(form.username.trim(), form.password, form.familyId);
      setForm({ username: '', password: '', familyId: '' });
      showAlert('Usuario creado exitosamente', 'success');
      onRefresh();
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await dbService.deleteUser(id);
      showAlert('Usuario eliminado', 'success');
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      showAlert(err.message, 'error');
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePassUser || newPass.length < 4) return;
    setChangingPass(true);
    try {
      await dbService.changePassword(changePassUser.id, newPass);
      showAlert('Contraseña actualizada', 'success');
      setChangePassUser(null);
      setNewPass('');
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div>
      {alert && <Alert msg={alert.msg} type={alert.type} onClose={() => setAlert(null)} />}

      {/* Formulario: nuevo usuario */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
        <h4 className="text-sm font-bold text-slate-600 mb-3">Nuevo usuario</h4>
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Usuario"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Contraseña"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={form.familyId}
              onChange={e => setForm(f => ({ ...f, familyId: e.target.value }))}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              disabled={loading}
            >
              <option value="">Selecciona una familia...</option>
              {families.map(fam => (
                <option key={fam.id} value={fam.id}>{fam.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={loading || !form.username.trim() || !form.password || !form.familyId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              }
              Crear
            </button>
          </div>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {users.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-6">No hay usuarios registrados</p>
        )}
        {users.map(user => {
          const color = getFamilyColor(user.family_id, families);
          const isMe = user.id === currentUserId;
          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 group">
              {/* Avatar */}
              <div className="bg-slate-100 rounded-full w-9 h-9 flex items-center justify-center shrink-0 font-bold text-slate-500 text-sm uppercase">
                {user.username.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 text-sm">{user.username}</p>
                  {isMe && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Tú</span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color.text} ${color.bg} px-2 py-0.5 rounded-full mt-0.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>
                  {user.familyName}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Cambiar contraseña */}
                <button
                  onClick={() => { setChangePassUser(user); setNewPass(''); }}
                  className="text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                  title="Cambiar contraseña"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </button>
                {/* Eliminar */}
                {!isMe && (
                  <button
                    onClick={() => setConfirmDeleteId(user.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    title="Eliminar usuario"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Cambiar contraseña */}
      {changePassUser && (
        <Modal title={`Cambiar contraseña — ${changePassUser.username}`} onClose={() => setChangePassUser(null)}>
          <form onSubmit={handleChangePass} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                disabled={changingPass}
              />
              {newPass.length > 0 && newPass.length < 4 && (
                <p className="text-xs text-red-500 mt-1">Mínimo 4 caracteres</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChangePassUser(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={changingPass || newPass.length < 4}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {changingPass
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Confirmar eliminación de usuario */}
      {confirmDeleteId && (() => {
        const u = users.find(x => x.id === confirmDeleteId);
        return (
          <Modal title="Eliminar usuario" onClose={() => setConfirmDeleteId(null)}>
            <p className="text-slate-600 text-sm mb-5">
              ¿Seguro que deseas eliminar al usuario <strong className="text-slate-800">{u?.username}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeleteId
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Eliminar'}
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL: AdminPanel
// ════════════════════════════════════════════════════════════════
interface AdminPanelProps {
  currentUserId: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'families' | 'users'>('families');
  const [families, setFamilies] = useState<FamilyDetail[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fams, usrs] = await Promise.all([
        dbService.getFamilies(),
        dbService.getUsers(),
      ]);
      setFamilies(fams);
      setUsers(usrs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = [
    {
      id: 'families' as const,
      label: 'Familias',
      count: families.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'users' as const,
      label: 'Usuarios',
      count: users.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header del panel */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Administración</h2>
              <p className="text-xs text-slate-400">Gestión de familias y usuarios</p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
            title="Recargar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 text-sm font-medium mb-3">{error}</p>
            <button onClick={loadData} className="text-indigo-600 text-sm font-bold hover:underline">
              Reintentar
            </button>
          </div>
        ) : activeTab === 'families' ? (
          <FamiliesTab families={families} onRefresh={loadData} />
        ) : (
          <UsersTab
            users={users}
            families={families}
            currentUserId={currentUserId}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
