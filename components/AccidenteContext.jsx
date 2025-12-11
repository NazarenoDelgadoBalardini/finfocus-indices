// src/components/AccidenteContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AccidenteContext = createContext(null);

const STORAGE_KEY = 'accidente_calculadora_data';

// Estado inicial
const initialState = {
  // Paso 1: IBM
  fechaAccidente: '',
  rows: [],
  nextId: 0,
  previo27348: false,
  modoHabiles: false,
  resultadoIBM: null,

  // Paso 2: Actualizar IBM
  fechaInicio: '',
  fechaFin: '',
  montoIBM: '',
  resultSimple: null,
  resultPond: null,
  resultActiva: null,

  // Paso 3: Indemnización
  fechaNacimiento: '',
  fechaDeclaracion: '',
  porcentajeIncapacidad: '',
  esMuerte: false,
  esInItinere: false,
  fechaIBM: '',
};

export function AccidenteProvider({ children }) {
  const [state, setState] = useState(() => {
    // Intentar cargar desde localStorage al iniciar
    try {
      const saved = typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

      if (saved) {
        const parsed = JSON.parse(saved);
        // Mezclamos el initialState con lo guardado
        return { ...initialState, ...parsed };
      }
    } catch (error) {
      console.error('Error cargando datos guardados:', error);
    }
    return initialState;
  });

  // Guardar en localStorage cada vez que cambia el estado
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      console.error('Error guardando datos:', error);
    }
  }, [state]);

  // Función para actualizar el estado (merge plano)
  const updateState = (updates) => {
    setState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Función para limpiar todo
  const clearAll = () => {
    setState(initialState);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error limpiando datos:', error);
    }
  };

  const value = {
    state,
    updateState,
    clearAll,
  };

  return (
    <AccidenteContext.Provider value={value}>
      {children}
    </AccidenteContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useAccidenteContext() {
  const context = useContext(AccidenteContext);
  if (!context) {
    throw new Error('useAccidenteContext debe usarse dentro de AccidenteProvider');
  }
  return context;
}
