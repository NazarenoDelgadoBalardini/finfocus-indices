// src/components/PlanillasFiscalesTabs.jsx
import React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import PlanillaFiscalTasas from '@/components/PlanillaFiscalTasas';
import PlanillaFiscalActuaciones from '@/components/PlanillaFiscalActuaciones';

const AZUL = '#0f2f4b';

export default function PlanillasFiscalesTabs() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header FINFOCUS (podés editar el texto) */}
      <div className="mb-4">
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: AZUL }}>
        </h1>
        <p className="text-xs md:text-sm text-slate-500">
        </p>
      </div>

      <Tabs defaultValue="tasas" className="w-full">
        {/* TABS LIST */}
        <TabsList className="grid grid-cols-2 mb-4 bg-slate-100 rounded-xl p-1">
          <TabsTrigger
            value="tasas"
            className="
              text-xs md:text-sm font-semibold rounded-lg
              data-[state=active]:bg-[#0f2f4b]
              data-[state=active]:text-white
              data-[state=inactive]:text-slate-700
              data-[state=inactive]:bg-transparent
              transition-colors
              px-3 py-2
            "
          >
            Planillas Fiscales
          </TabsTrigger>

          <TabsTrigger
            value="actuaciones"
            className="
              text-xs md:text-sm font-semibold rounded-lg
              data-[state=active]:bg-[#0f2f4b]
              data-[state=active]:text-white
              data-[state=inactive]:text-slate-700
              data-[state=inactive]:bg-transparent
              transition-colors
              px-3 py-2
            "
          >
            Contar actuaciones
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO: TAB 1 */}
        <TabsContent value="tasas" className="mt-0">
          <div className="card p-4 md:p-6">
            <PlanillaFiscalTasas />
          </div>
        </TabsContent>

        {/* CONTENIDO: TAB 2 */}
        <TabsContent value="actuaciones" className="mt-0">
          <div className="card p-4 md:p-6">
            <PlanillaFiscalActuaciones />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
