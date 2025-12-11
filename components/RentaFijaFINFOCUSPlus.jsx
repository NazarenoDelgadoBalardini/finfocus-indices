// src/componentes/PrivadosTabs.jsx
import React, { useState } from 'react';
import CurvaRendimientosPrivados from '@/components/CurvaRendimientosPrivados';
import FlujoDeFondosEnUsd from '@/components/FlujoDeFondosEnUsd';

export default function PrivadosTabs() {
  const [tab, setTab] = useState('curva');

  const baseTabClasses =
    'inline-flex items-center justify-center px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500';

  const activeTabClasses =
    'bg-[#0f2f4b] text-white border-[#0f2f4b] shadow-sm';
  const inactiveTabClasses =
    'bg-white text-[#0f2f4b] border-slate-200 hover:bg-slate-50';

  return (
    <>
      {/* TABS GLOBALES (centrados, sin contenedor extra) */}
      <div
        className="flex justify-center gap-2 sm:gap-3 mb-3 sm:mb-4"
        role="tablist"
        aria-label="Herramientas de renta fija privada"
      >
        <button
          type="button"
          onClick={() => setTab('curva')}
          className={`${baseTabClasses} ${
            tab === 'curva' ? activeTabClasses : inactiveTabClasses
          }`}
          role="tab"
          aria-selected={tab === 'curva'}
        >
          Curva de rendimientos privados
        </button>

        <button
          type="button"
          onClick={() => setTab('flujo')}
          className={`${baseTabClasses} ${
            tab === 'flujo' ? activeTabClasses : inactiveTabClasses
          }`}
          role="tab"
          aria-selected={tab === 'flujo'}
        >
          Proyectar flujo de fondos en USD
        </button>
      </div>

      {/* CONTENIDO (SIN CARD / SIN WRAPPER ADICIONAL) */}
      {tab === 'curva' && <CurvaRendimientosPrivados />}
      {tab === 'flujo' && <FlujoDeFondosEnUsd />}
    </>
  );
}