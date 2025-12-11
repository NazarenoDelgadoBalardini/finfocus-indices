// src/components/AccidenteTabs.jsx
import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  TrendingUp,
  BookOpenCheck,
  Clock3,
  Search,
  Calculator,
  ArrowUpRight,
  Scale,
} from "lucide-react";

import AccidenteActualizacion from "@/components/AccidenteActualizacion";
import GuiaAccidente from "@/components/GuiaAccidente";
import LineaTemporalAccidente from "@/components/LineaTemporalAccidente";
import BuscarResolucionAccidente from "@/components/BuscarResolucionAccidente";
import AccidentePasoUno from "@/components/AccidentePasoUno";
import AccidentePasoDos from "@/components/AccidentePasoDos";
import AccidentePasoTres from "@/components/AccidentePasoTres";
import { AccidenteProvider } from "@/components/AccidenteContext";

const AZUL = "#0f2f4b";

export default function AccidenteTabs() {
  return (
    <AccidenteProvider>
      <div className="w-full max-w-6xl mx-auto">
        {/* Header FINFOCUS */}
        <div className="mb-4">
          <h1
            className="text-xl md:text-2xl font-semibold"
            style={{ color: AZUL }}
          >
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
          </p>
        </div>

        <Tabs defaultValue="actualizacion" className="w-full">
          {/* ===== TABS GLOBALES ===== */}
          <div
            className="
              rounded-2xl 
              bg-slate-50/80 
              border border-slate-200 
              px-4 py-5 
              mb-6 
              min-h-[140px]
              flex flex-col justify-center
            "
          >
            <TabsList
              className="
                w-full bg-transparent border-none p-0
                flex flex-col gap-2
                [&>div]:w-full
              "
            >
              {/* ===== FILA 1 ===== */}
              <div
                className="
                  flex flex-wrap justify-center gap-2
                  [&>button]:whitespace-nowrap
                "
              >
                <TabsTrigger
                  value="actualizacion"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <Wallet className="h-4 w-4" />
                  Último RIPTE publicado
                </TabsTrigger>

                <TabsTrigger
                  value="guia"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <BookOpenCheck className="h-4 w-4" />
                  Guía
                </TabsTrigger>

                <TabsTrigger
                  value="linea"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <Clock3 className="h-4 w-4" />
                  Línea temporal
                </TabsTrigger>

                <TabsTrigger
                  value="buscador"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <Search className="h-4 w-4" />
                  Buscador de resoluciones
                </TabsTrigger>
              </div>

              {/* ===== FILA 2 ===== */}
              <div
                className="
                  flex flex-wrap justify-center gap-2
                  [&>button]:whitespace-nowrap
                "
              >
                <TabsTrigger
                  value="paso1"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <Calculator className="h-4 w-4" />
                  Paso 1: IBM
                </TabsTrigger>

                <TabsTrigger
                  value="paso2"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Paso 2: Actualizar IBM
                </TabsTrigger>

                <TabsTrigger
                  value="paso3"
                  className="
                    inline-flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-full
                    text-slate-700 bg-white/70 border border-slate-200
                    data-[state=active]:bg-[#0f2f4b]
                    data-[state=active]:text-white
                    data-[state=active]:border-[#0f2f4b]
                    data-[state=active]:shadow-sm
                    transition-all
                  "
                >
                  <Scale className="h-4 w-4" />
                  Paso 3: Fórmula final. Compara con mínimos
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* ===== CONTENEDOR BLANCO PARA LAS HERRAMIENTAS ===== */}
          <TabsContent value="actualizacion" className="mt-0">
            <AccidenteActualizacion />
          </TabsContent>

          <TabsContent value="guia" className="mt-0">
            <GuiaAccidente />
          </TabsContent>

          <TabsContent value="linea" className="mt-0">
            <LineaTemporalAccidente />
          </TabsContent>

          <TabsContent value="buscador" className="mt-0">
            <BuscarResolucionAccidente />
          </TabsContent>

          <TabsContent value="paso1" className="mt-0">
            <AccidentePasoUno />
          </TabsContent>

          <TabsContent value="paso2" className="mt-0">
            <AccidentePasoDos />
          </TabsContent>

          <TabsContent value="paso3" className="mt-0">
            <AccidentePasoTres />
          </TabsContent>
        </Tabs>
      </div>
    </AccidenteProvider>
  );
}