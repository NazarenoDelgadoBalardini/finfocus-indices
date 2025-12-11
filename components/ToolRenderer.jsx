// src/components/ToolRenderer.jsx
import React, { useEffect, useState } from 'react';
import { User } from '@/entities/User';
import { canAccessTool } from '@/utils/ToolAccess';
import CalculadoraActualizacion from '@/components/CalculadoraActualizacion';
import AjustePorInflacion from '@/components/AjustePorInflacion';
import ContadoOEnCuotas from '@/components/ContadoOEnCuotas';
import Actualizaalquiler from '@/components/Actualizaalquiler';
import CompararTasas from '@/components/CompararTasas';
import Monedas from '@/components/Monedas';
import InteresCompuesto from '@/components/InteresCompuesto';
import SacarPrestamo from '@/components/SacarPrestamo';
import FinancialHealth from '@/components/FinancialHealth';
import ControlGastos from '@/components/ControlGastos';
import OfrecerEnCuotas from '@/components/OfrecerEnCuotas';
import ValorPresente from '@/components/ValorPresente';
import Actualizar276 from '@/components/Actualizar276';
import RentaCapitalizada from '@/components/RentaCapitalizada';
import VuottoMendez from '@/components/VuottoMendez';
import IndemnizacionDespido from '@/components/IndemnizacionDespido';
import RegistroSentencias from '@/components/RegistroSentencias';
import LicenciasAbogados from '@/components/LicenciasAbogados';
import CalculadoraPlazos from '@/components/CalculadoraPlazos';
import BonoMovilidad from '@/components/BonoMovilidad';
import Prorrateo from '@/components/Prorrateo';
import InteresCompensatorioPunitorio from '@/components/InteresCompensatorioPunitorio';
import MultiplesTasas from '@/components/MultiplesTasas';
import CarteraFINFOCUSSTART from '@/components/CarteraFINFOCUSSTART';
import CarteraFINFOCUS from '@/components/CarteraFINFOCUS';
import CarteraFINFOCUSPLUS from '@/components/CarteraFINFOCUSPLUS';
import CurvaRendimientosBonos from '@/components/CurvaRendimientosBonos';
import BonosPesosTabs from '@/components/BonosPesosTabs';
import OrdenesDePago from '@/components/OrdenesDePago';
import PlanillaFiscalTotal from '@/components/PlanillaFiscalTotal';
import TotalADepositar from '@/components/TotalADepositar';
import CalculadoraDeAccidente from '@/components/CalculadoraDeAccidente';
import LaboratorioFINFOCUS from '@/components/LaboratorioFINFOCUS';
import CalendarioPagos from '@/components/CalendarioPagos';
import LibrosRecomendados from '@/components/LibrosRecomendados';
import VideosExplicativos from '@/components/VideosExplicativos';
import RentaFijaFINFOCUS from '@/components/RentaFijaFINFOCUS';
import RentaFijaFINFOCUSPlus from '@/components/RentaFijaFINFOCUSPlus';

const COMPONENTS = {
  CalculadoraActualizacion,
  AjustePorInflacion,
  ContadoOEnCuotas,
  Actualizaalquiler,
  CompararTasas,
  Monedas,
  InteresCompuesto,
  SacarPrestamo,
  FinancialHealth,
  ControlGastos,
  OfrecerEnCuotas,  
  ValorPresente,
  Actualizar276,
  RentaCapitalizada,
  VuottoMendez,
  IndemnizacionDespido,
  RegistroSentencias,
  LicenciasAbogados,
  CalculadoraPlazos,
  Prorrateo,
  InteresCompensatorioPunitorio,
  MultiplesTasas,
  CarteraFINFOCUSSTART,
  CarteraFINFOCUS,
  CarteraFINFOCUSPLUS,
  CurvaRendimientosBonos,
  BonoMovilidad,
  BonosPesosTabs,
  OrdenesDePago,
  PlanillaFiscalTotal,
  TotalADepositar,
  CalculadoraDeAccidente,
  LaboratorioFINFOCUS,
  CalendarioPagos,
  LibrosRecomendados,
  VideosExplicativos,
  RentaFijaFINFOCUS,
  RentaFijaFINFOCUSPlus,

};

export default function ToolRenderer({ tool }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.error('Error cargando usuario en ToolRenderer:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="p-4 text-red-600 text-sm">
        ❌ Herramienta no encontrada.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-red-600 text-sm">
        ⚠️ No se pudo cargar el usuario actual.
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  if (!isAdmin && !canAccessTool(user, tool)) {
    return (
      <div className="p-6 text-center text-red-600 text-sm">
        ⚠️ No tenés acceso a esta herramienta con tu plan actual.
        <br />
        Verificá tu plan FINFOCUS / FINLEGAL.
      </div>
    );
  }

  // 👇 Parte importante
  if (tool.componentName && COMPONENTS[tool.componentName]) {
    const SpecificTool = COMPONENTS[tool.componentName];
    
    // Ya no necesitamos envolver CalculadoraDeAccidente aquí porque tiene su propio provider
    return <SpecificTool toolId={tool.id} toolName={tool.name} />;
  }

  if (tool.iframeUrl) {
    return (
      <iframe
        src={tool.iframeUrl}
        title={tool.name}
        className="w-full border-0 rounded-xl shadow-md"
        style={{ minHeight: '800px', height: '100vh' }}
      />
    );
  }

  return (
    <div className="p-6 text-center text-gray-500 text-sm">
      🛠️ Esta herramienta está en construcción.
    </div>
  );
}