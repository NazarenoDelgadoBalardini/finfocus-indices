// src/components/CalculadoraIndemnizacionSMVM.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FinancialData } from '@/entities/FinancialData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

// ---------- helpers de formato ----------
const nfARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});
const nfPct = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrencyValue = (n) => nfARS.format(n || 0);

const parseCurrencyValue = (s = '') => {
  const v = String(s).replace(/[^\d]/g, '');
  return v ? parseInt(v, 10) / 100 : 0;
};

const formatCurrencyInput = (raw) => {
  const v = raw.replace(/[^\d]/g, '');
  if (!v) return '';
  return nfARS.format(parseInt(v, 10) / 100);
};

const diasEnMes = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

// ========= Helpers actualización por índices =========

// "2024-03-15" -> "2024-03"
function claveMensual(fechaIso) {
  if (!fechaIso) return null;
  const [y, m] = fechaIso.split('-');
  return `${y}-${m}`;
}

const fmtFechaYMD = (str) => {
  if (!str) return '';
  // yyyy-mm-dd → dd/mm/yyyy
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) return str;
  const [, y, mm, dd] = m;
  return `${dd}/${mm}/${y}`;
};

// Parseo robusto para fechas tipo "ene-24", "sept-21", "jan-19", etc.
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
      set: 8,   // "setembro"
      sept: 8,  // "septiembre"

      // Inglés
      jan: 0,
      apr: 3,
      aug: 7,
      dec: 11,
    };

    const parts = str.split('-');

    // Caso "ene-24", "sep-21", "jan-19", etc.
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

    // Fallback "YYYY-MM-DD"
    let match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const fecha = new Date(year, month, 1);
      return fecha.toISOString();
    }

    // Fallback "YYYY-MM"
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

// Calcula variación acumulada según el tipo de índice
function getTasaBasePorTipo(tipo, fechaInicio, fechaFin, indices) {
  if (!indices || !fechaInicio || !fechaFin) return null;

  let tasa = null;

  // DIARIAS
  if (tipo === 'activa') {
    const i1 = indices.activa?.[fechaInicio];
    const i2 = indices.activa?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = i2 - i1; // misma definición que en CalculadoraActualizacion
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
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  // MENSUALES: SMVM y RIPTE
  if (tipo === 'smvm') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.smvm?.[k1];
    const i2 = indices.smvm?.[k2];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  if (tipo === 'ripte') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.ripte?.[k1];
    const i2 = indices.ripte?.[k2];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  return tasa;
}

const TIPOS_ACTUALIZACION = [
  { value: 'activa', label: 'Tasa activa BNA' },
  { value: 'pasiva', label: 'Tasa pasiva promedio BCRA' },
  { value: 'cer', label: 'CER' },
  { value: 'smvm', label: 'SMVM' },
  { value: 'ripte', label: 'RIPTE' },
];

const labelTipoTasaLarga = (tipo) =>
  ({
    activa: 'Tasa activa BNA',
    pasiva: 'Tasa pasiva promedio BCRA',
    cer: 'CER',
    smvm: 'SMVM',
    ripte: 'RIPTE',
  }[tipo] || tipo);

// ---- helpers numéricos para índices (igual que en AjustePorInflacion) ----
const parseNumberAR = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
};

const fmtFecha = (str) => {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('es-AR'); // → DD/MM/AAAA
};

// ---------- helpers SMVM / fechas desde FinancialData ----------
function claveADate(clave) {
  if (!clave) return null;
  // Soporta "YYYY-MM-DD" o "ene-24" / "sep-25"
  if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) return new Date(clave);

  const mesesMap = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dic: 11,
  };

  const [mesTxt, yy] = clave.toLowerCase().split('-');
  const m = mesesMap[mesTxt] ?? 0;
  const yyNum = parseInt(yy, 10);
  const currentYY = new Date().getFullYear() % 100;
  const siglo = yyNum > currentYY ? 1900 : 2000;
  return new Date(siglo + yyNum, m, 1);
}

function fmtClaveMes(clave) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
    const [y, m] = clave.split('-');
    const labels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${labels[Number(m) - 1]}-${y.slice(-2)}`;
  }
  return clave?.toLowerCase() ?? '';
}

// helper genérico para fechas de índices
const parseFechaGeneric = (value) => {
  if (!value) return null;
  const s = String(value).trim().toLowerCase();

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s);
  }

  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  // mmm-yy, mmm-yyyy, etc → uso claveADate
  const d = claveADate(s);
  return d;
};

// Dado un objeto {clave -> valor}, devuelve claves ordenadas por fecha
const sortedKeys = (obj) =>
  Object.keys(obj || {}).sort((a, b) => claveADate(a) - claveADate(b));

const lastKey = (obj) => {
  const ks = sortedKeys(obj);
  return ks[ks.length - 1];
};

const keyOnOrBefore = (obj, targetDate) => {
  const ks = sortedKeys(obj);
  let res = null;
  for (const k of ks) {
    if (claveADate(k) <= targetDate) res = k;
    else break;
  }
  return res;
};

// helper para array de índices [{fecha, valor}]
const findIndiceOnOrBefore = (arr, targetDate) => {
  if (!arr || !arr.length || !targetDate) return null;
  let res = null;
  for (const item of arr) {
    const d = item.fecha;
    if (d <= targetDate) res = item;
    else break;
  }
  return res;
};

// Devuelve el último día del mes de una fecha dada
const endOfMonth = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? new Date(date) : new Date(date);
  if (isNaN(d)) return null;
  // Día 0 del mes siguiente = último día del mes actual
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

// ---------- constantes de categorías FinancialData (ajustá si usás otros nombres) ----------
const ACTIVA_CATEGORY = 'tasa_activa_bna';
const PASIVA_CATEGORY = 'tasa_pasiva_bcra';
const CER_CATEGORY = 'cer';
const RIPTE_CATEGORY = 'ripte';
// SMVM ya lo cargamos con category: 'smvm'

// ---------- componente principal ----------
export default function CalculadoraIndemnizacionSMVM({ onResultadoChange }) {

  // TAB global Paso 1 / Paso 2
  const [tab, setTab] = useState('paso1');

  // Índices para la actualización (Paso 2)

  // Parámetros de actualización Paso 2

  // Mostrar / ocultar panel SMVM completo
  const [mostrarSMVMPanel, setMostrarSMVMPanel] = useState(false);

  // Inputs base
  const [fechaIngreso, setFechaIngreso] = useState('2015-01-01');
  const [fechaEgreso, setFechaEgreso] = useState('2025-04-12');
  const [antiguedadTexto, setAntiguedadTexto] = useState('');
  const [trabajadorTemporada, setTrabajadorTemporada] = useState(false);
  const [mesesTemporada, setMesesTemporada] = useState('');
  const [mrdInput, setMrdInput] = useState('$450.000,00');

  // Rubros (checkboxes)
  const [chk, setChk] = useState({
    antig: true,
    art247: false,
    preaviso: true,
    sacPreaviso: true,
    diasTrab: true,
    integracion: true,
    sacIntegracion: true,
    sacProp: true,
    vacProp: true,
    sacVac: true,
    art182: false,
    art1: true,
    art2: true,
    art80: true,
    danioMaterial: false,
    danioMoral: false,
    pagoCuenta: false,
  });

  const [multiDanioMaterial, setMultiDanioMaterial] = useState('1');
  const [multiDanioMoral, setMultiDanioMoral] = useState('1');
  const [pagoCuentaInput, setPagoCuentaInput] = useState('');

  // Diferencias salariales
  const [mostrarDif, setMostrarDif] = useState(false);
  const [difRows, setDifRows] = useState([]);

  // Resultados
  const [resumenHTML, setResumenHTML] = useState('');
  const [detalleHTML, setDetalleHTML] = useState('');

  // 👉 nuevo: total numérico para poder actualizarlo
  const [totalCalculado, setTotalCalculado] = useState(null);

  // Refs para exportar a PDF
  const resultadoRef = useRef(null);
  const detalleRef = useRef(null);

  // ---------- SMVM desde FinancialData ----------
  const [smvmData, setSmvmData] = useState(null); // {clave -> valor}
  const [smvmKeys, setSmvmKeys] = useState([]);
  const [smvmWindow, setSmvmWindow] = useState('1y'); // '1y' | '3y' | '5y' | 'all'

  const [smvmLoaded, setSmvmLoaded] = useState(false);
  const [smvmValorDespido, setSmvmValorDespido] = useState(null);
  const [smvmClaveDespido, setSmvmClaveDespido] = useState('');
  const [smvmKpiUltimo, setSmvmKpiUltimo] = useState(null);
  const [smvmKpiVar12, setSmvmKpiVar12] = useState(null);
  const [smvmKpiVar24, setSmvmKpiVar24] = useState(null);
  const [smvmKpiAct, setSmvmKpiAct] = useState('');
  const [ratioMrdSmvm, setRatioMrdSmvm] = useState(null);

  // ---------- NUEVO: datos de otros índices desde FinancialData ----------
  const [tasaActivaData, setTasaActivaData] = useState([]); // [{fecha: Date, valor: number}]
  const [tasaPasivaData, setTasaPasivaData] = useState([]);
  const [cerData, setCerData] = useState([]);
  const [ripteData, setRipteData] = useState([]);

  // selector de actualización
  const [indiceSeleccionado, setIndiceSeleccionado] = useState('tasa_activa_bna');
  const [fechaAjusteHasta, setFechaAjusteHasta] = useState(
    new Date().toISOString().slice(0, 10)
  );

const [fechaAjusteDesde, setFechaAjusteDesde] = useState('');

// 👉 Autocompletar fecha desde con fechaEgreso la primera vez
useEffect(() => {
  if (fechaEgreso && !fechaAjusteDesde) {
    setFechaAjusteDesde(fechaEgreso);
  }
}, [fechaEgreso, fechaAjusteDesde]);

  const [ajusteTotal, setAjusteTotal] = useState(null);
  const [ajusteError, setAjusteError] = useState('');

  // Serie para el gráfico SVG SMVM
  const smvmSeries = React.useMemo(() => {
    if (!smvmData || !smvmKeys.length) return [];

    const lastKeyStr = smvmKeys[smvmKeys.length - 1];
    const lastDate = claveADate(lastKeyStr);

    if (!lastDate) {
      return smvmKeys.map((k) => ({
        key: k,
        label: fmtClaveMes(k),
        value: smvmData[k] ?? 0,
      }));
    }

    if (smvmWindow === 'all') {
      return smvmKeys.map((k) => ({
        key: k,
        label: fmtClaveMes(k),
        value: smvmData[k] ?? 0,
      }));
    }

    let years = 1;
    if (smvmWindow === '3y') years = 3;
    else if (smvmWindow === '5y') years = 5;

    const startDate = new Date(lastDate);
    startDate.setFullYear(startDate.getFullYear() - years);

    return smvmKeys
      .filter((k) => {
        const d = claveADate(k);
        return d && d >= startDate;
      })
      .map((k) => ({
        key: k,
        label: fmtClaveMes(k),
        value: smvmData[k] ?? 0,
      }));
  }, [smvmData, smvmKeys, smvmWindow]);

  // Dataset para Recharts
  const smvmChartData = React.useMemo(
    () =>
      smvmSeries.map((p) => ({
        mes: p.label,
        valor: p.value,
      })),
    [smvmSeries]
  );

  // Extremos para escalar el gráfico (no los uso pero los dejo por si luego querés)
  const { maxVal, minVal } = React.useMemo(() => {
    if (!smvmSeries.length) return { maxVal: 0, minVal: 0 };
    const vals = smvmSeries.map((p) => p.value);
    return {
      maxVal: Math.max(...vals),
      minVal: Math.min(...vals),
    };
  }, [smvmSeries]);

  // Cargar SMVM desde FinancialData una sola vez
  useEffect(() => {
    const loadSMVM = async () => {
      try {
        const list = await FinancialData.filter(
          { category: 'smvm' },
          '-lastSync',
          1
        );

        if (!list || !list.length) {
          console.warn('Sin datos SMVM en FinancialData');
          return;
        }

        const record = list[0];
        const headers = record.headers || [];
        const rows = record.data || [];

        const rawIdxClave = headers.findIndex((h) =>
          /clave|periodo|mes|fecha/i.test(h)
        );
        const rawIdxValor = headers.findIndex((h) =>
          /smvm|valor|monto|importe/i.test(h)
        );

        const idxClave = rawIdxClave >= 0 ? rawIdxClave : 0;
        const idxValor = rawIdxValor >= 0 ? rawIdxValor : 1;

        const obj = {};
        rows.forEach((row) => {
          const key = row[idxClave];
          const val = Number(
            typeof row[idxValor] === 'string'
              ? row[idxValor].replace(/\./g, '').replace(',', '.')
              : row[idxValor]
          );
          if (key && !Number.isNaN(val)) {
            obj[String(key).toLowerCase()] = val;
          }
        });

        const keys = sortedKeys(obj);
        setSmvmData(obj);
        setSmvmKeys(keys);
        setSmvmLoaded(true);
      } catch (err) {
        console.error('Error cargando SMVM desde FinancialData:', err);
      }
    };

    // ---- NUEVO: loader genérico de índices para tasa activa, pasiva, CER, RIPTE ----
    const loadIndiceGenerico = async (category, setter, labelDebug) => {
      try {
        const list = await FinancialData.filter(
          { category, isActive: true },
          '-lastSync',
          1
        );

        if (!list || !list.length) {
          console.warn(`Sin datos para índice ${labelDebug || category}`);
          setter([]);
          return;
        }

        const record = list[0];
        const headers = (record.headers || []).map((h) =>
          (h || '').toString().toLowerCase()
        );
        const rows = record.data || [];

        const idxFecha = headers.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('dia') ||
            h.includes('día') ||
            h.includes('mes') ||
            h.includes('periodo') ||
            h.includes('período')
        );

        const idxValor = headers.findIndex(
          (h) =>
            (h.includes('valor') ||
              h.includes('tasa') ||
              h.includes('indice') ||
              h.includes('índice') ||
              h.includes('cer') ||
              h.includes('ripte')) &&
            !h.includes('variacion') &&
            !h.includes('variación') &&
            !h.includes('%')
        );

        if (idxFecha === -1 || idxValor === -1) {
          console.warn(`No se encontraron columnas fecha/valor para ${labelDebug || category}`);
          setter([]);
          return;
        }

        const arr = [];
        for (const row of rows) {
          const rawFecha = row[idxFecha];
          const rawVal = row[idxValor];
          if (!rawFecha || rawVal == null) continue;

          const fecha = parseFechaGeneric(rawFecha);
          const valor = parseNumberAR(rawVal);
          if (!fecha || valor == null || Number.isNaN(valor)) continue;

          arr.push({ fecha, valor });
        }

        arr.sort((a, b) => a.fecha - b.fecha);
        setter(arr);
      } catch (err) {
        console.error(`Error cargando índice ${labelDebug || category}:`, err);
        setter([]);
      }
    };

    loadSMVM();
    loadIndiceGenerico(ACTIVA_CATEGORY, setTasaActivaData, 'Tasa activa BNA');
    loadIndiceGenerico(PASIVA_CATEGORY, setTasaPasivaData, 'Tasa pasiva BCRA');
    loadIndiceGenerico(CER_CATEGORY, setCerData, 'CER');
    loadIndiceGenerico(RIPTE_CATEGORY, setRipteData, 'RIPTE');
  }, []);

  // KPIs SMVM cuando tengo datos
  useEffect(() => {
    if (!smvmData || !smvmKeys.length) return;

    const kLast = lastKey(smvmData);
    const ultVal = smvmData[kLast];

    const variacionRelativaMeses = (meses) => {
      if (!smvmData) return null;
      const endK = lastKey(smvmData);
      const endD = claveADate(endK);
      const refD = new Date(endD);
      refD.setMonth(refD.getMonth() - meses);
      const refK = keyOnOrBefore(smvmData, refD);
      if (!refK) return null;
      const vEnd = smvmData[endK];
      const vRef = smvmData[refK];
      if (!vEnd || !vRef) return null;
      return (vEnd / vRef - 1) * 100;
    };

    const var12 = variacionRelativaMeses(12);
    const var24 = variacionRelativaMeses(24);

    setSmvmKpiUltimo(ultVal);
    setSmvmKpiVar12(var12);
    setSmvmKpiVar24(var24);
    setSmvmKpiAct(`Última actualización: ${fmtClaveMes(kLast)}`);
  }, [smvmData, smvmKeys]);

  // Valor de SMVM a la fecha de egreso + ratio MRD / SMVM
  useEffect(() => {
    if (!smvmData || !fechaEgreso) return;

    const k = keyOnOrBefore(smvmData, new Date(fechaEgreso));
    if (!k) {
      setSmvmValorDespido(null);
      setSmvmClaveDespido('');
      setRatioMrdSmvm(null);
      return;
    }

    const val = smvmData[k];
    setSmvmValorDespido(val);
    setSmvmClaveDespido(k);

    const mrd = parseCurrencyValue(mrdInput);
    if (mrd && val) {
      setRatioMrdSmvm((mrd / val) * 100);
    } else {
      setRatioMrdSmvm(null);
    }
  }, [smvmData, fechaEgreso, mrdInput]);

  // ---------- lógica de antigüedad ----------
  const calcularAntiguedad = () => {
    if (!fechaIngreso || !fechaEgreso) return { añosAnt: 0, años: 0, meses: 0, dias: 0 };

    const dateIn = new Date(fechaIngreso);
    const dateEg = new Date(fechaEgreso);
    if (dateEg <= dateIn) return { añosAnt: 0, años: 0, meses: 0, dias: 0 };

    let tmp = new Date(dateIn);
    let cnt = 0;
    while (tmp <= dateEg) {
      tmp.setMonth(tmp.getMonth() + 1);
      if (tmp <= dateEg) cnt++;
    }
    const años = Math.floor(cnt / 12);
    const meses = cnt % 12;
    const aux = new Date(dateIn);
    aux.setFullYear(aux.getFullYear() + años);
    aux.setMonth(aux.getMonth() + meses);
    let dias = Math.floor((dateEg - aux) / (1000 * 3600 * 24));
    if (dias < 0) dias = 0;

    let añosAnt;
    if (trabajadorTemporada) {
      const mesesTrab = Number(mesesTemporada || 0);
      const añosEf = Math.floor(mesesTrab / 12);
      const resto = mesesTrab % 12;
      añosAnt = resto > 3 ? añosEf + 1 : añosEf;
      setAntiguedadTexto(
        `${añosAnt} año(s) indemnizatorios (sobre ${mesesTrab} meses efectivos trabajados).`
      );
    } else {
      añosAnt = meses > 3 || (meses === 3 && dias > 0) ? años + 1 : años;
      setAntiguedadTexto(
        `${años} años, ${meses} meses, ${dias} días (años indemnizatorios: ${añosAnt})`
      );
    }

    return { añosAnt, años, meses, dias };
  };

  // ---------- cálculo principal ----------
  const handleCalcular = () => {
    if (!fechaIngreso || !fechaEgreso) {
      alert('Seleccioná fecha de ingreso y egreso');
      return;
    }
    const { añosAnt, años, meses, dias } = calcularAntiguedad();
    const dateEg = new Date(fechaEgreso);

    const mrd = parseCurrencyValue(mrdInput);
    const pagoCuenta = chk.pagoCuenta ? parseCurrencyValue(pagoCuentaInput) : 0;

    const multiMat = chk.danioMaterial ? Number(multiDanioMaterial || 0) : 0;
    const multiMor = chk.danioMoral ? Number(multiDanioMoral || 0) : 0;

    const baseAntig = añosAnt * mrd;
    const indemnAntig = chk.antig ? baseAntig : 0;
    const indemn247 = chk.art247 ? baseAntig / 2 : 0;
    const baseInd = chk.art247 ? indemn247 : indemnAntig;

    const indemn182 = chk.art182 ? 13 * mrd : 0;

    const preaviso = chk.preaviso ? (años > 5 ? 2 * mrd : mrd) : 0;
    const sacPrev = chk.sacPreaviso ? preaviso / 12 : 0;

    const diasMes = diasEnMes(dateEg.getFullYear(), dateEg.getMonth());
    const dEg = dateEg.getDate(); // 1..31

    const diasTrab = chk.diasTrab ? (mrd / diasMes) * (dEg + 1) : 0;
    const integ = chk.integracion
      ? (mrd / diasMes) * Math.max(diasMes - dEg - 1, 0)
      : 0;
    const sacInteg = chk.sacIntegracion ? integ / 12 : 0;

    const indemnArt1 = chk.art1 ? baseInd : 0;
    const baseArt2 = baseInd + preaviso + sacPrev + integ + sacInteg;
    const indemnArt2 = chk.art2 ? 0.5 * baseArt2 : 0;
    const indemnArt80 = chk.art80 ? 3 * mrd : 0;

    // SAC proporcional
    let sacProp = 0;
    if (chk.sacProp) {
      const inicio =
        dateEg.getMonth() < 6
          ? new Date(dateEg.getFullYear(), 0, 1)
          : new Date(dateEg.getFullYear(), 6, 1);

      let diffDias = Math.floor((dateEg - inicio) / (1000 * 3600 * 24)) + 1;
      diffDias += 1; // +1 extra como en tu HTML
      const denom = inicio.getMonth() === 0 ? 182 : 183;
      sacProp = (mrd / 2) * (diffDias / denom);
    }

    // Vacaciones proporcionales + SAC vacaciones
    let vacProp = 0;
    let sacVac = 0;
    let diasVac = 0;
    let diasYear = 0;
    let diasVacProporc = 0;

    if (chk.vacProp) {
      diasVac =
        años < 5 ? 14 : años < 10 ? 21 : años < 20 ? 28 : 35;

      const inicioYear = new Date(dateEg.getFullYear(), 0, 1);
      diasYear =
        Math.floor((dateEg - inicioYear) / (1000 * 3600 * 24)) + 1;
      diasVacProporc = diasVac * (diasYear / 365) + 1;

      vacProp = (mrd / 25) * diasVacProporc;
      sacVac = chk.sacVac ? vacProp / 12 : 0;
    }

    // Daños
    const danioMaterial = mrd * multiMat;
    const danioMoral = mrd * multiMor;

    // Diferencias salariales
    let totalDif = 0;
    if (mostrarDif && difRows.length) {
      totalDif = difRows.reduce((acc, row) => {
        const dev = parseCurrencyValue(row.dev);
        const perc = parseCurrencyValue(row.perc);
        return acc + Math.max(dev - perc, 0);
      }, 0);
    }

    const totalBase =
      indemnAntig +
      indemn247 +
      preaviso +
      sacPrev +
      diasTrab +
      integ +
      sacInteg +
      indemnArt1 +
      indemnArt2 +
      indemnArt80 +
      sacProp +
      vacProp +
      sacVac +
      indemn182 +
      danioMaterial +
      danioMoral -
      pagoCuenta;

    const totalFinal = totalBase + totalDif;

    // 👉 guardo el total numérico para actualizarlo luego
    setTotalCalculado(totalFinal);

    if (onResultadoChange) {
      onResultadoChange({
        total: totalFinal,
        fechaIngreso,
        fechaEgreso,
      });
    }

    // ---------- resumen (ol) ----------
    const resumenItems = [];
    if (chk.antig) resumenItems.push(`Indemnización por despido: ${formatCurrencyValue(indemnAntig)}`);
    if (chk.art247) resumenItems.push(`Indemnización Art. 247 LCT: ${formatCurrencyValue(indemn247)}`);
    if (chk.preaviso) resumenItems.push(`Preaviso: ${formatCurrencyValue(preaviso)}`);
    if (chk.sacPreaviso) resumenItems.push(`SAC / Preaviso: ${formatCurrencyValue(sacPrev)}`);
    if (chk.diasTrab) resumenItems.push(`Días trabajados: ${formatCurrencyValue(diasTrab)}`);
    if (chk.integracion) resumenItems.push(`Integración mes de despido: ${formatCurrencyValue(integ)}`);
    if (chk.sacIntegracion) resumenItems.push(`SAC / Integración mes de despido: ${formatCurrencyValue(sacInteg)}`);
    if (chk.sacProp) resumenItems.push(`SAC proporcional: ${formatCurrencyValue(sacProp)}`);
    if (chk.vacProp) resumenItems.push(`Vacaciones proporcionales: ${formatCurrencyValue(vacProp)}`);
    if (chk.sacVac) resumenItems.push(`SAC / Vacaciones proporcionales: ${formatCurrencyValue(sacVac)}`);
    if (chk.art1) resumenItems.push(`Indemnización Art. 1 Ley 25.323: ${formatCurrencyValue(indemnArt1)}`);
    if (chk.art2) resumenItems.push(`Indemnización Art. 2 Ley 25.323: ${formatCurrencyValue(indemnArt2)}`);
    if (chk.art80) resumenItems.push(`Indemnización Art. 80 LCT: ${formatCurrencyValue(indemnArt80)}`);
    if (chk.art182) resumenItems.push(`Indemnización Art. 182 LCT: ${formatCurrencyValue(indemn182)}`);
    if (chk.danioMaterial) resumenItems.push(`Daño material: ${formatCurrencyValue(danioMaterial)}`);
    if (chk.danioMoral) resumenItems.push(`Daño moral: ${formatCurrencyValue(danioMoral)}`);
    if (chk.pagoCuenta) resumenItems.push(`Pago a cuenta: -${formatCurrencyValue(pagoCuenta)}`);
    if (mostrarDif && totalDif) resumenItems.push(`Total diferencias salariales: ${formatCurrencyValue(totalDif)}`);

    let resumen = '<ol>';
    resumenItems.forEach((l) => {
      resumen += `<li>${l}</li>`;
    });
    resumen += `</ol><hr/><div style="text-align:center;font-weight:bold;">Total a pagar: ${formatCurrencyValue(
      totalFinal
    )}</div>`;

    setResumenHTML(resumen);

// ---------- detalle (texto + tabla dif) ----------
let det = `<div class="space-y-4">`;
det += `<h2 class="text-lg font-semibold text-[#0f2f4b] mb-2">Detalle de cálculos</h2>`;

// Antigüedad (detalle estilo borrador)
if (chk.antig) {
  det += `<p><strong>Antigüedad:</strong><br>
    Años reales: ${años}, Meses: ${meses}, Días: ${dias}.<br>
    (Se adiciona 1 año por fracción mayor a 3 meses).<br>
    Años para indemnización: ${añosAnt}.<br>
    Indemnización por despido = ${añosAnt} × ${formatCurrencyValue(mrd)} 
    = <strong>${formatCurrencyValue(indemnAntig)}</strong>
  </p>`;
}

// Art. 247 (detalle estilo borrador)
if (chk.art247) {
  det += `<p><strong>Art. 247 LCT:</strong><br>
    Indemnización antigüedad / 2 = 
    ${formatCurrencyValue(indemnAntig)} / 2 
    = <strong>${formatCurrencyValue(indemn247)}</strong>
  </p>`;
}

    // PREAVISO
    if (chk.preaviso) {
      const factorPreav = años > 5 ? 2 : 1;
      det += `<p><strong>Preaviso:</strong><br/>
        Antigüedad: ${años} año(s). Corresponde ${factorPreav} mes(es) de preaviso (${
          años > 5 ? 'más de 5 años de antigüedad' : 'hasta 5 años de antigüedad'
        }).<br/>
        Base indemnizatoria (MRD): ${formatCurrencyValue(mrd)}.<br/>
        Indemnización por preaviso: ${factorPreav} × ${formatCurrencyValue(mrd)} 
        = <strong>${formatCurrencyValue(preaviso)}</strong>${
          chk.sacPreaviso
            ? `<br/>SAC sobre preaviso: ${formatCurrencyValue(preaviso)} / 12 
              = <strong>${formatCurrencyValue(sacPrev)}</strong>`
            : ''
        }
      </p>`;
    }

    // DÍAS TRABAJADOS DEL MES DEL DESPIDO
    if (chk.diasTrab) {
      const diasTrabajados = dEg + 1; // del 1 al día de egreso inclusive
      det += `<p><strong>Días trabajados en el mes del despido:</strong><br/>
        Días trabajados: ${diasTrabajados} sobre ${diasMes} días del mes.<br/>
        Valor día: MRD / ${diasMes} = ${formatCurrencyValue(
          mrd / diasMes
        )}.<br/>
        Importe días trabajados: (${formatCurrencyValue(mrd)} / ${diasMes}) × ${diasTrabajados} 
        = <strong>${formatCurrencyValue(diasTrab)}</strong>
      </p>`;
    }

    // INTEGRACIÓN MES DESPIDO
    if (chk.integracion) {
      const faltan = Math.max(diasMes - dEg - 1, 0); // días desde el día siguiente al despido hasta fin de mes
      det += `<p><strong>Integración del mes de despido:</strong><br/>
        Días faltantes hasta fin de mes: ${faltan}.<br/>
        Valor día: MRD / ${diasMes} = ${formatCurrencyValue(
          mrd / diasMes
        )}.<br/>
        Integración: (${formatCurrencyValue(mrd)} / ${diasMes}) × ${faltan} 
        = <strong>${formatCurrencyValue(integ)}</strong>${
          chk.sacIntegracion
            ? `<br/>SAC sobre integración: ${formatCurrencyValue(integ)} / 12 
              = <strong>${formatCurrencyValue(sacInteg)}</strong>`
            : ''
        }
      </p>`;
    }

    // SAC PROPORCIONAL
    if (chk.sacProp) {
      det += `<p><strong>SAC proporcional:</strong><br/>
        Calculado sobre la mejor remuneración devengada (MRD) en el semestre y la fracción trabajada.<br/>
        Resultado: <strong>${formatCurrencyValue(sacProp)}</strong>
      </p>`;
    }

    // VACACIONES PROPORCIONALES
    if (chk.vacProp) {
      det += `<p><strong>Vacaciones proporcionales:</strong><br/>
        Días de vacaciones que corresponden por antigüedad: ${diasVac}.<br/>
        Días proporcionales por tiempo trabajado en el año: ${diasVacProporc.toFixed(
          2
        )}.<br/>
        Valor día de vacaciones: MRD / ${diasMes} = ${formatCurrencyValue(
          mrd / diasMes
        )}.<br/>
        Vacaciones proporcionales: ${diasVacProporc.toFixed(2)} × (MRD / ${diasMes}) 
        = <strong>${formatCurrencyValue(vacProp)}</strong>${
          chk.sacVac
            ? `<br/>SAC sobre vacaciones proporcionales: ${formatCurrencyValue(
                vacProp
              )} / 12 = <strong>${formatCurrencyValue(sacVac)}</strong>`
            : ''
        }
      </p>`;
    }

    // ART. 1 LEY 25.323
    if (chk.art1) {
      det += `<p><strong>Art. 1 Ley 25.323:</strong><br/>
        Incremento sobre la indemnización base por despido injustificado.<br/>
        Base considerada: ${formatCurrencyValue(baseInd)}.<br/>
        Resultado: <strong>${formatCurrencyValue(indemnArt1)}</strong>
      </p>`;
    }

    // ART. 2 LEY 25.323
    if (chk.art2) {
      det += `<p><strong>Art. 2 Ley 25.323:</strong><br/>
        Incremento por falta de pago en término de las indemnizaciones.<br/>
        Base considerada: ${formatCurrencyValue(baseArt2)}.<br/>
        50% de la base: <strong>${formatCurrencyValue(indemnArt2)}</strong>
      </p>`;
    }

    // ART. 80 LCT
    if (chk.art80) {
      det += `<p><strong>Art. 80 LCT:</strong><br/>
        Indemnización por falta de entrega de certificados de trabajo.<br/>
        Fórmula: 3 × MRD = 3 × ${formatCurrencyValue(
          mrd
        )} = <strong>${formatCurrencyValue(indemnArt80)}</strong>
      </p>`;
    }

    // ART. 182 LCT
    if (chk.art182) {
      det += `<p><strong>Art. 182 LCT:</strong><br/>
        Indemnización especial (embarazo / matrimonio), equivalente a un año de remuneraciones.<br/>
        Fórmula: 13 × MRD = 13 × ${formatCurrencyValue(
          mrd
        )} = <strong>${formatCurrencyValue(indemn182)}</strong>
      </p>`;
    }

    // DAÑO MATERIAL
    if (chk.danioMaterial) {
      det += `<p><strong>Daño material:</strong><br/>
        Multiplicador aplicado sobre MRD: ${multiMat}.<br/>
        MRD × ${multiMat} = <strong>${formatCurrencyValue(danioMaterial)}</strong>
      </p>`;
    }

    // DAÑO MORAL
    if (chk.danioMoral) {
      det += `<p><strong>Daño moral:</strong><br/>
        Multiplicador aplicado sobre MRD: ${multiMor}.<br/>
        MRD × ${multiMor} = <strong>${formatCurrencyValue(danioMoral)}</strong>
      </p>`;
    }

    // PAGO A CUENTA
    if (chk.pagoCuenta) {
      det += `<p><strong>Pago a cuenta / suma ya abonada:</strong><br/>
        Se descuenta del total regulado: -<strong>${formatCurrencyValue(
          pagoCuenta
        )}</strong>
      </p>`;
    }

    if (mostrarDif && difRows.length) {
      det += `<h3 class="mt-4 font-semibold">Diferencias salariales</h3>
        <table class="w-full text-sm border-collapse border border-slate-200 mt-2">
          <thead class="bg-slate-50">
            <tr>
              <th class="border border-slate-200 px-2 py-1">Mes</th>
              <th class="border border-slate-200 px-2 py-1">Rem. devengada</th>
              <th class="border border-slate-200 px-2 py-1">Rem. percibida</th>
              <th class="border border-slate-200 px-2 py-1">Diferencia</th>
            </tr>
          </thead>
          <tbody>`;
      difRows.forEach((row) => {
        const dev = parseCurrencyValue(row.dev);
        const perc = parseCurrencyValue(row.perc);
        const df = Math.max(dev - perc, 0);
        det += `<tr>
          <td class="border border-slate-200 px-2 py-1">${row.mes || ''}</td>
          <td class="border border-slate-200 px-2 py-1">${formatCurrencyValue(dev)}</td>
          <td class="border border-slate-200 px-2 py-1">${formatCurrencyValue(perc)}</td>
          <td class="border border-slate-200 px-2 py-1">${formatCurrencyValue(df)}</td>
        </tr>`;
      });
      det += `</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="border border-slate-200 px-2 py-1 text-right font-semibold">Total</td>
              <td class="border border-slate-200 px-2 py-1 font-semibold">${formatCurrencyValue(
                totalDif
              )}</td>
            </tr>
          </tfoot>
        </table>`;
    }

    det += `</div>`;
    setDetalleHTML(det);
  };

  // ---------- helpers UI ----------
  const toggleChk = (key) => {
    setChk((prev) => {
      const newVal = !prev[key];
      const updated = { ...prev, [key]: newVal };

      // Dependencias automáticas
      if (key === 'preaviso' && !newVal) {
        updated.sacPreaviso = false;
      }
      if (key === 'integracion' && !newVal) {
        updated.sacIntegracion = false;
      }
      if (key === 'vacProp' && !newVal) {
        updated.sacVac = false;
      }
      if (key === 'art247') {
        if (newVal) {
          updated.antig = false;
          updated.art1 = false;
          updated.art2 = false;
        } else {
          updated.antig = true;
        }
      }
      if (key === 'pagoCuenta' && !newVal) {
        setPagoCuentaInput('');
      }
      if (key === 'danioMaterial' && newVal && !multiDanioMaterial) {
        setMultiDanioMaterial('1');
      }
      if (key === 'danioMoral' && newVal && !multiDanioMoral) {
        setMultiDanioMoral('1');
      }

      return updated;
    });
  };

  const addDifRow = () => {
    setDifRows((prev) => [
      ...prev,
      { id: Date.now(), mes: '', dev: '', perc: '' },
    ]);
  };

  const updateDifRow = (id, field, value) => {
    setDifRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeDifRow = (id) => {
    setDifRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Nota MRD vs SMVM
  const mrdSmvmBadge =
    ratioMrdSmvm == null
      ? null
      : `${nfPct.format(ratioMrdSmvm)}% del SMVM`;

// ---------- NUEVO: cálculo del ajuste del total por índice ----------
useEffect(() => {
  if (!totalCalculado || indiceSeleccionado === 'ninguno') {
    setAjusteTotal(null);
    setAjusteError('');
    return;
  }

  if (!fechaAjusteDesde || !fechaAjusteHasta) {
    setAjusteTotal(null);
    setAjusteError('');
    return;
  }

  const desde = new Date(fechaAjusteDesde);
  const hasta = new Date(fechaAjusteHasta);

  if (hasta < desde) {
    setAjusteTotal(null);
    setAjusteError(
      'La fecha final debe ser posterior a la fecha de inicio del período de actualización.'
    );
    return;
  }

  let indiceInicio = null;
  let indiceFin = null;
  let variacionPct = 0;
  let factor = 1;

  // 👉 fecha REAL del último dato disponible
  let fechaFinReal = null;

  try {
    // ======================= TASA ACTIVA BNA =======================
    if (indiceSeleccionado === 'tasa_activa_bna') {
      if (!tasaActivaData.length) {
        setAjusteError('No hay datos de Tasa activa BNA para el período seleccionado.');
        setAjusteTotal(null);
        return;
      }

      indiceInicio = findIndiceOnOrBefore(tasaActivaData, desde);
      indiceFin = findIndiceOnOrBefore(tasaActivaData, hasta);

      if (!indiceInicio || !indiceFin) {
        setAjusteError('No se encontraron índices de Tasa activa BNA para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      variacionPct = indiceFin.valor - indiceInicio.valor;
      factor = 1 + variacionPct / 100;
      fechaFinReal = indiceFin.fecha;
    }

    // ======================= TASA PASIVA BCRA =======================
    else if (indiceSeleccionado === 'tasa_pasiva_bcra') {
      if (!tasaPasivaData.length) {
        setAjusteError('No hay datos de Tasa pasiva promedio BCRA para el período seleccionado.');
        setAjusteTotal(null);
        return;
      }

      indiceInicio = findIndiceOnOrBefore(tasaPasivaData, desde);
      indiceFin = findIndiceOnOrBefore(tasaPasivaData, hasta);

      if (!indiceInicio || !indiceFin) {
        setAjusteError('No se encontraron índices de Tasa pasiva promedio BCRA para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      variacionPct =
        ((100 + indiceFin.valor) / (100 + indiceInicio.valor) - 1) * 100;
      factor = 1 + variacionPct / 100;
      fechaFinReal = indiceFin.fecha;
    }

    // ============================== CER =============================
    else if (indiceSeleccionado === 'cer') {
      if (!cerData.length) {
        setAjusteError('No hay datos de CER para el período seleccionado.');
        setAjusteTotal(null);
        return;
      }

      indiceInicio = findIndiceOnOrBefore(cerData, desde);
      indiceFin = findIndiceOnOrBefore(cerData, hasta);

      if (!indiceInicio || !indiceFin) {
        setAjusteError('No se encontraron índices CER para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      variacionPct = ((indiceFin.valor / indiceInicio.valor) - 1) * 100;
      factor = 1 + variacionPct / 100;
      fechaFinReal = indiceFin.fecha;
    }

    // ============================= RIPTE ============================
    else if (indiceSeleccionado === 'ripte') {
      if (!ripteData.length) {
        setAjusteError('No hay datos de RIPTE para el período seleccionado.');
        setAjusteTotal(null);
        return;
      }

      indiceInicio = findIndiceOnOrBefore(ripteData, desde);
      indiceFin = findIndiceOnOrBefore(ripteData, hasta);

      if (!indiceInicio || !indiceFin) {
        setAjusteError('No se encontraron índices RIPTE para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      variacionPct = ((indiceFin.valor / indiceInicio.valor) - 1) * 100;
      factor = 1 + variacionPct / 100;
      fechaFinReal = endOfMonth(indiceFin.fecha);
    }

    // ============================== SMVM ============================
    else if (indiceSeleccionado === 'smvm') {
      if (!smvmData || !Object.keys(smvmData).length) {
        setAjusteError('No hay datos de SMVM para el período seleccionado.');
        setAjusteTotal(null);
        return;
      }

      const startKey = keyOnOrBefore(smvmData, desde);
      const endKey = keyOnOrBefore(smvmData, hasta);

      if (!startKey || !endKey) {
        setAjusteError('No se encontraron valores de SMVM para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      const vInicio = smvmData[startKey];
      const vFin = smvmData[endKey];

      if (!vInicio || !vFin) {
        setAjusteError('No se pudieron leer los valores de SMVM para las fechas seleccionadas.');
        setAjusteTotal(null);
        return;
      }

      variacionPct = ((vFin / vInicio) - 1) * 100;
      const dEnd = claveADate(endKey);
      fechaFinReal = endOfMonth(dEnd);
    }

    // ========================== NINGUNO / OTRO ======================
    else {
      setAjusteError('');
      setAjusteTotal(null);
      return;
    }

    const montoAjustado = totalCalculado * factor;

    setAjusteError('');
    setAjusteTotal({
      tipo: indiceSeleccionado,
      desde: fechaAjusteDesde,
      hasta: fechaAjusteHasta,
      fechaFinReal: fechaFinReal
        ? fechaFinReal.toISOString().slice(0, 10)
        : null,
      variacionPct,
      montoAjustado,
    });
  } catch (err) {
    console.error('Error calculando ajuste del total:', err);
    setAjusteError('Error al calcular la actualización.');
    setAjusteTotal(null);
  }
}, [
  totalCalculado,
  indiceSeleccionado,
  fechaAjusteDesde,
  fechaAjusteHasta,
  tasaActivaData,
  tasaPasivaData,
  cerData,
  ripteData,
  smvmData,
]);

const labelIndiceHumano = (tipo) => {
  switch (tipo) {
    case 'tasa_activa_bna':
      return 'Tasa activa BNA a 30 días';
    case 'tasa_pasiva_bcra':
      return 'Tasa pasiva promedio BCRA';
    case 'cer':
      return 'CER';
    case 'ripte':
      return 'RIPTE';
    case 'smvm':
      return 'SMVM';
    default:
      return '';
  }
};

  // ---------- JSX ----------
  return (
  <>
    {/* Bloque explicativo independiente */}
    <div className="max-w-5xl mx-auto mb-6 rounded-2xl bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white px-6 py-4 md:py-5 text-center shadow-md">
      <h2 className="text-lg md:text-xl font-bold mb-1">
        ¿Cómo usar esta herramienta?
      </h2>

      <p className="text-sm md:text-base leading-relaxed opacity-90">
        🔢 <strong>Paso 1:</strong> Ingresa los datos, selecciona los rubros, descuenta montos recibidos 
        y calcula la indemnización por despido y/o liquidación final.
      </p>

      <p className="text-sm md:text-base leading-relaxed mt-2 opacity-90">
        📅 <strong>Paso 2:</strong> Actualiza dicho monto por variación de tasa activa BNA a 30 días,
        tasa pasiva promedio BCRA, SMVM, IPC Nivel General, CER y RIPTE, desde y hasta fecha deseadas.
      </p>

      <p className="text-[0.7rem] md:text-xs mt-3 opacity-70">
        Fuente: Subsecretaría de Seguridad Social, Consejo SMVM, Banco Nación, BCRA e INDEC<br/>
        <a href="https://www.indec.gob.ar/" className="underline text-blue-200">INDEC</a> ·
        <a href="https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp" className="underline text-blue-200 ml-1">BCRA</a> ·
        <a href="https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero" className="underline text-blue-200 ml-1">Banco Nación</a> ·
        <a href="https://www.argentina.gob.ar/trabajo/consejodelsalario" className="underline text-blue-200 ml-1">Consejo SMVM</a> ·
        <a href="https://www.argentina.gob.ar/trabajo/seguridadsocial/ripte" className="underline text-blue-200 ml-1">RIPTE</a>
      </p>
    </div>

<div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">

      {/* Tabs Paso 1 / Paso 2 */}
      <div className="flex mb-6 bg-slate-100 rounded-full p-1">
        <button
          type="button"
          onClick={() => setTab('paso1')}
          className={`flex-1 px-3 py-2 text-xs md:text-sm font-semibold rounded-full transition
            ${
              tab === 'paso1'
                ? 'bg-white text-[#0f2f4b] shadow-sm'
                : 'bg-transparent text-slate-500 hover:text-[#0f2f4b]'
            }`}
        >
          Paso 1: Calcular indemnización / liquidación final
        </button>
        <button
          type="button"
          onClick={() => setTab('paso2')}
          className={`flex-1 px-3 py-2 text-xs md:text-sm font-semibold rounded-full transition
            ${
              tab === 'paso2'
                ? 'bg-white text-[#0f2f4b] shadow-sm'
                : 'bg-transparent text-slate-500 hover:text-[#0f2f4b]'
            }`}
        >
          Paso 2: Actualizar monto por índices
        </button>
      </div>

      {/* ================== PASO 1 ================== */}
      {tab === 'paso1' && (
        <>
          <h1 className="text-2xl font-extrabold text-[#0f2f4b] text-center mb-2">
            Paso 1️⃣: Calcular Indemnización y/o Liquidación Final
          </h1>

          {/* Fechas + antigüedad + temporada */}
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f2f4b]">
                Fecha de ingreso
              </label>
              <input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f2f4b]">
                Fecha de egreso
              </label>
              <input
                type="date"
                value={fechaEgreso}
                onChange={(e) => setFechaEgreso(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f2f4b]">
                Antigüedad (Años, Meses, Días)
              </label>
              <input
                type="text"
                value={antiguedadTexto}
                readOnly
                className="w-full rounded-lg border px-3 py-2 text-xs bg-slate-100"
              />
            </div>
          </div>

          {/* Toggle temporada */}
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#0f2f4b]">
              <input
                type="checkbox"
                checked={trabajadorTemporada}
                onChange={(e) => setTrabajadorTemporada(e.target.checked)}
              />
              Trabajador de temporada
            </label>
            {trabajadorTemporada && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f2f4b]">
                  Meses efectivamente trabajados (total)
                </label>
                <input
                  type="number"
                  value={mesesTemporada}
                  onChange={(e) => setMesesTemporada(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Ej: 18"
                />
              </div>
            )}
          </div>

          {/* MRD + nota SMVM */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-[#0f2f4b]">
              Mejor Remuneración Devengada (MRD)
            </label>
            <input
              type="text"
              value={mrdInput}
              onChange={(e) => setMrdInput(formatCurrencyInput(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {mrdSmvmBadge && smvmValorDespido && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-[#0f2f4b] text-white">
                <span className="font-semibold">
                  {mrdSmvmBadge}
                </span>
                <span className="text-blue-100">
                  (SMVM aplicado {fmtClaveMes(smvmClaveDespido)}:{' '}
                  {formatCurrencyValue(smvmValorDespido)})
                </span>
              </div>
            )}
          </div>

          {/* Botón mostrar/ocultar SMVM */}
          <button
            type="button"
            onClick={() => setMostrarSMVMPanel((v) => !v)}
            className="mt-5 text-xs px-3 py-1 rounded-full border border-[#0f2f4b] text-[#0f2f4b] hover:bg-[#0f2f4b] hover:text-white transition"
          >
            {mostrarSMVMPanel ? 'Ocultar' : 'Ver evolución SMVM'}
          </button>

          {/* Panel SMVM */}
          {mostrarSMVMPanel && (
            <div className="mt-5 border rounded-xl p-4 bg-slate-50/70">
              <div className="flex items-center justify-between mb-2 gap-3">
                <div>
                  <div className="text-xs text-slate-600">
                    SMVM a la fecha de despido
                  </div>
                  <div className="font-bold text-[#0f2f4b]">
                    {smvmValorDespido
                      ? formatCurrencyValue(smvmValorDespido)
                      : '—'}
                  </div>
                  <div className="text-[0.7rem] text-slate-500">
                    {smvmClaveDespido
                      ? `Mes aplicado: ${fmtClaveMes(smvmClaveDespido)}`
                      : 'Seleccioná la fecha de egreso.'}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="w-40">
                    <label className="text-xs text-slate-500">
                      Ventana
                    </label>
                    <select
                      value={smvmWindow}
                      onChange={(e) => setSmvmWindow(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="1y">Último año</option>
                      <option value="3y">Últimos 3 años</option>
                      <option value="5y">Últimos 5 años</option>
                      <option value="all">Todo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Gráfico SMVM */}
              <div className="w-full h-56 md:h-72 border rounded-lg bg-white p-2">
                {smvmLoaded && smvmChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={smvmChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) =>
                          new Intl.NumberFormat('es-AR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(v)
                        }
                      />
                      <RechartsTooltip
                        formatter={(v) => formatCurrencyValue(v)}
                        labelFormatter={(label) => `Mes: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="#0f2f4b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#5EA6D7' }}
                        activeDot={{ r: 5, fill: '#0f2f4b' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    {smvmLoaded ? 'Sin datos para mostrar' : 'Cargando SMVM...'}
                  </div>
                )}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">Último valor</div>
                  <div className="font-semibold text-[#0f2f4b]">
                    {smvmKpiUltimo ? formatCurrencyValue(smvmKpiUltimo) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Variación 12m</div>
                  <div className="font-semibold text-[#0f2f4b]">
                    {smvmKpiVar12 == null
                      ? '—'
                      : `${nfPct.format(smvmKpiVar12)}%`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Variación 24m</div>
                  <div className="font-semibold text-[#0f2f4b]">
                    {smvmKpiVar24 == null
                      ? '—'
                      : `${nfPct.format(smvmKpiVar24)}%`}
                  </div>
                </div>
              </div>
              <div className="mt-1 text-[0.7rem] text-slate-500">
                {smvmKpiAct}
              </div>
            </div>
          )}

          {/* Rubros */}
          <div className="mt-6">
            <div className="font-semibold text-sm text-[#0f2f4b] mb-2">
              Seleccioná los rubros a incluir:
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ['antig', 'Indemnización art. 245 LCT'],
                ['art247', 'Indemnización art. 247 LCT'],
                ['preaviso', 'Preaviso'],
                ['sacPreaviso', 'SAC / Preaviso'],
                ['diasTrab', 'Días trabajados'],
                ['integracion', 'Integración mes de despido'],
                ['sacIntegracion', 'SAC / Integración'],
                ['sacProp', 'SAC proporcional'],
                ['vacProp', 'Vacaciones proporcionales'],
                ['sacVac', 'SAC / Vacaciones prop.'],
                ['art182', 'Indemnización art. 182 LCT'],
                ['art1', 'Indemn. art. 1 Ley 25.323'],
                ['art2', 'Indemn. art. 2 Ley 25.323'],
                ['art80', 'Indemn. art. 80 LCT'],
              ].map(([k, label]) => (
                <label
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={!!chk[k]}
                    onChange={() => toggleChk(k)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Daños + pago a cuenta */}
          <div className="mt-4 grid md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 font-semibold text-[#0f2f4b]">
                <input
                  type="checkbox"
                  checked={chk.danioMaterial}
                  onChange={() => toggleChk('danioMaterial')}
                />
                Daño material (xveces MRD)
              </label>
              {chk.danioMaterial && (
                <input
                  type="number"
                  value={multiDanioMaterial}
                  onChange={(e) => setMultiDanioMaterial(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  placeholder="Veces MRD"
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 font-semibold text-[#0f2f4b]">
                <input
                  type="checkbox"
                  checked={chk.danioMoral}
                  onChange={() => toggleChk('danioMoral')}
                />
                Daño moral (xveces MRD)
              </label>
              {chk.danioMoral && (
                <input
                  type="number"
                  value={multiDanioMoral}
                  onChange={(e) => setMultiDanioMoral(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  placeholder="Veces MRD"
                />
              )}
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-2 font-semibold text-[#0f2f4b]">
                <input
                  type="checkbox"
                  checked={chk.pagoCuenta}
                  onChange={() => toggleChk('pagoCuenta')}
                />
                Pago a cuenta
              </label>
              {chk.pagoCuenta && (
                <input
                  type="text"
                  value={pagoCuentaInput}
                  onChange={(e) =>
                    setPagoCuentaInput(formatCurrencyInput(e.target.value))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                  placeholder="$0,00"
                />
              )}
            </div>
          </div>

          {/* Diferencias salariales */}
          <div className="mt-5 text-xs">
            <button
              type="button"
              className="text-blue-600 font-semibold"
              onClick={() => setMostrarDif(true)}
            >
              + Agregar diferencias salariales
            </button>

            {mostrarDif && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1 rounded-full bg-[#0f2f4b] text-white"
                  onClick={addDifRow}
                >
                  + Agregar mes
                </button>

                <table className="w-full text-xs border-collapse border border-slate-200 mt-2">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-2 py-1">Mes</th>
                      <th className="border border-slate-200 px-2 py-1">
                        Rem. devengada
                      </th>
                      <th className="border border-slate-200 px-2 py-1">
                        Rem. percibida
                      </th>
                      <th className="border border-slate-200 px-2 py-1">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {difRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-slate-200 px-2 py-1">
                          <input
                            type="month"
                            value={row.mes}
                            onChange={(e) =>
                              updateDifRow(row.id, 'mes', e.target.value)
                            }
                            className="w-full rounded border px-2 py-1"
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1">
                          <input
                            type="text"
                            value={row.dev}
                            onChange={(e) =>
                              updateDifRow(
                                row.id,
                                'dev',
                                formatCurrencyInput(e.target.value)
                              )
                            }
                            className="w-full rounded border px-2 py-1 text-right"
                            placeholder="$0,00"
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1">
                          <input
                            type="text"
                            value={row.perc}
                            onChange={(e) =>
                              updateDifRow(
                                row.id,
                                'perc',
                                formatCurrencyInput(e.target.value)
                              )
                            }
                            className="w-full rounded border px-2 py-1 text-right"
                            placeholder="$0,00"
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeDifRow(row.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

{/* Botón calcular */}
<div className="mt-6 flex flex-wrap gap-3">
  <button
    type="button"
    onClick={handleCalcular}
    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#0f2f4b] text-white font-semibold text-sm"
  >
    Calcular
  </button>
</div>

          {/* Resultado */}
          {resumenHTML && (
            <div
              ref={resultadoRef}
              className="mt-6 bg-white border rounded-xl p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: resumenHTML }}
            />
          )}

          {/* Detalle */}
          {detalleHTML && (
            <div
              ref={detalleRef}
              className="mt-6 bg-white border rounded-xl p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: detalleHTML }}
            />
          )}
        </>
      )}

      {/* ================== PASO 2 ================== */}
      {tab === 'paso2' && (
        <>
          <h2 className="text-xl font-extrabold text-[#0f2f4b] text-center mb-4">
            Paso 2️⃣: Actualizar el monto calculado
          </h2>

          {totalCalculado == null ? (
            <div className="text-sm text-slate-600 text-center">
              Primero calculá la indemnización en el Paso 1.
            </div>
          ) : (
            <div className="border rounded-xl p-4 md:p-5 bg-slate-50/60 space-y-5 text-sm">
              {/* Total original */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs md:text-sm">
                    Total original (Paso 1):
                  </span>
                  <span className="font-semibold text-[#0f2f4b] text-sm md:text-base">
                    {formatCurrencyValue(totalCalculado)}
                  </span>
                </div>
                <div className="text-[0.75rem] text-slate-500">
                  Fecha de inicio del período de actualización:{' '}
                  {fechaAjusteDesde ? fmtFechaYMD(fechaAjusteDesde) : '—'}
                </div>
              </div>

              {/* 1) Botonera de tipo de tasa (idéntica a Actualizar capital 1) */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#0f2f4b]">
                  Tipo de tasa / índice
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    {
                      value: 'tasa_activa_bna',
                      label: 'Tasa activa BNA',
                    },
                    {
                      value: 'tasa_pasiva_bcra',
                      label: 'Tasa pasiva promedio BCRA',
                    },
                    { value: 'cer', label: 'CER' },
                    { value: 'smvm', label: 'SMVM' },
                    { value: 'ripte', label: 'RIPTE' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setIndiceSeleccionado(opt.value)}
                      className={`
                        w-full px-3 py-2 rounded-xl text-xs md:text-sm font-semibold border transition-all
                        ${
                          indiceSeleccionado === opt.value
                            ? 'bg-[#E8F4FB] text-[#0f2f4b] border-[#0f2f4b] shadow-[0_0_0_1px_rgba(15,47,75,0.4)]'
                            : 'bg-white text-[#0f2f4b] border-[#D0E4F4] hover:bg-[#F3F8FC] hover:border-[#5EA6D7]'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500">
                  Hacé clic para elegir la serie que se usará para actualizar el monto del Paso 1.
                </p>
              </div>

              {/* 2) Fechas en orientación vertical */}
              <div className="space-y-4 mt-4">
                {/* Fecha desde (EDITABLE) */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-semibold">
                    Fecha desde
                  </label>
                  <input
                    type="date"
                    value={fechaAjusteDesde}
                    onChange={(e) => setFechaAjusteDesde(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs bg-white"
                  />
                  <p className="text-[0.65rem] text-slate-500">
                    Podés usar la fecha de egreso u otra fecha desde la cual quieras actualizar.
                  </p>
                </div>

                {/* Fecha hasta */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-semibold">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={fechaAjusteHasta}
                    onChange={(e) => setFechaAjusteHasta(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs bg-white"
                  />
                  <p className="text-[0.65rem] text-slate-500">
                    Usá hoy o la fecha de corte que quieras para el cálculo.
                  </p>
                </div>
              </div>

              {/* Errores */}
              {ajusteError && (
                <div className="mt-1 text-[0.75rem] text-red-600">
                  {ajusteError}
                </div>
              )}

              {/* Resultado estilo banner HERO */}
              {ajusteTotal && !ajusteError && (
                <div className="mt-3 rounded-2xl bg-gradient-to-r from-[#0f2f4b] to-[#0f2f4b] text-white px-6 py-4 md:py-5 text-center shadow-md">
                  <div className="text-[0.75rem] md:text-xs font-semibold tracking-[0.15em] uppercase opacity-90">
                    Monto actualizado
                  </div>
                  <div className="mt-1 text-2xl md:text-3xl font-extrabold">
                    {formatCurrencyValue(ajusteTotal.montoAjustado)}
                  </div>
                  <div className="mt-1 text-[0.75rem] md:text-xs opacity-90">
                    Capital regulado + actualización por{' '}
                    {labelIndiceHumano(ajusteTotal.tipo)} al{' '}
                    {ajusteTotal.fechaFinReal
                      ? fmtFechaYMD(ajusteTotal.fechaFinReal)
                      : fechaAjusteHasta
                        ? fmtFechaYMD(fechaAjusteHasta)
                        : '—'}
                    .
                  </div>
                  <div className="mt-2 flex flex-col md:flex-row gap-1 md:gap-3 justify-center text-[0.7rem] md:text-xs opacity-90">
                    <span>
                      Índice aplicado: {labelIndiceHumano(ajusteTotal.tipo)}
                    </span>
                    <span className="hidden md:inline">•</span>
                    <span>
                      Variación acumulada:{' '}
                      {nfPct.format(ajusteTotal.variacionPct)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Mensaje si falta elegir algo */}
              {!ajusteTotal && !ajusteError && (
                <p className="mt-2 text-[0.7rem] text-slate-400">
                  Elegí un tipo de tasa y la fecha hasta para ver el monto
                  actualizado.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
  }