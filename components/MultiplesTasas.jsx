// src/components/InteresIndicesDinamicos.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialData } from '@/entities/FinancialData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Calendar as CalendarIcon, RefreshCw, TrendingUp } from 'lucide-react';

// 🔹 Select para la ventana del panel
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// =================== Helpers de formato ===================

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatearFechaDDMMYYYY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ========== Parseo de fechas tipo "ene-24" (igual que en CalculadoraActualizacion) ==========
function parseFechaIPC(fechaStr) {
  try {
    if (!fechaStr) return null;
    const str = fechaStr.toString().trim().toLowerCase();

    const meses = {
      // Español corto
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,

      // Variantes comunes
      set: 8, // "setembro"
      sept: 8,

      // Inglés
      jan: 0,
      apr: 3,
      aug: 7,
      dec: 11,
    };

    const parts = str.split('-');

    if (parts.length === 2 && meses[parts[0]] !== undefined) {
      const mesStr = parts[0];
      const yearStr = parts[1];

      const mes = meses[mesStr];
      let year = parseInt(yearStr, 10);
      if (Number.isNaN(year)) return null;

      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      const fecha = new Date(year, mes, 1);
      return fecha.toISOString();
    }

    let match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const fecha = new Date(year, month, 1);
      return fecha.toISOString();
    }

    match = str.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const fecha = new Date(year, month, 1);
      return fecha.toISOString();
    }

    return null;
  } catch (error) {
    console.error('Error parseando fecha IPC:', fechaStr, error);
    return null;
  }
}

function claveMensual(fechaIso) {
  if (!fechaIso) return null;
  const [y, m] = fechaIso.split('-');
  return `${y}-${m}`;
}

function diasEntre(f1, f2) {
  const d1 = new Date(f1);
  const d2 = new Date(f2);
  return (d2 - d1) / (1000 * 60 * 60 * 24);
}

// ========================================================
// Helpers para ventana (último mes, último año, 3 años, etc.)
// ========================================================

function mesesDeVentana(valorVentana) {
  switch (valorVentana) {
    case '1m':
      return 1;
    case '3m':
      return 3;
    case '6m':
      return 6;
    case '1y':
      return 12;
    case '3y':
      return 36;
    case '5y':
      return 60;
    default:
      return 12;
  }
}

function labelVentanaResumen(valorVentana) {
  switch (valorVentana) {
    case '1m':
      return 'Último mes';
    case '3m':
      return 'Último trimestre';
    case '6m':
      return 'Último semestre';
    case '1y':
      return 'Último año';
    case '3y':
      return 'Últimos 3 años';
    case '5y':
      return 'Últimos 5 años';
    default:
      return 'Último año';
  }
}

// ========================================================
// Helpers para formatear filas del panel
// ========================================================

function labelIndiceResumen(tipo) {
  return (
    {
      activa: 'Tasa Activa BNA',
      pasiva: 'Tasa Pasiva promedio BCRA',
      cer: 'CER',
      inflacion: 'IPC Nivel General',
      smvm: 'SMVM',
      ripte: 'RIPTE',
    }[tipo] || tipo
  );
}

function formatearValorIndice(tipo, valor) {
  if (valor == null || isNaN(valor)) return '—';

  if (tipo === 'activa' || tipo === 'pasiva') {
    return valor.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (tipo === 'smvm') {
    return valor.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ========================================================
// Helpers para manejar claves mensuales y diarias
// ========================================================

function restarMesesClaveMensual(claveYYYYMM, meses) {
  if (!claveYYYYMM) return null;
  const [y, m] = claveYYYYMM.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  d.setMonth(d.getMonth() - meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function restarMesesFechaISO(fechaISO, meses) {
  if (!fechaISO) return null;
  const [y, m, d] = fechaISO.split('-').map(Number);
  const date = new Date(y, m - 1, d || 1);
  date.setMonth(date.getMonth() - meses);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    d
  ).padStart(2, '0')}`;
}

function encontrarClaveAnteriorOMisma(claves, objetivo) {
  if (!claves || claves.length === 0 || !objetivo) return null;
  const ordenadas = [...claves].sort();
  let candidata = null;
  for (const k of ordenadas) {
    if (k <= objetivo) candidata = k;
    else break;
  }
  return candidata;
}

// ========================================================
// Cálculo del resumen del índice (último valor + variación ventana)
// ========================================================

function calcularResumenIndice(tipo, indices, ventana) {
  if (!indices) return null;

  const mesesVentana = mesesDeVentana(ventana);
  const esMensual = ['inflacion', 'smvm', 'ripte'].includes(tipo);

  const datos = indices[tipo] || {};
  const claves = Object.keys(datos);
  if (!claves.length) return null;

  const clavesOrdenadas = [...claves].sort();
  const claveUltima = clavesOrdenadas[clavesOrdenadas.length - 1];
  const valorUltimo = datos[claveUltima];

  let claveInicio = null;

  if (esMensual) {
    const claveEstimada = restarMesesClaveMensual(claveUltima, mesesVentana);
    claveInicio = encontrarClaveAnteriorOMisma(clavesOrdenadas, claveEstimada);
  } else {
    const fechaEstimada = restarMesesFechaISO(claveUltima, mesesVentana);
    claveInicio = encontrarClaveAnteriorOMisma(clavesOrdenadas, fechaEstimada);
  }

  let variacion = null;

  if (claveInicio && datos[claveInicio] != null) {
    const i1 = datos[claveInicio];
    const i2 = valorUltimo;

    if (tipo === 'activa') {
      variacion = i2 - i1;
    } else if (tipo === 'pasiva') {
      variacion = ((100 + i2) / (100 + i1) - 1) * 100;
    } else {
      variacion = (i2 / i1 - 1) * 100;
    }
  }

  const fechaLabel = esMensual ? formatearMesAnioDesdeClave(claveUltima) : formatearFechaArg(claveUltima);

  return {
    tipo,
    nombre: labelIndiceResumen(tipo),
    fechaLabel,
    valorLabel: formatearValorIndice(tipo, valorUltimo),
    variacion,
  };
}

function formatearMesAnioDesdeClave(claveYYYYMM) {
  const MESES_CORTOS_LOC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  if (!claveYYYYMM) return '';
  const [y, m] = claveYYYYMM.split('-').map(Number);
  return `${MESES_CORTOS_LOC[m - 1]} ${y}`;
}

function formatearFechaArg(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// ========================================================
// Generar todas las filas del panel
// ========================================================

function calcularResumenIndices(indices, ventana) {
  if (!indices) return [];
  const tipos = ['activa', 'pasiva', 'ripte', 'smvm', 'inflacion', 'cer'];
  const res = [];
  for (const t of tipos) {
    const fila = calcularResumenIndice(t, indices, ventana);
    if (fila) res.push(fila);
  }
  return res;
}

// ========================================================
// Formato porcentaje para la tabla
// ========================================================

function formatearPorcentajeNumero(numero) {
  if (numero == null || isNaN(numero)) return '—';
  return (
    numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '%'
  );
}

// =================== Helpers de fechas para la grilla ===================

function toISODateLocal(d) {
  const tz = d.getTimezoneOffset();
  const d2 = new Date(d.getTime() - tz * 60000);
  return d2.toISOString().split('T')[0];
}

// Parsear "YYYY-MM-DD" como fecha local (sin sorpresas de UTC)
function parseISOToLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function sumarDiasHabiles(iso, dias) {
  let d = parseISOToLocalDate(iso);
  let restantes = parseInt(dias, 10) || 0;

  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) restantes--;
  }

  return toISODateLocal(d);
}

function addMonthsClamped(iso, months) {
  const d = parseISOToLocalDate(iso);
  const day = d.getDate();
  const y = d.getFullYear();
  const m = d.getMonth() + months;

  const lastTargetDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, lastTargetDay));
}

function claveMesDesdeISO(iso) {
  const [yy, mm] = iso.split('-');
  const idx = parseInt(mm, 10) - 1;
  const mes = MESES_CORTOS[idx] || '';
  const yy2 = yy.slice(-2);
  return `${mes}-${yy2}`;
}

function claveMesAnteriorDesdeISO(iso) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const mes = MESES_CORTOS[m - 1] || '';
  const yy2 = String(y).slice(-2);
  return `${mes}-${yy2}`;
}

// =================== Cálculo de tasas base (copiado de CalculadoraActualizacion) ===================

function getTasaBasePorTipo(tipo, fechaInicio, fechaFin, indices) {
  if (!indices || !fechaInicio || !fechaFin) return null;

  let tasa = null;

  // DIARIAS
  if (tipo === 'activa') {
    const i1 = indices.activa?.[fechaInicio];
    const i2 = indices.activa?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = i2 - i1;
    }
  }

  if (tipo === 'pasiva') {
    const i1 = indices.pasiva?.[fechaInicio];
    const i2 = indices.pasiva?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = ((100 + i2) / (100 + i1) - 1) * 100;
    }
  }

  if (tipo === 'cer') {
    const i1 = indices.cer?.[fechaInicio];
    const i2 = indices.cer?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = (i2 / i1 - 1) * 100;
    }
  }

  // MENSUALES
  if (tipo === 'smvm') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.smvm?.[k1];
    const i2 = indices.smvm?.[k2];
    if (i1 != null && i2 != null) {
      tasa = (i2 / i1 - 1) * 100;
    }
  }

  if (tipo === 'inflacion') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.inflacion?.[k1];
    const i2 = indices.inflacion?.[k2];
    if (i1 != null && i2 != null) {
      tasa = (i2 / i1 - 1) * 100;
    }
  }

  if (tipo === 'ripte') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.ripte?.[k1];
    const i2 = indices.ripte?.[k2];
    if (i1 != null && i2 != null) {
      tasa = (i2 / i1 - 1) * 100;
    }
  }

  return tasa;
}

// Multiplicador global
function getTasaMultiplicada(tipo, iso0, iso1, indices, mulEnabled, mulValue) {
  const base = getTasaBasePorTipo(tipo, iso0, iso1, indices);
  if (base === null || base === undefined) return NaN;
  const f = mulEnabled ? (parseFloat(mulValue) || 1) : 1;
  return base * f;
}

const TIPOS = ['activa', 'pasiva', 'ripte', 'smvm', 'inflacion', 'cer'];
const NOMBRES = {
  activa: 'Tasa activa BNA',
  pasiva: 'Tasa pasiva promedio BCRA',
  ripte: 'RIPTE',
  smvm: 'SMVM',
  inflacion: 'IPC Nivel General',
  cer: 'CER',
};

const SERIES_COLORS = {
  activa:     "#0f2f4b", // azul institucional
  pasiva:     "#5EA6D7", // celeste institucional
  ripte:      "#7c3aed", // violeta suave
  smvm:       "#059669", // verde esmeralda
  inflacion:  "#dc2626", // rojo leve
  cer:        "#f59e0b", // amarillo dorado
};

// =================== Componente principal ===================

// Tick personalizado para el eje X (meses)
function CustomMonthTick(props) {
  const { x, y, payload, total, maxLabels = 10, index } = props;

  // total = cantidad total de puntos
  // maxLabels = máximo de etiquetas que queremos mostrar
  const step = total <= maxLabels ? 1 : Math.ceil(total / maxLabels);

  // solo mostramos uno cada "step"
  if (index % step !== 0) {
    return null;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="#4b5563"
        fontSize={total > 12 ? 10 : 11} // un toque más chico si hay muchos
      >
        {payload.value}
      </text>
    </g>
  );
}

export default function InteresIndicesDinamicos() {
  const [indices, setIndices] = useState(null);
  const [indicesError, setIndicesError] = useState(null);
  const [loadingIndices, setLoadingIndices] = useState(true);

  // Parámetros de la herramienta
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasHabiles, setDiasHabiles] = useState('0');
  const [fechaFin, setFechaFin] = useState('');
  const [mesesMostrar, setMesesMostrar] = useState('1');
  const [modoAncla, setModoAncla] = useState(false);

  const [mulEnabled, setMulEnabled] = useState(false);
  const [mulValue, setMulValue] = useState('1.5');

  // Panel resumen
  const [ventanaResumen, setVentanaResumen] = useState('1y');

  const resumenIndices = useMemo(
    () => (indices ? calcularResumenIndices(indices, ventanaResumen) : []),
    [indices, ventanaResumen]
  );

  // Resultados
  const [filas, setFilas] = useState([]);
  const [statsAcumulado, setStatsAcumulado] = useState(null);
  const [mostrarAcumulado, setMostrarAcumulado] = useState(false);

// 🔹 NUEVO: visibilidad de series en el gráfico
const [visibleSeries, setVisibleSeries] = useState(() =>
  TIPOS.reduce((acc, t) => ({ ...acc, [t]: true }), {})
);

const toggleSerie = (key) => {
  setVisibleSeries((prev) => ({
    ...prev,
    [key]: !prev[key],
  }));
};


  // ========== Carga de índices desde FinancialData ==========
  useEffect(() => {
    const loadIndices = async () => {
      try {
        setLoadingIndices(true);
        setIndicesError(null);

        const all = await FinancialData.list('-lastSync');

        const base = {
          activa: {},
          pasiva: {},
          cer: {},
          inflacion: {},
          smvm: {},
          ripte: {},
        };

        for (const fd of all || []) {
          const catRaw = fd.category || '';
          const cat = catRaw.toLowerCase();

          let targetKey = null;

          // TASAS DIARIAS
          if (cat.includes('tasa_activa')) targetKey = 'activa';
          if (cat === 'tasa_activa_bna') targetKey = 'activa';

          if (cat.includes('tasa_pasiva')) targetKey = 'pasiva';
          if (cat === 'tasa_pasiva_bcra') targetKey = 'pasiva';

          // CER
          if (cat === 'cer' || cat.includes('cer')) targetKey = 'cer';

          // IPC → inflación
          if (cat === 'ipc_nivel_general' || cat.includes('ipc')) {
            targetKey = 'inflacion';
          }

          // SMVM & RIPTE
          if (cat === 'smvm' || cat.includes('smvm')) targetKey = 'smvm';
          if (cat === 'ripte') targetKey = 'ripte';

          if (!targetKey) continue;

          const headers = fd.headers || [];
          const headersLower = headers.map((h) => (h || '').toString().toLowerCase());

          const fechaIdx = headersLower.findIndex(
            (h) =>
              h.includes('fecha') ||
              h.includes('date') ||
              h.includes('periodo') ||
              h.includes('período') ||
              h.includes('mes')
          );

          const valorIdx = headersLower.findIndex((h) => {
            const tieneEtiquetaValor =
              h.includes('indice') ||
              h.includes('índice') ||
              h.includes('valor') ||
              h.includes('nivel') ||
              h.includes('ipc') ||
              h.includes('ripte') ||
              h.includes('smvm');

            const esVariacion =
              h.includes('variación') || h.includes('mensual') || h.includes('interanual') || h.includes('%');

            return tieneEtiquetaValor && !esVariacion;
          });

          if (fechaIdx === -1 || valorIdx === -1) continue;

          for (const row of fd.data || []) {
            const rawFecha = row[fechaIdx];
            const rawValor = row[valorIdx];
            if (!rawFecha || rawValor == null) continue;

            const fechaStr = String(rawFecha).trim();
            const valor = parseFloat(String(rawValor).replace(/\./g, '').replace(',', '.'));
            if (isNaN(valor)) continue;

            // Mensuales
            if (['inflacion', 'smvm', 'ripte'].includes(targetKey)) {
              const parsedISO = parseFechaIPC(fechaStr);
              if (parsedISO) {
                const d = new Date(parsedISO);
                const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                base[targetKey][clave] = valor;
                continue;
              }

              const lower = fechaStr.toLowerCase();
              let clave = null;

              if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
                clave = lower.slice(0, 7);
              } else if (/^\d{4}-\d{2}$/.test(lower)) {
                clave = lower;
              } else {
                clave = lower;
              }

              base[targetKey][clave] = valor;
              continue;
            }

            // Diarios
            if (['activa', 'pasiva', 'cer'].includes(targetKey)) {
              base[targetKey][fechaStr] = valor;
            } else {
              const lower = fechaStr.toLowerCase();
              let clave = null;

              if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
                clave = lower.slice(0, 7);
              } else if (/^\d{4}-\d{2}$/.test(lower)) {
                clave = lower;
              } else {
                clave = lower;
              }

              base[targetKey][clave] = valor;
            }
          }
        }

        setIndices(base);
      } catch (e) {
        console.error('Error cargando índices:', e);
        setIndicesError('No se pudieron cargar los índices desde FinancialData.');
      } finally {
        setLoadingIndices(false);
      }
    };

    loadIndices();
  }, []);

  // Datos para el gráfico (Recharts)
  const chartData = useMemo(
    () =>
      filas.map((row) => ({
        label: row.label,
        ...row.valores,
      })),
    [filas]
  );

  // Cálculo de tabla + stats
  const handleCalcular = () => {
    if (!fechaInicio || !fechaFin) {
      alert('Completá Fecha de inicio y Fecha fin.');
      return;
    }
    if (!indices) {
      alert('Todavía no se cargaron los índices.');
      return;
    }

    const meses = Math.max(parseInt(mesesMostrar || '1', 10), 1);
    const dias = parseInt(diasHabiles || '0', 10) || 0;

    const nuevasFilas = [];

    if (modoAncla) {
      // ANCLA: inicio real = fechaInicio + días hábiles; luego avanzamos mes a mes manteniendo el día
      const isoStartReal = sumarDiasHabiles(fechaInicio, dias);
      for (let i = 0; i < meses; i++) {
        const dStart = addMonthsClamped(isoStartReal, i);
        const iso0 = toISODateLocal(dStart);
        const label = claveMesDesdeISO(iso0); // mes devengado = mes anterior

        const valores = {};
        TIPOS.forEach((t) => {
          const pct = getTasaMultiplicada(t, iso0, fechaFin, indices, mulEnabled, mulValue);
          valores[t] = isNaN(pct) ? null : pct;
        });

        nuevasFilas.push({
          label,
          iso0,
          isoFin: fechaFin,
          valores,
        });
      }
    } else {
      // EOM: usamos último día de cada mes desde fechaInicio
      const d0 = new Date(fechaInicio);
      const y0 = d0.getFullYear();
      const m0 = d0.getMonth(); // 0..11

      for (let i = 0; i < meses; i++) {
        const eom = new Date(y0, m0 + i + 1, 0); // último día de ese mes
        const baseIso =
  `${eom.getFullYear()}-${String(eom.getMonth()+1).padStart(2,'0')}-${String(eom.getDate()).padStart(2,'0')}`;
        const iso0 = sumarDiasHabiles(baseIso, dias);
        const label = claveMesDesdeISO(baseIso); // mes devengado = ese mes

        const valores = {};
        TIPOS.forEach((t) => {
          const pct = getTasaMultiplicada(t, iso0, fechaFin, indices, mulEnabled, mulValue);
          valores[t] = isNaN(pct) ? null : pct;
        });

        nuevasFilas.push({
          label,
          iso0,
          isoFin: fechaFin,
          valores,
        });
      }
    }

    // Stats de “área bajo la curva”
    const stats = {};
    TIPOS.forEach((t) => {
      stats[t] = { sum: 0, count: 0, max: -Infinity, min: Infinity };
    });

    nuevasFilas.forEach((row) => {
      TIPOS.forEach((t) => {
        const v = row.valores[t];
        if (v != null && !isNaN(v)) {
          const s = stats[t];
          s.sum += v;
          s.count += 1;
          if (v > s.max) s.max = v;
          if (v < s.min) s.min = v;
        }
      });
    });

    setFilas(nuevasFilas);
    setStatsAcumulado(stats);
    setMostrarAcumulado(false);
  };

  // Tabla principal (mensual)
// Tabla principal (mensual)
const renderTablaMensual = () => {
  if (!filas.length) return null;

  return (
    <div className="flex justify-center mt-4">
      <div className="w-full max-w-none">
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-[#FFF] p-3">
<table className="min-w-max w-full text-xs md:text-sm text-center">
  <thead className="bg-slate-50">
    <tr>
      <th className="px-3 py-2 font-semibold text-slate-700 text-center">
        Mes devengado
      </th>
      <th className="px-3 py-2 font-semibold text-slate-700 text-center">
        Inicio interés
      </th>
      <th className="px-3 py-2 font-semibold text-slate-700 text-center">
        Fecha fin
      </th>

      {TIPOS.map((t) => (
        <th
          key={t}
          className="px-3 py-2 font-semibold text-slate-700 text-center"
        >
          {NOMBRES[t]}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    {filas.map((row, idx) => {
      const valoresNoNulos = TIPOS.map((t) => row.valores[t]).filter(
        (v) => v != null && !isNaN(v)
      );
      const max = valoresNoNulos.length
        ? Math.max(...valoresNoNulos)
        : NaN;

      return (
        <tr
          key={idx}
          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
        >
          <td className="px-2 py-1 text-center">{row.label}</td>
          <td className="px-2 py-1 text-center">
            {formatearFechaDDMMYYYY(row.iso0)}
          </td>
          <td className="px-2 py-1 text-center">
            {formatearFechaDDMMYYYY(row.isoFin)}
          </td>

          {TIPOS.map((t) => {
            const v = row.valores[t];
            const esMax =
              v != null && !isNaN(v) && v === max;
            const txt =
              v == null || isNaN(v)
                ? 'N/A'
                : v.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) + '%';

            return (
              <td
                key={t}
                className={
                  'px-2 py-1 text-center ' +
                  (esMax ? 'bg-[#d6eaf8] font-semibold' : '')
                }
              >
                {txt}
              </td>
            );
          })}
        </tr>
      );
    })}
  </tbody>
</table>
        </div>
      </div>
    </div>
  );
};

  // Tabla “área bajo la curva”
// Tabla “área bajo la curva”
const renderTablaAcumulado = () => {
  if (!statsAcumulado) return null;

  const rows = TIPOS.map((t) => ({
    tipo: t,
    nombre: NOMBRES[t],
    sum: statsAcumulado[t].sum,
    count: statsAcumulado[t].count,
  })).sort((a, b) => b.sum - a.sum);

  const vals = rows.map((r) => r.sum).filter((v) => !isNaN(v));
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const span = vMax - vMin || 1;

  const fmt = (v) =>
    isNaN(v)
      ? 'N/A'
      : v.toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + '%';

  const getColor = (v) => {
    const p = (v - vMin) / span;
    let r, g, b;
    if (p < 0.5) {
      const t = p / 0.5;
      r = 255;
      g = 210 + 40 * t;
      b = 210 - 10 * t;
    } else {
      const t = (p - 0.5) / 0.5;
      r = 255 - 55 * t;
      g = 250 - 10 * t;
      b = 200;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  return (
    <div className="flex justify-center mt-3">
      <div className="w-full max-w-3xl">
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white p-3">
          <table className="min-w-max text-xs md:text-sm text-center">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Índice
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Meses con dato
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Área bajo la curva (Σ %)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.tipo}
                  className="border-t border-slate-100 bg-white"
                >
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td
                    className="px-3 py-2 font-semibold"
                    style={{ background: getColor(r.sum) }}
                  >
                    {fmt(r.sum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  // ========= Render =========

  return (
    <div className="space-y-6">
      {/* PANEL DE ÍNDICES · ESTILO HERO */}
      <Card className="mb-6 border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">
                Últimas fechas de cada índice
              </CardTitle>
              <CardDescription className="text-slate-100/90 mt-1">
                Valores recientes y variación acumulada según la ventana seleccionada.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <span className="text-sm text-slate-100/80">Ventana:</span>
              <Select value={ventanaResumen} onValueChange={setVentanaResumen}>
                <SelectTrigger className="w-[180px] bg-white/10 border-white/40 text-white">
                  <SelectValue placeholder="Seleccioná ventana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Último mes</SelectItem>
                  <SelectItem value="3m">Último trimestre</SelectItem>
                  <SelectItem value="6m">Último semestre</SelectItem>
                  <SelectItem value="1y">Último año</SelectItem>
                  <SelectItem value="3y">Últimos 3 años</SelectItem>
                  <SelectItem value="5y">Últimos 5 años</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm border-collapse overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white text-center">
                  <th className="px-4 py-3 font-semibold text-center">
                    Índice / Tasa
                  </th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
                    Fecha última actualización
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">Valor</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
                    Variación acumulada · {labelVentanaResumen(ventanaResumen)}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white text-center">
                {resumenIndices.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-slate-500 text-center"
                    >
                      {loadingIndices
                        ? 'Cargando índices...'
                        : 'No se encontraron índices cargados.'}
                    </td>
                  </tr>
                )}

                {resumenIndices.map((row) => (
                  <tr
                    key={row.tipo}
                    className="hover:bg-slate-50 transition-colors text-center"
                  >
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-center">
                      {row.nombre}
                    </td>

                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-center">
                      {row.fechaLabel || '—'}
                    </td>

                    <td className="px-4 py-3 text-slate-700 text-center">
                      {row.valorLabel}
                    </td>

                    <td className="px-4 py-3 font-semibold text-[#0f2f4b] text-center">
                      {row.variacion != null
                        ? formatearPorcentajeNumero(row.variacion)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CARD PRINCIPAL MULTIPLESTASAS */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white rounded-t-xl">
          <CardTitle className="text-xl md:text-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Intereses por índices oficiales
            </span>
            <span className="text-sm font-normal opacity-90">
              FINFOCUS · Evolución mensual y área bajo la curva
            </span>
          </CardTitle>
          <CardDescription className="text-slate-100/90 mt-2">
            Calculá y compará la variación acumulada de Activa, Pasiva, CER,
            IPC, SMVM y RIPTE entre una fecha de inicio y una fecha final,
            mes a mes.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-5">
          {indicesError && (
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-300 text-sm text-yellow-900 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>{indicesError}</span>
            </div>
          )}

{/* Parámetros principales */}
<div className="space-y-3">
  <div className="flex flex-col gap-1">
    <Label className="text-xs font-medium text-slate-600">
      Fecha de inicio
    </Label>
    <Input
      type="date"
      value={fechaInicio}
      onChange={(e) => setFechaInicio(e.target.value)}
      className="h-11 rounded-xl border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-[#0f2f4b] focus-visible:border-[#0f2f4b]"
    />
  </div>

  <div className="flex flex-col gap-1">
    <Label className="text-xs font-medium text-slate-600">
      Iniciar después de X días hábiles
    </Label>
    <Input
      type="number"
      min={0}
      value={diasHabiles}
      onChange={(e) => setDiasHabiles(e.target.value)}
      className="h-11 rounded-xl border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-[#0f2f4b] focus-visible:border-[#0f2f4b]"
    />
  </div>

  <div className="flex flex-col gap-1">
    <Label className="text-xs font-medium text-slate-600">
      Fecha fin
    </Label>
    <Input
      type="date"
      value={fechaFin}
      onChange={(e) => setFechaFin(e.target.value)}
      className="h-11 rounded-xl border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-[#0f2f4b] focus-visible:border-[#0f2f4b]"
    />
  </div>

  <div className="flex flex-col gap-1">
    <Label className="text-xs font-medium text-slate-600">
      Meses a mostrar
    </Label>
    <Input
      type="number"
      min={1}
      value={mesesMostrar}
      onChange={(e) => setMesesMostrar(e.target.value)}
      className="h-11 rounded-xl border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-[#0f2f4b] focus-visible:border-[#0f2f4b]"
    />
  </div>
</div>

{/* Switches: Ancla + Multiplicador */}
<div className="mt-4 space-y-3">
  {/* Toggle: Anclar al día de inicio */}
  <div className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 bg-slate-50">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-slate-700">
        Anclar al día de inicio
      </span>
      <span className="text-xs text-slate-500">
        No usar fin de mes para el devengamiento
      </span>
    </div>

    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={modoAncla}
        onChange={(e) => setModoAncla(e.target.checked)}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#0f2f4b] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
    </label>
  </div>

  {/* Toggle + select: Multiplicador de tasa */}
  <div className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 bg-slate-50">
    <div className="flex flex-col">
      <span className="text-sm font-medium text-slate-700">
        Activar multiplicador de tasa
      </span>
      <span className="text-xs text-slate-500">
        Aplica un factor sobre la variación de cada índice
      </span>
    </div>

    <div className="flex items-center gap-3">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={mulEnabled}
          onChange={(e) => setMulEnabled(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#0f2f4b] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
      </label>

      <select
        className="border rounded-md text-sm px-2 py-1"
        disabled={!mulEnabled}
        value={mulValue}
        onChange={(e) => setMulValue(e.target.value)}
      >
        <option value="1">1,00×</option>
        <option value="1.25">1,25×</option>
        <option value="1.5">1,50×</option>
        <option value="1.75">1,75×</option>
        <option value="2">2,00×</option>
      </select>
    </div>
  </div>
</div>

          {/* Botón calcular */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleCalcular}
              disabled={loadingIndices}
              className="bg-[#0f2f4b] hover:bg-[#0c243b]"
            >
              {loadingIndices ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cargando índices...
                </>
              ) : (
                'Calcular y graficar'
              )}
            </Button>
          </div>

 {/* Gráfico Recharts con botoneras para series */}
{filas.length > 0 && (
  <div className="mt-4 border rounded-xl p-4 bg-white">
    <p className="text-sm font-semibold text-[#0f2f4b] mb-3">
      Evolución de variaciones (%) por índice
    </p>

    {/* Botoneras para prender/apagar series */}
<div className="flex flex-wrap gap-2 mb-3">
  {TIPOS.map((t) => {
    const active = visibleSeries[t];
    const color = SERIES_COLORS[t];

    return (
      <button
        key={t}
        type="button"
        onClick={() => toggleSerie(t)}
        className={
          'px-3 py-1.5 rounded-full text-xs font-semibold border transition flex items-center gap-2 ' +
          (active
            ? 'text-white shadow-sm'
            : 'bg-white text-slate-600 border-slate-300 hover:text-slate-800')
        }
        style={{
          backgroundColor: active ? color : "white",
          borderColor: active ? color : "#d1d5db",
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {NOMBRES[t]}
      </button>
    );
  })}
</div>

    <div className="w-full" style={{ height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
<XAxis
  dataKey="label"
  interval={0}         // sigue pasando todos los puntos al tick personalizado
  tickMargin={8}
  minTickGap={0}
  tick={(props) => (
    <CustomMonthTick
      {...props}
      total={chartData.length}   // 👈 cuántos puntos tiene el eje
      maxLabels={10}            // 👈 máximo de etiquetas visibles (ajustable)
    />
  )}
/>
          <YAxis
            tickFormatter={(v) =>
              Number(v).toLocaleString('es-AR') + '%'
            }
          />
          <Tooltip
            formatter={(value, name) => {
              if (value == null || isNaN(value))
                return ['N/A', NOMBRES[name] || name];
              const txt = Number(value).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              return [txt + '%', NOMBRES[name] || name];
            }}
          />
          {/* Legend opcional: ya tenemos botoneras, podés eliminarla si querés */}
          {/* <Legend /> */}

          {/* Lines solo para las series activas */}
{TIPOS.map(
  (t) =>
    visibleSeries[t] && (
      <Line
        key={t}
        type="monotone"
        stroke={SERIES_COLORS[t]}
        strokeWidth={3}
        dot={false}
        activeDot={{ r: 5 }}
        dataKey={t}
        name={NOMBRES[t]}
      />
    )
)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

          {/* Tabla mensual */}
          {renderTablaMensual()}

          {/* Botón / bloque de acumulado */}
          {statsAcumulado && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarAcumulado((v) => !v)}
              >
                {mostrarAcumulado
                  ? 'Ocultar resumen acumulado'
                  : 'Mostrar resumen acumulado'}
              </Button>
            </div>
          )}

          {statsAcumulado && mostrarAcumulado && (
            <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-sm font-semibold text-[#0f2f4b] mb-2">
                Resumen acumulado (área bajo la curva)
              </p>
              <p className="text-xs text-slate-500 mb-2">
                Para cada índice, se suma la variación (%) de cada mes
                individual hasta la fecha fin seleccionada.
              </p>
              {renderTablaAcumulado()}
            </div>
          )}

          {!filas.length && !loadingIndices && (
            <p className="text-xs text-slate-400">
              Ingresá las fechas, los meses a mostrar y hacé clic en{' '}
              <span className="font-semibold">Calcular y graficar</span>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
