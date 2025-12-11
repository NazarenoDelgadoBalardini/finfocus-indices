import { useEffect, useState } from 'react';
import { Tool } from '@/entities/Tool';

export default function InitializeFinLegalTools() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeTools();
  }, []);

  const initializeTools = async () => {
    try {
      const existingTools = await Tool.list();
      
      // SIEMPRE verificar y crear la herramienta gratuita "Ajuste por inflación"
      const ajusteInflacion = existingTools.find(t => t.name === 'Ajuste por inflación');
      if (!ajusteInflacion) {
        await Tool.create({
          name: 'Ajuste por inflación',
          description: 'Calcula el ajuste por inflación utilizando el IPC Nivel General entre dos fechas',
          category: 'free',
          icon: 'Percent',
          order: 0,
          isActive: true,
          allowTrial: true,
          componentName: 'AjustePorInflacion'
        });
        console.log('✅ Herramienta "Ajuste por inflación" creada');
      }

      // Verificar y crear la herramienta gratuita "Contado o en cuotas"
      const contadoOEnCuotas = existingTools.find(t => t.name === 'Contado o en cuotas');
      if (!contadoOEnCuotas) {
        await Tool.create({
          name: 'Contado o en cuotas',
          description: 'Compara pagar al contado versus en cuotas considerando inflación esperada',
          category: 'free',
          icon: 'ArrowLeftRight',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'ContadoOEnCuotas'
        });
        console.log('✅ Herramienta "Contado o en cuotas" creada');
      }

      // Verificar y crear la herramienta gratuita "Actualizar alquiler"
      const Actualizaalquiler = existingTools.find(t => t.name === 'Actualizar alquiler');
      if (!Actualizaalquiler) {
        await Tool.create({
          name: 'Actualizar alquiler',
          description: 'Actualiza tu alquiler usando los índices más usados (CER, UVA, UVI, IPC, ICL).',
          category: 'free',
          icon: 'Home',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'Actualizaalquiler'
        });
        console.log('✅ Herramienta "Actualizar alquiler" creada');
      }

      // Verificar y crear la herramienta gratuita "Comparar tasas"
      const compararTasas = existingTools.find(t => t.name === 'Comparar tasas');
      if (!compararTasas) {
        await Tool.create({
          name: 'Comparar tasas',
          description: 'Comparar tasas de las principales billeteras virtuales, y plazo fijo de los bancos tradicionales',
          category: 'free',
          icon: 'BarChart3',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'CompararTasas'  // ✅ CORREGIDO: ahora coincide con ToolRenderer
        });
        console.log('✅ Herramienta "Comparar tasas" creada');
      }

      // Verificar y crear la herramienta gratuita "Cotizaciones de monedas"
      const Monedas = existingTools.find(t => t.name === 'Cotizaciones de monedas');
      if (!Monedas) {
        await Tool.create({
          name: 'Cotizaciones de monedas',
          description: 'Conoce las cotizaciones de las monedas y convierte por otras',
          category: 'free',
          icon: 'Coins',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'Monedas'
        });
        console.log('✅ Herramienta "Cotizaciones de monedas" creada');
      }

        // Verificar y crear la herramienta gratuita "Calculadora de interés compuesto"
      const InteresCompuesto = existingTools.find(t => t.name === 'Calculadora de interés compuesto');
      if (!InteresCompuesto) {
        await Tool.create({
          name: 'Calculadora de interés compuesto',
          description: 'Simula cuánto podés acumular invirtiendo',
          category: 'free',
          icon: 'LineChart',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'InteresCompuesto'
        });
        console.log('✅ Herramienta "Calculadora de interés compuesto" creada');
      }

        // Verificar y crear la herramienta gratuita "El lado B de los préstamos"
      const SacarPrestamo = existingTools.find(t => t.name === 'El lado B de los préstamos');
      if (!SacarPrestamo) {
        await Tool.create({
          name: 'El lado B de los préstamos',
          description: 'Simula cuánto podés acumular invirtiendo',
          category: 'free',
          icon: 'PiggyBank',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'SacarPrestamo'
        });
        console.log('✅ Herramienta "El lado B de los préstamos" creada');

      }
        // Verificar y crear la herramienta gratuita "Test de salud financiera"
      const FinancialHealth = existingTools.find(t => t.name === 'Test de salud financiera');
      if (!FinancialHealth) {
        await Tool.create({
          name: 'Test de salud financiera',
          description: 'Una patrulla financiera que busca poner en orden tus finanzas',
          category: 'free',
          icon: 'Activity',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'FinancialHealth'
        });
        console.log('✅ Herramienta "Salud Financiera" creada');
      }

      // Verificar y crear la herramienta gratuita "Control de Gastos Personales"
      const ControlGastos = existingTools.find(t => t.name === 'Control de Gastos Personales');
      if (!ControlGastos) {
        await Tool.create({
          name: 'Control de Gastos Personales',
          description: 'Registrá tus ingresos y gastos, gestioná tus tarjetas de crédito con cuotas automáticas y visualizá tu flujo de fondos mensual con gráficos detallados.',
          category: 'free',
          icon: 'Wallet',
          order: 8,
          isActive: true,
          allowTrial: true,
          componentName: 'ControlGastos'
        });
        console.log('✅ Herramienta "Control de Gastos Personales" creada');
      }

      // Verificar y crear la herramienta "Cartera FINFOCUS PESOS"
      const CarteraFINFOCUSSTART = existingTools.find(t => t.name === 'Cartera FINFOCUS START');
      if (!CarteraFINFOCUSSTART) {
        await Tool.create({
          name: 'Cartera FINFOCUS START',
          description: 'Un proyecto pensado para perfiles conservadores, en pesos',
          category: 'finfocus_start',
          icon: 'PiggyBank',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'CarteraFINFOCUSSTART'
        });
        console.log('✅ Herramienta "Cartera FINFOCUS START" creada');
      }           

      // Verificar y crear la herramienta "Cartera FINFOCUS"
      const CarteraFINFOCUS = existingTools.find(t => t.name === 'Cartera FINFOCUS');
      if (!CarteraFINFOCUS) {
        await Tool.create({
          name: 'Cartera FINFOCUS',
          description: 'Un proyecto pensado para perfiles moderados, en USD.',
          category: 'finfocus',
          icon: 'Briefcase',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'CarteraFINFOCUS'
        });
        console.log('✅ Herramienta "Cartera FINFOCUS" creada');
      }

      // Verificar y crear la herramienta "Cartera FINFOCUS+"
      const CarteraFINFOCUSPLUS = existingTools.find(t => t.name === 'Cartera FINFOCUS+');
      if (!CarteraFINFOCUSPLUS) {
        await Tool.create({
          name: 'Cartera FINFOCUS+',
          description: 'Un proyecto pensado para perfiles agresivos, en USD.',
          category: 'finfocus_plus',
          icon: 'Rocket',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'CarteraFINFOCUSPLUS'
        });
        console.log('✅ Herramienta "Cartera FINFOCUS+" creada');
      }

      // Verificar y crear la herramienta "Curva de rendimientos"
      const CurvaRendimientosBonos = existingTools.find(t => t.name === 'Curva de rendimientos. Upside / Downside');
      if (!CurvaRendimientosBonos) {
        await Tool.create({
          name: 'Curva de rendimientos. Upside / Downside',
          description: 'Conoce la estrucutra de la curva de los bonos argentinos y el potencial upside por TIR',
          category: 'finfocus_all',
          icon: 'LineChart',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'CurvaRendimientosBonos'
        });
        console.log('✅ Herramienta "Curva de rendmientos" creada');
      }

      // Verificar y crear la herramienta "Libros recomendados"
      const LibrosRecomendados = existingTools.find(t => t.name === 'Libros recomendados');
      if (!LibrosRecomendados) {
        await Tool.create({
          name: 'Libros recomendados',
          description: '¿Deseas aprender más sobre finanzas? Preparamos esta sección especialmente para vos. Encontrás libros en PDF sin cargo adicional.',
          category: 'finfocus_all',
          icon: 'BookOpen',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'LibrosRecomendados'
        });
        console.log('✅ Herramienta "Libros recomendados" creada');
      }

      // Verificar y crear la herramienta "Videos explicativos"
      const VideosExplicativos = existingTools.find(t => t.name === 'Videos explicativos');
      if (!VideosExplicativos) {
        await Tool.create({
          name: 'Videos explicativos',
          description: 'Explora nuestra sección de videos explicativos y conoce en detalle el objetivo del proyecto FINFOCUS. Aprenderás cómo dar tus primeros pasos en el mundo de las inversiones, registrar tus datos personales y mucho más.',
          category: 'finfocus_all',
          icon: 'PlayCircle',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'VideosExplicativos'
        });
        console.log('✅ Herramienta "Videos explicativos" creada');
      }

            // Verificar y crear la herramienta "Rendimientos en pesos"
      const BonosPesosTabs = existingTools.find(t => t.name === 'Renta fija. Carry trade. Bonos CER.');
      if (!BonosPesosTabs) {
        await Tool.create({
          name: 'Renta fija. Carry trade. Bonos CER.',
          description: 'Rendimientos de los a bonos tasa fija y CER. Carry trade. Bandas cambiarias. Curva de rendimientos. Breackeven',
          category: 'finfocus_all',
          icon: 'BarChart3',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'BonosPesosTabs'
        });
        console.log('✅ Herramienta "Rendimientos en pesos');
      }

                  // Verificar y crear la herramienta "Laboratorio FINFOCUS"
      const LaboratorioFINFOCUS = existingTools.find(t => t.name === 'Herramientas financieras y de riesgo.');
      if (!LaboratorioFINFOCUS) {
        await Tool.create({
          name: 'Herramientas financieras y de riesgo.',
          description: 'Hub central que contiene explicaciones para la tía Marta y calculadoras en un solo lugar.',
          category: 'finfocus_all',
          icon: 'Sparkles',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'LaboratorioFINFOCUS'
        });
        console.log('✅ Herramienta "Laboratorio FINFOCUS');
      }

    // Verificar y crear la herramienta "Calendario de pagos"
      const CalendarioPagos = existingTools.find(t => t.name === 'Calendario de pagos.');
      if (!CalendarioPagos) {
        await Tool.create({
          name: 'Calendario de pagos.',
          description: 'Este calendario permite consultar el cronograma de pagos de algunas empresas y bonos cargados. ¿Nos falta alguno que te gustaría que incorporemos? ¡Contactanos!.',
          category: 'finfocus_all',
          icon: 'CalendarDays',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'CalendarioPagos'
        });
        console.log('✅ Herramienta "Calendario de pagos');
      }

      // Verificar y crear la herramienta "Curva de rendimientos privados"
      const RentaFijaFINFOCUS = existingTools.find(t => t.name === 'Curva de rendimientos privados.');
      if (!RentaFijaFINFOCUS) {
        await Tool.create({
          name: 'Curva de rendimientos privados.',
          description: 'Consulta la curva de rendimientos privados y/o proyecta el flujo de fondos en USD.',
          category: 'finfocus',
          icon: 'BarChart3',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'RentaFijaFINFOCUS'
        });
        console.log('✅ Herramienta "Curva de rendimientos privados');
      }

      // Verificar y crear la herramienta "Curva de rendimientos privados"
      const RentaFijaFINFOCUSPlus = existingTools.find(t => t.name === 'Privados. Curva de rendimiento.');
      if (!RentaFijaFINFOCUSPlus) {
        await Tool.create({
          name: 'Privados. Curva de rendimiento.',
          description: 'Consulta la curva de rendimientos privados y/o proyecta el flujo de fondos en USD.',
          category: 'finfocus_plus',
          icon: 'BarChart3',
          order: 1,
          isActive: true,
          allowTrial: false,
          componentName: 'RentaFijaFINFOCUSPlus'
        });
        console.log('✅ Herramienta "Privados. Curva de rendimiento');
      }
                         
      
      // Definir las 24 herramientas FINLEGAL
      const finlegalToolsData = [
        // FINLEGAL ESENCIAL (herramientas a-c usan la misma calculadora)
        {
          name: 'Calculadora de actualización',
          description: 'Calcula la actualización de capitales históricos con diferentes tasas e índices',
          category: 'finlegal_esencial',
          icon: 'Calculator',
          order: 1,
          isActive: true,
          allowTrial: true,
          componentName: 'CalculadoraActualizacion'
        },
        {
          name: 'Calculadora de capitalización',
          description: 'Calcula la capitalización de intereses sobre capitales históricos',
          category: 'finlegal_esencial',
          icon: 'Calculator',
          order: 2,
          isActive: true,
          allowTrial: true,
          componentName: 'CalculadoraActualizacion'
        },
        {
          name: 'Actualizar y descontar pagos',
          description: 'Actualiza capitales y descuenta pagos realizados',
          category: 'finlegal_esencial',
          icon: 'Calculator',
          order: 3,
          isActive: true,
          allowTrial: true,
          componentName: 'CalculadoraActualizacion'
        },
        {
          name: 'Intereses punitorios, compensatorios',
          description: 'Calcula intereses punitorios y compensatorios',
          category: 'finlegal_esencial',
          icon: 'Percent',
          order: 4,
          isActive: true,
          allowTrial: true,
          componentName: 'InteresCompensatorioPunitorio'
        },
        {
          name: 'Calculadora de tasas por múltiples meses',
          description: 'Calcula tasas aplicadas durante múltiples períodos mensuales',
          category: 'finlegal_esencial',
          icon: 'Calendar',
          order: 5,
          isActive: false,
          allowTrial: true
        },
        {
          name: 'Valor presente de un pago en cuotas',
          description: 'Calcula el valor presente de pagos en cuotas',
          category: 'finlegal_esencial',
          icon: 'DollarSign',
          order: 6,
          isActive: true,
          allowTrial: true,
          componentName: 'ValorPresente'
          
        },
        {
          name: 'Propuesta de un pago en cuotas',
          description: 'Genera propuestas de pago en cuotas',
          category: 'finlegal_esencial',
          icon: 'FileText',
          order: 7,
          isActive: true,
          allowTrial: true,
          componentName: 'OfrecerEnCuotas'
        },
        {
          name: 'Actualizar cuota conforme art. 276 y 277 LCT',
          description: 'Actualiza cuotas según artículos 276 y 277 de la LCT',
          category: 'finlegal_esencial',
          icon: 'Scale',
          order: 8,
          isActive: true,
          allowTrial: true,
          componentName: 'Actualizar276'
        },
        {
          name: 'Indemnización. Liquidación final',
          description: 'Calcula indemnizaciones y liquidaciones finales',
          category: 'finlegal_esencial_plus',
          icon: 'FileCheck',
          order: 9,
          isActive: true,
          allowTrial: true,
          componentName: 'IndemnizacionDespido'
        },
        {
          name: 'Indemnización por accidente o enfermedad',
          description: 'Calcula indemnizaciones por accidentes o enfermedades laborales',
          category: 'finlegal_total',
          icon: 'Heart',
          order: 10,
          isActive: true,
          allowTrial: false,
          componentName: 'CalculadoraDeAccidente'
        },

        // FINLEGAL ESENCIAL PLUS
        {
          name: 'Reparación Integral. Fórmulas Vuotto / Méndez',
          description: 'Calcula reparación integral según fórmulas Vuotto y Méndez',
          category: 'finlegal_esencial_plus',
          icon: 'Calculator',
          order: 11,
          isActive: true,
          allowTrial: true,
          componentName: 'VuottoMendez'
        },
        {
          name: 'Calculadora Renta capitalizada',
          description: 'Calcula rentas capitalizadas',
          category: 'finlegal_esencial_plus',
          icon: 'TrendingUp',
          order: 12,
          isActive: true,
          allowTrial: true,
          componentName: 'RentaCapitalizada'
        },
        {
          name: 'Bono de movilidad',
          description: 'Verifica si para notificar requiere de bono de movilidad. Apto solo para San Miguel de Tucumán.',
          category: 'finlegal_esencial_plus',
          icon: 'Car',
          order: 13,
          isActive: true,
          allowTrial: true,
          componentName: 'BonoMovilidad'
        },
        {
          name: 'Plazos de sentencias',
          description: 'Calcula plazos procesales de sentencias',
          category: 'finlegal_total',
          icon: 'Clock',
          order: 14,
          isActive: true,
          allowTrial: true,
          componentName: 'RegistroSentencias'
        },
        {
          name: 'Regulación de honorarios',
          description: 'Calcula regulación de honorarios profesionales',
          category: 'finlegal_esencial_plus',
          icon: 'Briefcase',
          order: 15,
          isActive: false,
          allowTrial: true
        },
        {
          name: 'Órdenes de pago',
          description: 'Gestiona y calcula órdenes de pago',
          category: 'finlegal_total',
          icon: 'Receipt',
          order: 16,
          isActive: true,
          allowTrial: false,
          componentName: 'OrdenesDePago'
        },
        {
          name: 'Total a depositar',
          description: 'Calcula el total a depositar en juicios',
          category: 'finlegal_esencial_plus',
          icon: 'Wallet',
          order: 17,
          isActive: true,
          allowTrial: false,
          componentName: 'TotalADepositar'
        },

        // FINLEGAL TOTAL
        {
          name: 'Cómputo de fechas',
          description: 'Calcula cómputos de fechas procesales',
          category: 'finlegal_total',
          icon: 'CalendarDays',
          order: 18,
          isActive: true,
          allowTrial: true,
          componentName: 'CalculadoraPlazos'
        },
        {
          name: 'Prorrateo',
          description: 'Realiza cálculos de prorrateo',
          category: 'finlegal_esencial_plus',
          icon: 'PieChart',
          order: 19,
          isActive: true,
          allowTrial: true,
          componentName: 'Prorrateo'
        },
        {
          name: 'Contar plazos',
          description: 'Cuenta plazos procesales',
          category: 'finlegal_total',
          icon: 'Timer',
          order: 20,
          isActive: false,
          allowTrial: true
        },
        {
          name: 'Compara tasas',
          description: 'Compara diferentes tasas de interés',
          category: 'finlegal_total',
          icon: 'BarChart',
          order: 21,
          isActive: false,
          allowTrial: true
        },
        {
          name: 'Cómputo de pena',
          description: 'Calcula cómputos de pena',
          category: 'finlegal_total',
          icon: 'Gavel',
          order: 22,
          isActive: false,
          allowTrial: true
        },
        {
          name: 'Licencias abogados',
          description: 'Gestiona licencias de abogados',
          category: 'finlegal_esencial_plus',
          icon: 'UserCheck',
          order: 23,
          isActive: true,
          allowTrial: true,
          componentName: 'LicenciasAbogados'
        },
        {
          name: 'Planillas fiscales',
          description: 'Genera y gestiona planillas fiscales',
          category: 'finlegal_total',
          icon: 'FileSpreadsheet',
          order: 24,
          isActive: true,
          allowTrial: false,
          componentName: 'PlanillaFiscalTotal'
        },

        {
          name: 'Intereses devengados a múltiples índices o tasas',
          description: 'Conoce el interés devengado por cada tipo de índice para los meses subsiguientes a la fecha de inicio.',
          category: 'finlegal_total',
          icon: 'FileSpreadsheet',
          order: 24,
          isActive: true,
          allowTrial: true,
          componentName: 'MultiplesTasas'
        }

      ];

      // Crear todas las herramientas
for (const toolData of finlegalToolsData) {
  const exists = existingTools.find(t => t.name === toolData.name);
  if (!exists) {
    await Tool.create(toolData);
    console.log(`✅ Herramienta FINLEGAL creada: ${toolData.name}`);
  }
}

setInitialized(true);
console.log('✅ Herramientas FINLEGAL actualizadas correctamente');
    } catch (error) {
      console.error('Error inicializando herramientas FINLEGAL:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
        Inicializando herramientas FINLEGAL...
      </div>
    );
  }


  return null;
}