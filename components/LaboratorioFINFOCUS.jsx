// src/components/LaboratorioFinfocus.jsx
import React from 'react';

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import ParaLaTiaMarta from '@/components/ParaLaTiaMarta';
import RiesgoCorporativo from '@/components/RiesgoCorporativo';
import RiesgoSoberano from '@/components/RiesgoSoberano';
import FairValueRentaFija from '@/components/FairValueRentaFija';
import FairValueEquity from '@/components/FairValueEquity';

export default function LaboratorioFinfocus() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4">
      <Tabs defaultValue="tiaMarta" className="w-full">

        {/* ---------- TABS (centrados) ---------- */}
<TabsList
  className="
    flex flex-nowrap justify-center gap-2
    bg-slate-50 rounded-xl p-2
  "
>
  <TabsTrigger
    value="tiaMarta"
    className="
      flex-1 min-w-0 text-ellipsis overflow-hidden
      text-[0.75rem] md:text-sm px-2 py-2 rounded-md
      data-[state=active]:bg-[#0f2f4b]
      data-[state=active]:text-white
    "
  >
    Ratios: para la tía Marta
  </TabsTrigger>

  <TabsTrigger
    value="riesgoCorp"
    className="
      flex-1 min-w-0 text-ellipsis overflow-hidden
      text-[0.75rem] md:text-sm px-2 py-2 rounded-md
      data-[state=active]:bg-[#0f2f4b]
      data-[state=active]:text-white
    "
  >
    Riesgo corporativo
  </TabsTrigger>

  <TabsTrigger
    value="riesgoSov"
    className="
      flex-1 min-w-0 text-ellipsis overflow-hidden
      text-[0.75rem] md:text-sm px-2 py-2 rounded-md
      data-[state=active]:bg-[#0f2f4b]
      data-[state=active]:text-white
    "
  >
    Riesgo soberano
  </TabsTrigger>

  <TabsTrigger
    value="fairFija"
    className="
      flex-1 min-w-0 text-ellipsis overflow-hidden
      text-[0.75rem] md:text-sm px-2 py-2 rounded-md
      data-[state=active]:bg-[#0f2f4b]
      data-[state=active]:text-white
    "
  >
    Fair value en renta fija
  </TabsTrigger>

  <TabsTrigger
    value="fairEquity"
    className="
      flex-1 min-w-0 text-ellipsis overflow-hidden
      text-[0.75rem] md:text-sm px-2 py-2 rounded-md
      data-[state=active]:bg-[#0f2f4b]
      data-[state=active]:text-white
    "
  >
    Fair value en renta variable
  </TabsTrigger>
</TabsList>

        {/* ---------- CONTENIDO (sin contenedor blanco extra) ---------- */}
        <div className="mt-4">
          <TabsContent value="tiaMarta">
            <ParaLaTiaMarta />
          </TabsContent>

          <TabsContent value="riesgoCorp">
            <RiesgoCorporativo />
          </TabsContent>

          <TabsContent value="riesgoSov">
            <RiesgoSoberano />
          </TabsContent>

          <TabsContent value="fairFija">
            <FairValueRentaFija />
          </TabsContent>

          <TabsContent value="fairEquity">
            <FairValueEquity />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
