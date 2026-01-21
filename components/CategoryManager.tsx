
import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdateCategories }) => {
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [activeSubFolderId, setActiveSubFolderId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  
  // State for subcategory editing
  const [editingSub, setEditingSub] = useState<{catId: string, index: number} | null>(null);
  const [editingSubValue, setEditingSubValue] = useState('');

  // Drag and drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedSubIndex, setDraggedSubIndex] = useState<{catId: string, index: number} | null>(null);

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: 'cat-' + Math.random().toString(36).substr(2, 9),
      name: newCatName.trim(),
      subCategories: []
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
  };

  const deleteCategory = (id: string) => {
    if (window.confirm('¿Estás seguro? Se borrará la categoría y sus subcategorías.')) {
      onUpdateCategories(categories.filter(c => c.id !== id));
    }
  };

  const startEditingCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveCatName = (id: string) => {
    if (!editingCatName.trim()) return;
    onUpdateCategories(categories.map(c => c.id === id ? { ...c, name: editingCatName.trim() } : c));
    setEditingCatId(null);
  };

  const addSubCategory = (catId: string) => {
    if (!newSubName.trim()) return;
    const updated = categories.map(c => {
      if (c.id === catId) {
        return { ...c, subCategories: [...c.subCategories, newSubName.trim()] };
      }
      return c;
    });
    onUpdateCategories(updated);
    setNewSubName('');
  };

  const removeSubCategory = (catId: string, subName: string) => {
    const updated = categories.map(c => {
      if (c.id === catId) {
        return { ...c, subCategories: c.subCategories.filter(s => s !== subName) };
      }
      return c;
    });
    onUpdateCategories(updated);
  };

  const startEditingSub = (catId: string, index: number, value: string) => {
    setEditingSub({ catId, index });
    setEditingSubValue(value);
  };

  const saveSubName = (catId: string, index: number) => {
    if (!editingSubValue.trim()) return;
    const updated = categories.map(c => {
      if (c.id === catId) {
        const newSubs = [...c.subCategories];
        newSubs[index] = editingSubValue.trim();
        return { ...c, subCategories: newSubs };
      }
      return c;
    });
    onUpdateCategories(updated);
    setEditingSub(null);
  };

  // Drag and Drop Categories
  const onDragStartCat = (index: number) => setDraggedItemIndex(index);
  const onDragOverCat = (e: React.DragEvent) => e.preventDefault();
  const onDropCat = (index: number) => {
    if (draggedItemIndex === null) return;
    const items = [...categories];
    const draggedItem = items[draggedItemIndex];
    items.splice(draggedItemIndex, 1);
    items.splice(index, 0, draggedItem);
    onUpdateCategories(items);
    setDraggedItemIndex(null);
  };

  // Drag and Drop Subcategories
  const onDragStartSub = (catId: string, index: number) => setDraggedSubIndex({ catId, index });
  const onDropSub = (catId: string, targetIndex: number) => {
    if (!draggedSubIndex || draggedSubIndex.catId !== catId) return;
    const updated = categories.map(c => {
      if (c.id === catId) {
        const subs = [...c.subCategories];
        const draggedSub = subs[draggedSubIndex.index];
        subs.splice(draggedSubIndex.index, 1);
        subs.splice(targetIndex, 0, draggedSub);
        return { ...c, subCategories: subs };
      }
      return c;
    });
    onUpdateCategories(updated);
    setDraggedSubIndex(null);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Gestionar Categorías</h3>
      
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Nueva categoría principal..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button 
          onClick={addCategory}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold active:scale-95 shadow-md"
        >
          Añadir
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((cat, idx) => (
          <div 
            key={cat.id} 
            draggable={editingCatId !== cat.id}
            onDragStart={() => onDragStartCat(idx)}
            onDragOver={onDragOverCat}
            onDrop={() => onDropCat(idx)}
            className={`border border-slate-100 rounded-2xl transition-all ${draggedItemIndex === idx ? 'opacity-40' : 'opacity-100'} bg-white`}
          >
            <div className="bg-slate-50/50 px-5 py-4 flex justify-between items-center group">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-slate-300 cursor-grab active:cursor-grabbing">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                {editingCatId === cat.id ? (
                  <input 
                    autoFocus
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    onBlur={() => saveCatName(cat.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveCatName(cat.id)}
                    className="flex-1 bg-white px-2 py-1 rounded border border-indigo-200 outline-none text-slate-900 font-bold"
                  />
                ) : (
                  <span className="font-bold text-slate-700">{cat.name}</span>
                )}
              </div>
              
              <div className="flex gap-1">
                <button 
                  onClick={() => startEditingCat(cat)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Renombrar categoría"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button 
                  onClick={() => setActiveSubFolderId(activeSubFolderId === cat.id ? null : cat.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeSubFolderId === cat.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Subcategorías ({cat.subCategories.length})
                </button>
                <button 
                  onClick={() => deleteCategory(cat.id)}
                  className="p-2 text-slate-300 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </div>
            
            {activeSubFolderId === cat.id && (
              <div className="p-5 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap gap-2">
                  {cat.subCategories.map((sub, sIdx) => (
                    <div 
                      key={sub + sIdx}
                      draggable
                      onDragStart={() => onDragStartSub(cat.id, sIdx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropSub(cat.id, sIdx)}
                      className={`inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs text-slate-600 font-bold transition-all border border-transparent hover:border-indigo-200 cursor-move ${draggedSubIndex?.catId === cat.id && draggedSubIndex?.index === sIdx ? 'opacity-30 scale-95' : ''}`}
                    >
                      {editingSub?.catId === cat.id && editingSub?.index === sIdx ? (
                        <input 
                          autoFocus
                          value={editingSubValue}
                          onChange={(e) => setEditingSubValue(e.target.value)}
                          onBlur={() => saveSubName(cat.id, sIdx)}
                          onKeyDown={(e) => e.key === 'Enter' && saveSubName(cat.id, sIdx)}
                          className="bg-white px-1 rounded outline-none w-20"
                        />
                      ) : (
                        <span onDoubleClick={() => startEditingSub(cat.id, sIdx, sub)}>{sub}</span>
                      )}
                      <div className="flex gap-1 ml-1">
                        <button onClick={() => startEditingSub(cat.id, sIdx, sub)} className="hover:text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => removeSubCategory(cat.id, sub)} className="hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {cat.subCategories.length === 0 && <p className="text-[10px] text-slate-400 italic">No hay subcategorías</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="Añadir subcategoría..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button 
                    onClick={() => addSubCategory(cat.id)}
                    className="bg-slate-800 text-white px-4 py-1.5 text-xs rounded-lg hover:bg-black font-bold transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3">
        <div className="text-indigo-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
        <p className="text-[11px] text-indigo-700 leading-tight">
          <strong>Tip:</strong> Puedes arrastrar las categorías para reordenarlas. Haz doble clic en una subcategoría o usa el icono de lápiz para cambiar su nombre.
        </p>
      </div>
    </div>
  );
};

export default CategoryManager;
