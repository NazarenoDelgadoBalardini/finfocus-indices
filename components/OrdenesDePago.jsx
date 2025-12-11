// src/components/OrdenesDePagoTabs.jsx
import React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import OrdenesDePagoSimple from '@/components/OrdenesDePagoSimple';
import OrdenesDePagoCompleja from '@/components/OrdenesDePagoCompleja';

const AZUL = '#0f2f4b';

export default function OrdenesDePagoTabs() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold" style={{ color: AZUL }}>
        </h1>
        <p className="text-sm text-slate-500">
        </p>
      </div>

      <Tabs defaultValue="simple" className="w-full">

        {/* ---------- BOTONERA ---------- */}
        <TabsList
          className="
            flex justify-center w-full gap-2 bg-slate-100/80 
            rounded-full p-1
          "
        >

          <TabsTrigger
            value="simple"
            className="
              px-4 py-2 text-sm font-semibold rounded-full
              text-[#0f2f4b]
              transition
              data-[state=active]:bg-[#0f2f4b]
              data-[state=active]:text-white
            "
          >
            Simple
          </TabsTrigger>

          <TabsTrigger
            value="compleja"
            className="
              px-4 py-2 text-sm font-semibold rounded-full
              text-[#0f2f4b]
              transition
              data-[state=active]:bg-[#0f2f4b]
              data-[state=active]:text-white
            "
          >
            Compleja
          </TabsTrigger>

        </TabsList>

        {/* ---------- CONTENIDOS ---------- */}
        <TabsContent value="simple" className="mt-6">
          <OrdenesDePagoSimple />
        </TabsContent>

        <TabsContent value="compleja" className="mt-6">
          <OrdenesDePagoCompleja />
        </TabsContent>

      </Tabs>
    </div>
  );
}
