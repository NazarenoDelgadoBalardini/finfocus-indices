// src/components/BonosPesosTabs.jsx
import React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import BandasCambiarias from '@/components/BandasCambiarias';
import RendimientosEnPesos from '@/components/RendimientosEnPesos';
import Breackeven from '@/components/Breackeven';
import CurvaCER from '@/components/CurvaCER';
import CerPorRango from '@/components/CerPorRango';  // ⬅️ Nuevo
import Vacaciones from '@/components/Vacaciones';

const AZUL = '#0f2f4b';

export default function BonosPesosTabs() {
  return (
    <div className="w-full max-w-6xl mx-auto">

      <Tabs defaultValue="bandascambiarias" className="w-full">

        {/* ---------- TABS ---------- */}
        <TabsList className="grid w-full grid-cols-6 bg-slate-50">
          <TabsTrigger
            value="bandascambiarias"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            Bandas cambiarias
          </TabsTrigger>

          <TabsTrigger
            value="rendimientos"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            Rendimientos en pesos
          </TabsTrigger>

          <TabsTrigger
            value="breackeven"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            Breakeven
          </TabsTrigger>

          <TabsTrigger
            value="curvacer"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            Curva CER
          </TabsTrigger>

          {/* NUEVO TAB */}
          <TabsTrigger
            value="cer_rango"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            CER por rango
          </TabsTrigger>

          <TabsTrigger
            value="vacaciones"
            className="text-[0.75rem] md:text-sm
                     data-[state=active]:bg-[#0f2f4b]
                     data-[state=active]:text-white rounded-md"
          >
            Fondito vacaciones
          </TabsTrigger>
        </TabsList>

        {/* --------- CONTENIDO --------- */}
        <TabsContent value="bandascambiarias"><BandasCambiarias /></TabsContent>
        <TabsContent value="rendimientos"><RendimientosEnPesos /></TabsContent>
        <TabsContent value="breackeven"><Breackeven /></TabsContent>
        <TabsContent value="curvacer"><CurvaCER /></TabsContent>

        {/* NUEVA HERRAMIENTA */}
        <TabsContent value="cer_rango">
          <CerPorRango />
        </TabsContent>

        <TabsContent value="vacaciones"><Vacaciones /></TabsContent>
      </Tabs>
    </div>
  );
}

