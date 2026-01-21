
import React from 'react';

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Alimentación',
    subCategories: ['Mercado', 'Comida Calle']
  },
  {
    id: 'cat-2',
    name: 'Transporte',
    subCategories: ['Bus', 'Indrive', 'Gasolina', 'Mantenimiento']
  },
  {
    id: 'cat-3',
    name: 'Vivienda',
    subCategories: ['Arriendo']
  },
  {
    id: 'cat-4',
    name: 'Servicios',
    subCategories: ['Luz', 'Agua', 'Gas', 'Internet Casa', 'Celular']
  },
  {
    id: 'cat-5',
    name: 'Ocio',
    subCategories: ['Cine', 'Streaming', 'Salidas']
  },
  {
    id: 'cat-6',
    name: 'Salud',
    subCategories: ['Farmacia', 'Consulta', 'Gimnasio']
  }
];

export const GET_RANDOM_COLOR = (seed: string) => {
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
