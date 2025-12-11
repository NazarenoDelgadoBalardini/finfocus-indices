import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { FinancialData } from '@/entities/FinancialData';

// ======================
// CONFIG GENERAL
// ======================
const QUOTES_SOURCES = [
  { name: 'bonds', url: 'https://data912.com/live/arg_bonds' },
  { name: 'corp', url: 'https://data912.com/live/arg_corp' },
];

const TARGET_YIELDS = [8, 9, 10, 11, 12, 13, 14]; // % anual

// ======================
// ESTADO GLOBAL (fuera del componente)
// ======================
let rows = [];
let byTicker = {};
let metaTicker = {};
let leyPorTicker = {};
let mapsUSD = { mapARS2USD: new Map(), mapUSD2USD: new Map(), mapUSD2ARS: new Map() };
let quotes = {};

// ======================
// HELPERS HEADERS / COLUMNAS (tipo FINFOCUSPLUS)
// ======================
function normalizeHeaderName(s) {
  if (!s) return '';
  return s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca tildes
    .toLowerCase()
    .trim();
}

function findCol(headers = [], targetLabel) {
  const targetNorm = normalizeHeaderName(targetLabel);
  // 1) match exacto
  let idx = headers.findIndex(
    (h) => normalizeHeaderName(h) === targetNorm
  );
  if (idx !== -1) return idx;

  // 2) fallback por "includes"
  idx = headers.findIndex((h) =>
    normalizeHeaderName(h).includes(targetNorm)
  );
  return idx;
}

// ======================
// HELPERS NÚMEROS / FECHAS
// ======================
function parseNumberCell(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s === '' || s === '-') return 0;
  // sacamos símbolos raros, dejamos dígitos, puntos, comas y signo
  s = s.replace(/[^\d.,\-]/g, '');
  // estilo AR: 1.234,56
  s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const M = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3].length === 2 ? '20' + m[3] : m[3], 10);
    return new Date(y, M, d);
  }
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? null : dt;
}

function fmtPerc(x) {
  if (x == null || !isFinite(x)) return '—';
  const n = Number(x);
  return n.toFixed(2).replace('.', ',') + '%';
}

function fmtPercSigned(x) {
  if (x == null || !isFinite(x)) return '—';
  const n = Number(x);
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2).replace('.', ',') + '%';
}

// ======================
// MAPS USD / TICKERS
// ======================
function buildARSUSDMap() {
  const mapARS2USD = new Map();
  const mapUSD2USD = new Map();
  const mapUSD2ARS = new Map();

  rows.forEach((r) => {
    const ars = (r.tickerARS || '').trim();
    const usd = (r.tickerUSD || '').trim();
    if (ars && usd) {
      mapARS2USD.set(ars, usd);
      if (!mapUSD2ARS.has(usd)) mapUSD2ARS.set(usd, ars);
    }
    if (usd) mapUSD2USD.set(usd, usd);
  });
  return { mapARS2USD, mapUSD2USD, mapUSD2ARS };
}

function resolveUSDFor(ticker) {
  const t = (ticker || '').trim();
  if (!t) return '';
  if (mapsUSD.mapUSD2USD.has(t)) return t;
  const usd = mapsUSD.mapARS2USD.get(t);
  return usd || '';
}

function displayTicker(t) {
  const k = String(t || '').trim();
  if (!k) return '';
  if (mapsUSD.mapUSD2ARS && mapsUSD.mapUSD2ARS.has(k))
    return mapsUSD.mapUSD2ARS.get(k);
  return k;
}

// ======================
// CARGA DESDE FINANCIALDATA (serie: "data")
// ======================
async function loadSheet() {
  // Tomamos el último registro activo con category = 'data'
  const records = await FinancialData.filter(
    {
      category: 'data',
      isActive: true,
    },
    '-lastSync',
    1
  );

  if (!records || records.length === 0) {
    throw new Error('No se encontró la serie "data" en FinancialData (category=data).');
  }

  const fd = records[0];
  const headers = fd.headers || [];
  const dataRows = fd.data || [];

  if (!headers.length || !dataRows.length) {
    throw new Error('La serie "data" no tiene headers o data.');
  }

  // Índices por nombre de columna
  const idxEmpresaNombre = findCol(headers, 'Empresa');
  const idxTickerARS = findCol(headers, 'Ticker ($)');
  const idxTickerUSD = findCol(headers, 'Ticker (USD)');
  const idxFecha = findCol(headers, 'Fecha');
  const idxIntereses = findCol(headers, 'Intereses');
  const idxCapital = findCol(headers, 'Capital');
  const idxResidual = findCol(headers, 'Valor residual');
  const idxTasa = findCol(headers, 'Tasa de interés');
  const idxLey = findCol(headers, 'Ley');
  const idxEmisor = findCol(headers, 'Emisor');

  rows = dataRows
    .map((row) => {
      const getStr = (idx) =>
        idx === -1 || row[idx] == null ? '' : String(row[idx]).trim();

      // 👈 Igual que antes: usamos la columna "Empresa"
      const empresaNombre = getStr(idxEmpresaNombre);   // p.ej. "ESTADO ARGENTINO"
      const empresa = empresaNombre ? empresaNombre.toUpperCase() : '';

      // Guardamos emisor sólo como dato adicional
      const emisor = getStr(idxEmisor); // p.ej. "Privado"

      const fecha = toDate(getStr(idxFecha));
      if (!empresa || !fecha) return null;

      return {
        empresa,          // ESTADO ARGENTINO / AEROPUERTOS ARGENTINA 2000 / etc. (en mayúsculas)
        emisor,           // Privado / Público / lo que tengas
        tickerARS: getStr(idxTickerARS),
        tickerUSD: getStr(idxTickerUSD),
        fecha,
        intereses: parseNumberCell(row[idxIntereses]),
        capital: parseNumberCell(row[idxCapital]),
        residual: parseNumberCell(row[idxResidual]),
        tasa: parseNumberCell(row[idxTasa]),
        ley: getStr(idxLey) || '',
      };
    })
    .filter((r) => r && r.fecha);

  byTicker = {};
  metaTicker = {};
  leyPorTicker = {};

  rows.forEach((r) => {
    const emp = r.empresa; // ya viene en mayúsculas, ej: "ESTADO ARGENTINO"
    // Igual que en la versión Excel: sólo Estado Argentino
    if (emp !== 'ESTADO ARGENTINO') return;

    const ley = r.ley || '';
    const tARS = r.tickerARS ? r.tickerARS.trim() : '';
    const tUSD = r.tickerUSD ? r.tickerUSD.trim() : '';

    if (tARS) {
      metaTicker[tARS] = { moneda: 'ARS', tasa: r.tasa || 0, empresa: emp };
      (byTicker[tARS] = byTicker[tARS] || []).push({
        fecha: r.fecha,
        intereses: r.intereses,
        capital: r.capital,
        residual: r.residual,
      });
      if (ley) leyPorTicker[tARS] = ley;
    }
    if (tUSD) {
      metaTicker[tUSD] = { moneda: 'USD', tasa: r.tasa || 0, empresa: emp };
      (byTicker[tUSD] = byTicker[tUSD] || []).push({
        fecha: r.fecha,
        intereses: r.intereses,
        capital: r.capital,
        residual: r.residual,
      });
      if (ley) leyPorTicker[tUSD] = ley;
    }
  });

  Object.values(byTicker).forEach((arr) =>
    arr.sort((a, b) => a.fecha - b.fecha)
  );
  mapsUSD = buildARSUSDMap();
}

// ======================
// CARGA QUOTES DATA912
// ======================
async function loadQuotes() {
  quotes = {};
  const settled = await Promise.allSettled(
    QUOTES_SOURCES.map((s) =>
      fetch(s.url)
        .then((r) => r.json())
        .then((a) => ({ name: s.name, data: a }))
    )
  );
  for (const res of settled) {
    if (res.status !== 'fulfilled') continue;
    const { data } = res.value;
    if (!Array.isArray(data)) continue;
    data.forEach((it) => {
      const sym = it.symbol;
      if (!sym) return;
      if (!quotes[sym]) quotes[sym] = it;
    });
  }
}

function getQuote(sym) {
  if (!sym) return null;
  const s = String(sym).trim();
  return quotes[s] || null;
}

// ======================
// PRECIO / DEVENGADO
// ======================
function isSovereignOrProvince(meta, ticker) {
  const emp = (meta?.empresa || '').toUpperCase();
  const sym = (ticker || '').toUpperCase();
  if (
    emp.includes('ESTADO ARGENTINO') ||
    emp.includes('PROVINCIA') ||
    emp.includes('TESORO')
  )
    return true;
  if (/^(AL|GD|AE)\d{2}[A-Z]*$/.test(sym)) return true;
  return false;
}

// precio “clean” efectivo por 100 VN según modo ask / último
function priceCleanPer100(ticker, useAsk) {
  const q = getQuote(ticker);
  if (!q) return null;
  const ask = Number(q.px_ask);
  const last = Number(q.c);

  let raw;
  if (useAsk) {
    raw =
      Number.isFinite(ask) && ask > 0
        ? ask
        : Number.isFinite(last) && last > 0
        ? last
        : NaN;
  } else {
    raw =
      Number.isFinite(last) && last > 0
        ? last
        : Number.isFinite(ask) && ask > 0
        ? ask
        : NaN;
  }
  if (!Number.isFinite(raw)) return null;

  const meta = metaTicker[ticker] || {};
  if (raw >= 1000) raw = raw / 100;

  if (meta.moneda === 'USD') {
    if (isSovereignOrProvince(meta, ticker)) return raw;
    if (raw < 50) return raw * 100;
    return raw;
  }
  return raw;
}

// ======================
// IRR y duración
// ======================
function irr(cashflows, guess = 0.1) {
  if (!cashflows.length) return null;
  const hasNeg = cashflows.some((cf) => cf.amount < 0);
  const hasPos = cashflows.some((cf) => cf.amount > 0);
  if (!hasNeg || !hasPos) return null;

  const t0 = cashflows[0].date;
  const days = (a, b) => (b - a) / (1000 * 60 * 60 * 24);
  const npv = (r) =>
    cashflows.reduce(
      (acc, cf) => acc + cf.amount / Math.pow(1 + r, days(t0, cf.date) / 365),
      0
    );
  const dnpv = (r) =>
    cashflows.reduce((acc, cf) => {
      const ex = days(t0, cf.date) / 365;
      return acc + (-ex) * cf.amount / Math.pow(1 + r, ex + 1);
    }, 0);

  let r = guess;
  for (let i = 0; i < 50; i++) {
    const f = npv(r);
    const df = dnpv(r);
    if (Math.abs(f) < 1e-8) return r;
    if (df === 0) break;
    r = r - f / df;
    if (!isFinite(r)) break;
  }
  return null;
}

function durationFor(ticker, fechaRef, yDec) {
  const arr = byTicker[ticker] || [];
  if (!arr.length || !fechaRef || !(yDec > -0.9999)) {
    return { macaulay: null, modified: null };
  }

  const cfs = [];
  arr.forEach((cf) => {
    if (cf.fecha > fechaRef) {
      const amt = (cf.capital || 0) + (cf.intereses || 0);
      if (amt !== 0) cfs.push({ date: cf.fecha, amount: amt });
    }
  });
  if (!cfs.length) return { macaulay: null, modified: null };

  const days = (a, b) => (b - a) / (1000 * 60 * 60 * 24);
  const t0 = fechaRef;

  let pvTotal = 0;
  let sumT = 0;
  cfs.forEach((cf) => {
    if (cf.amount <= 0) return;
    const t = days(t0, cf.date) / 365;
    const pv = cf.amount / Math.pow(1 + yDec, t);
    pvTotal += pv;
    sumT += t * pv;
  });

  if (!(pvTotal > 0)) return { macaulay: null, modified: null };
  const macaulay = sumT / pvTotal;
  const modified = macaulay / (1 + yDec);
  return { macaulay, modified };
}

// precio teórico por 100 VN para una TIR objetivo yDec
function priceForYield(ticker, fechaVal, yDec) {
  const cfs = byTicker[ticker] || [];
  if (!cfs.length) return null;
  const t0 = fechaVal;
  const days = (a, b) => (b - a) / (1000 * 60 * 60 * 24);
  let price = 0;
  cfs.forEach((cf) => {
    if (cf.fecha <= fechaVal) return;
    const amt = (cf.capital || 0) + (cf.intereses || 0);
    if (!amt) return;
    const exp = days(t0, cf.fecha) / 365;
    price += amt / Math.pow(1 + yDec, exp);
  });
  return price;
}

// ======================
// LISTADO DE BONOS ESTADO (usa empresa = "ESTADO ARGENTINO")
// ======================
function listarBonosEstado() {
  const tickersSet = new Set();

  rows.forEach((r) => {
    if (r.empresa !== 'ESTADO ARGENTINO') return;
    const tUSD = r.tickerUSD && r.tickerUSD.trim();
    const tARS = r.tickerARS && r.tickerARS.trim();
    if (tUSD) tickersSet.add(tUSD);
    else if (tARS) tickersSet.add(tARS);
  });

  const lista = [];
  tickersSet.forEach((t) => {
    const ley = leyPorTicker[t] || 'SIN LEY';
    const cfs = byTicker[t] || [];
    if (!cfs.length) return;
    const venc = cfs[cfs.length - 1].fecha;
    lista.push({
      usdTicker: t,
      display: displayTicker(t),
      ley,
      venc,
    });
  });

  lista.sort((a, b) => a.venc - b.venc || a.display.localeCompare(b.display));
  return lista;
}

// ======================
// NELSON–SIEGEL
// ======================
function solve3x3(A, b) {
  const M = [
    [A[0][0], A[0][1], A[0][2], b[0]],
    [A[1][0], A[1][1], A[1][2], b[1]],
    [A[2][0], A[2][1], A[2][2], b[2]],
  ];
  const n = 3;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    if (Math.abs(M[maxRow][i]) < 1e-12) return null;
    if (maxRow !== i) {
      const tmp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = tmp;
    }
    const piv = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= piv;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
    }
  }
  return [M[0][3], M[1][3], M[2][3]];
}

function fitNelsonSiegel(points) {
  if (!points || points.length < 3) return null;
  const tArr = points.map((p) => p.t);
  const yArr = points.map((p) => p.y);

  let best = null;
  for (let tau = 0.25; tau <= 15; tau += 0.25) {
    const XtX = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const XtY = [0, 0, 0];

    for (let i = 0; i < tArr.length; i++) {
      const t = tArr[i];
      const y = yArr[i];
      const tm = t / tau;
      const e = Math.exp(-tm);
      const L1 = (1 - e) / tm;
      const L2 = L1 - e;

      const x0 = 1;
      const x1 = L1;
      const x2 = L2;

      XtX[0][0] += x0 * x0;
      XtX[0][1] += x0 * x1;
      XtX[0][2] += x0 * x2;
      XtX[1][0] += x1 * x0;
      XtX[1][1] += x1 * x1;
      XtX[1][2] += x1 * x2;
      XtX[2][0] += x2 * x0;
      XtX[2][1] += x2 * x1;
      XtX[2][2] += x2 * x2;

      XtY[0] += x0 * y;
      XtY[1] += x1 * y;
      XtY[2] += x2 * y;
    }

    const beta = solve3x3(XtX, XtY);
    if (!beta) continue;
    const [b0, b1, b2] = beta;

    let sse = 0;
    for (let i = 0; i < tArr.length; i++) {
      const t = tArr[i];
      const y = yArr[i];
      const tm = t / tau;
      const e = Math.exp(-tm);
      const L1 = (1 - e) / tm;
      const L2 = L1 - e;
      const yhat = b0 + b1 * L1 + b2 * L2;
      const err = y - yhat;
      sse += err * err;
    }
    if (!best || sse < best.sse) {
      best = { tau, b0, b1, b2, sse };
    }
  }
  return best;
}

function nelsonSiegelYield(t, params) {
  const { tau, b0, b1, b2 } = params;
  const tm = t / tau;
  const e = Math.exp(-tm);
  const L1 = (1 - e) / tm;
  const L2 = L1 - e;
  return b0 + b1 * L1 + b2 * L2;
}

// ======================
// COLOR PARA UPSIDE / DOWNSIDE
// ======================
function styleForChange(p) {
  if (p == null || !isFinite(p)) return {};
  const x = p;
  if (x >= 10) return { backgroundColor: '#1f8b4d', color: '#ffffff' };
  if (x >= 5) return { backgroundColor: '#7cd67f', color: '#083b12' };
  if (x >= 0) return { backgroundColor: '#d7f5c9', color: '#14532d' };
  if (x > -5) return { backgroundColor: '#fff3b0', color: '#7a4a00' };
  if (x > -10) return { backgroundColor: '#ffc78a', color: '#7a2a00' };
  return { backgroundColor: '#f97373', color: '#7a1a1a' };
}

// ======================
// RECOMPUTE ÚNICO (curvas + upside)
// ======================
function recomputeAll(fechaVal, useAsk) {
  const bonos = listarBonosEstado();
  const universe = [];
  const upsidesPorLey = {
    'Ley Argentina': [],
    'Ley NY': [],
  };

  bonos.forEach((b) => {
    const t = b.usdTicker;
    const priceUsed = priceCleanPer100(t, useAsk);
    if (priceUsed == null || priceUsed <= 0) return;

    const cfs = byTicker[t] || [];
    const cashflows = [{ date: fechaVal, amount: -priceUsed }];
    cfs.forEach((cf) => {
      if (cf.fecha <= fechaVal) return;
      const amt = (cf.capital || 0) + (cf.intereses || 0);
      if (amt !== 0) cashflows.push({ date: cf.fecha, amount: amt });
    });

    const r = irr(cashflows, 0.1);
    const tirActual = r != null ? r * 100 : null;

    const durObj = r != null ? durationFor(t, fechaVal, r) : { macaulay: null, modified: null };

    const leyRaw = b.ley || '';
    const leyLower = leyRaw.toLowerCase();
    const leyKey = leyLower.includes('ny')
      ? 'Ley NY'
      : leyLower.includes('arg')
      ? 'Ley Argentina'
      : 'Ley Argentina';
    const leyShort = leyKey === 'Ley NY' ? 'NY' : 'AR';

    universe.push({
      ticker: t,
      display: b.display,
      leyKey,
      leyShort,
      tir: tirActual,
      durMac: durObj.macaulay,
      durMod: durObj.modified,
      priceUsed,
    });

    const cambios = TARGET_YIELDS.map((y) => {
      const yDec = y / 100;
      const priceObj = priceForYield(t, fechaVal, yDec);
      if (priceObj == null || priceUsed <= 0) return null;
      return ((priceObj - priceUsed) / priceUsed) * 100;
    });

    if (leyKey === 'Ley Argentina' || leyKey === 'Ley NY') {
      upsidesPorLey[leyKey].push({
        bono: b.display,
        tirActual,
        cambios,
      });
    }
  });

  // ordenar por duración o ticker para consistencia
  universe.sort((a, b) => (a.durMac || 0) - (b.durMac || 0));
  upsidesPorLey['Ley Argentina'].sort((a, b) =>
    a.bono.localeCompare(b.bono)
  );
  upsidesPorLey['Ley NY'].sort((a, b) => a.bono.localeCompare(b.bono));

  return { universe, upsidesPorLey };
}

// ======================
// COMPONENTE PRINCIPAL
// ======================
export default function CurvaBonosEstadoArgentino() {
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const [fechaValStr, setFechaValStr] = useState(defaultDate);
  const [useAsk, setUseAsk] = useState(true);
  const [durMode, setDurMode] = useState('mac'); // 'mac' | 'mod'

  const [universe, setUniverse] = useState([]);
  const [upsidesByLaw, setUpsidesByLaw] = useState({
    'Ley Argentina': [],
    'Ley NY': [],
  });

  const [activeTickers, setActiveTickers] = useState({});

  // carga inicial de datos desde FinancialData + quotes
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        setError(null);
        await loadSheet();
        await loadQuotes();
        if (!mounted) return;
        setSheetLoaded(true);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError('Error al cargar datos desde FinancialData (serie "data") o data912.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // recompute curvas + upsides cuando cambia fecha o modo precio
  useEffect(() => {
    if (!sheetLoaded) return;
    let mounted = true;
    const fechaVal = toDate(fechaValStr);
    if (!fechaVal) return;

    setLoading(true);
    try {
      const { universe, upsidesPorLey } = recomputeAll(fechaVal, useAsk);
      if (!mounted) return;

      setUniverse(universe);
      setUpsidesByLaw(upsidesPorLey);

      // inicializar o completar mapa de tickers activos
      setActiveTickers((prev) => {
        const next = { ...prev };
        if (!Object.keys(prev).length) {
          universe.forEach((b) => {
            next[b.ticker] = true;
          });
        } else {
          universe.forEach((b) => {
            if (!(b.ticker in next)) next[b.ticker] = true;
          });
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      if (mounted) setError('Error procesando curvas / upside.');
    } finally {
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [sheetLoaded, fechaValStr, useAsk]);

  const toggleTicker = (ticker) => {
    setActiveTickers((prev) => ({
      ...prev,
      [ticker]: prev[ticker] === false,
    }));
  };

  const bonosAR = universe.filter((b) => b.leyShort === 'AR');
  const bonosNY = universe.filter((b) => b.leyShort === 'NY');

  // helpers gráfico
  const buildChartDataForLaw = (lawShort) => {
    const list = universe.filter((b) => b.leyShort === lawShort);
    const durKey = durMode === 'mac' ? 'durMac' : 'durMod';

    const points = list
      .filter(
        (b) =>
          activeTickers[b.ticker] !== false &&
          b[durKey] != null &&
          isFinite(b[durKey]) &&
          b.tir != null &&
          isFinite(b.tir)
      )
      .map((b) => ({
        x: b[durKey],
        y: b.tir,
        ticker: b.display,
      }));

    const nsInput = points.map((p) => ({ t: p.x, y: p.y / 100 }));
    let curve = [];
    if (nsInput.length >= 3) {
      const params = fitNelsonSiegel(nsInput);
      if (params) {
        const ts = nsInput.map((p) => p.t);
        const tMin = Math.min(...ts);
        const tMax = Math.max(...ts);
        const span = Math.max(0.1, tMax - tMin);
        const from = Math.max(0.05, tMin - span * 0.1);
        const to = tMax + span * 0.1;
        const steps = 40;
        const step = (to - from) / steps;
        for (let i = 0; i <= steps; i++) {
          const t = from + step * i;
          const yDec = nelsonSiegelYield(t, params);
          curve.push({ x: t, y: yDec * 100 });
        }
      }
    }

    return { points, curve };
  };

  const renderTickerPills = (list) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {list.map((b) => {
        const on = activeTickers[b.ticker] !== false;
        const durVal = durMode === 'mac' ? b.durMac : b.durMod;
        const title = `TIR ${fmtPerc(b.tir)} · Dur ${
          durVal != null && isFinite(durVal) ? durVal.toFixed(2) : '—'
        } años`;
        const base =
          'px-2 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition';
        const cls = on
          ? base +
            ' bg-white text-slate-900 border-slate-300 shadow-sm hover:bg-slate-50'
          : base +
            ' bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
        return (
          <button
            key={b.ticker}
            type="button"
            title={title}
            onClick={() => toggleTicker(b.ticker)}
            className={cls}
          >
            <span
              className={
                'w-2 h-2 rounded-full ' +
                (on ? 'bg-emerald-500' : 'bg-slate-400')
              }
            />
            <span>{b.display}</span>
          </button>
        );
      })}
      {!list.length && (
        <span className="text-xs text-slate-500">
          No hay bonos con datos válidos para esta ley.
        </span>
      )}
    </div>
  );

  const renderCurveChart = (lawShort) => {
    const { points, curve } = buildChartDataForLaw(lawShort);
    const durLabel =
      durMode === 'mac'
        ? 'Duration Macaulay (años)'
        : 'Duration modificada (años)';

    return (
      <div className="mt-6">
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                dataKey="x"
                name="Duración"
                label={{
                  value: durLabel,
                  position: 'insideBottom',
                  offset: -5,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="TIR"
                label={{
                  value: 'TIR anual (%)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <RechartsTooltip
                formatter={(value, name, props) => {
                  const v = Number(value);
                  if (name === 'Curva NS') {
                    return [fmtPerc(v), 'Curva NS'];
                  }
                  const payload = props?.payload;
                  return [fmtPerc(v), payload?.ticker || 'Bono'];
                }}
                labelFormatter={(label) =>
                  `Duración: ${
                    label != null && isFinite(label)
                      ? Number(label).toFixed(2)
                      : '—'
                  } años`
                }
              />

              <Legend
                verticalAlign="top"
                align="left"
                wrapperStyle={{
                  marginTop: -10,
                  marginBottom: 10,
                  fontSize: '11px',
                  lineHeight: '16px',
                }}
                content={() => (
                  <div className="flex flex-col text-[11px] text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#0f2f4b]" />
                      Bonos activos
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                      Curva NS
                    </div>
                  </div>
                )}
              />

              <Scatter
                data={points}
                name="Bonos activos"
                dataKey="y"
                fill="#0f2f4b"
                line={false}
                shape="circle"
              />

              <Line
                type="monotone"
                data={curve}
                dataKey="y"
                name="Curva NS"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderUpsideTable = (leyKey) => {
    const data = upsidesByLaw[leyKey] || [];
    if (!data.length) {
      return (
        <p className="text-xs text-slate-500 mt-2">
          No se encontraron bonos para {leyKey}.
        </p>
      );
    }

    return (
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-[#0f2f4b]">
              <th className="border border-slate-200 px-2 py-1 text-left">
                Bono
              </th>
              <th className="border border-slate-200 px-2 py-1">
                TIR actual
              </th>
              {TARGET_YIELDS.map((y) => (
                <th
                  key={y}
                  className="border border-slate-200 px-2 py-1"
                >
                  {y.toFixed(2).replace('.', ',')}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.bono}>
                <td className="border border-slate-200 px-2 py-1 text-left">
                  {b.bono}
                </td>
                <td className="border border-slate-200 px-2 py-1 text-center">
                  {fmtPerc(b.tirActual)}
                </td>
                {b.cambios.map((c, idx) => (
                  <td
                    key={idx}
                    className="border border-slate-200 px-2 py-1 text-center"
                    style={c != null ? styleForChange(c) : undefined}
                  >
                    {c != null ? fmtPercSigned(c) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="curvas">
        <div className="w-full flex justify-center">
          <TabsList className="w-full max-w-xl grid grid-cols-2 gap-2">
            <TabsTrigger value="curvas">
              Curva de rendimientos
            </TabsTrigger>
            <TabsTrigger value="upside">
              Potencial Upside / Downside por TIR
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 🔹 Toggle FINFOCUS global, debajo de los tabs */}
        <div className="mt-3 flex justify-center">
          <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-semibold text-slate-700">
              Modo de precio (Toggle FINFOCUS)
            </label>
            <div className="flex items-center gap-3">
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={useAsk}
                  onChange={(e) => setUseAsk(e.target.checked)}
                />
                <span className="absolute inset-0 rounded-full bg-slate-100 border border-slate-300 peer-checked:bg-[#5EA6D7] peer-checked:border-[#5EA6D7] transition" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-6 transition-transform" />
              </label>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800">
                  {useAsk ? 'P ask (oferta)' : 'Último precio operado'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ON = P ask. OFF = último operado.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: CURVA DE RENDIMIENTOS */}
        <TabsContent value="curvas">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0f2f4b] text-center">
                Curvas Nelson–Siegel – Bonos Estado Argentino
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Controles comunes */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Fecha de valuación
                  </label>
                  <input
                    type="date"
                    value={fechaValStr}
                    onChange={(e) => setFechaValStr(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Usada para TIR, flujos y duración.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Horizonte (eje X)
                  </label>
                  <select
                    value={durMode}
                    onChange={(e) => setDurMode(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="mac">Duration Macaulay (años)</option>
                    <option value="mod">Duration modificada (años)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Define el eje X para las curvas.
                  </p>
                </div>
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0f2f4b]" />
                  <span>Procesando curvas con datos de FinancialData + data912…</span>
                </div>
              )}

              {!loading && error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              {!loading && !error && (
                <>
                  <Tabs defaultValue="AR" className="mt-2">
                    <div className="w-full flex justify-center">
                      <TabsList className="max-w-xs grid grid-cols-2">
                        <TabsTrigger value="AR">
                          Ley Argentina
                        </TabsTrigger>
                        <TabsTrigger value="NY">Ley NY</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="AR">
                      <p className="text-[11px] text-slate-500 mt-3">
                        Botones = bonos del Estado Argentino bajo Ley
                        Argentina. Si apagás alguno, deja de usarse para
                        ajustar la curva.
                      </p>
                      {renderTickerPills(bonosAR)}
                      {renderCurveChart('AR')}
                    </TabsContent>

                    <TabsContent value="NY">
                      <p className="text-[11px] text-slate-500 mt-3">
                        Botones = bonos del Estado Argentino bajo Ley NY.
                        La curva se recalcula con los tickers activos.
                      </p>
                      {renderTickerPills(bonosNY)}
                      {renderCurveChart('NY')}
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: UPSIDE / DOWNSIDE */}
        <TabsContent value="upside">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0f2f4b] text-center">
                Potencial Upside / Downside por TIR objetivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-500 mb-2">
                La variación muestra cuánto debería subir o bajar el precio
                efectivo si la TIR converge a la TIR objetivo seleccionada.
              </p>

              {loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0f2f4b]" />
                  <span>Calculando TIR y precios teóricos…</span>
                </div>
              )}

              {!loading && error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              {!loading && !error && (
                <>
                  <h3 className="mt-2 text-sm font-semibold text-[#0f2f4b]">
                    LEY ARGENTINA
                  </h3>
                  {renderUpsideTable('Ley Argentina')}

                  <h3 className="mt-6 text-sm font-semibold text-[#0f2f4b]">
                    LEY NY
                  </h3>
                  {renderUpsideTable('Ley NY')}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
