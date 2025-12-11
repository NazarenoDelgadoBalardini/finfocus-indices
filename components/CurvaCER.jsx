// src/components/BonosCer.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { FinancialData } from '@/entities/FinancialData';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const AZUL = '#0f2f4b';
const CELESTE = '#5EA6D7';
const BORDE = '#e5e7eb';
const CER_CATEGORY = 'cer';

// =================== Helpers genéricos ===================

const parseNumberAR = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
};

const fmtISO = (d) => (d ? d.toISOString().slice(0, 10) : '');

function parseDMY(s) {
  if (!s) return null;
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00');
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = +m[1];
    const mm = +m[2] - 1;
    const yyyy = +String(m[3]).padStart(4, '20');
    return new Date(yyyy, mm, dd);
  }
  const d = new Date(s);
  return isNaN(d)
    ? null
    : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function days_30_360_US(d1, d2) {
  let D1 = d1.getDate(),
    M1 = d1.getMonth() + 1,
    Y1 = d1.getFullYear();
  let D2 = d2.getDate(),
    M2 = d2.getMonth() + 1,
    Y2 = d2.getFullYear();
  if (D1 === 31) D1 = 30;
  if (D2 === 31 && D1 === 30) D2 = 30;
  return (Y2 - Y1) * 360 + (M2 - M1) * 30 + (D2 - D1);
}
const frac_30_360 = (d1, d2) => days_30_360_US(d1, d2) / 360;

// CSV parser robusto
async function fetchCSV(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo leer: ' + url);
  const txt = await r.text();
  const rows = [];
  let row = [],
    cell = '',
    inQuotes = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i],
      next = txt[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cell.length || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = '';
      }
      if (ch === '\r' && next === '\n') i++;
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

// JSON robusto (por si data912 devuelve HTML/ruido)
async function fetchJSONsafe(url, { retry = true } = {}) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  const txt = await r.text();

  const tryParse = (s) =>
    JSON.parse(s.replace(/^\uFEFF/, '').trim());

  try {
    const i0 = txt.indexOf('{'),
      i1 = txt.lastIndexOf('}');
    const a0 = txt.indexOf('['),
      a1 = txt.lastIndexOf(']');
    if (i0 !== -1 && i1 > i0) return tryParse(txt.slice(i0, i1 + 1));
    if (a0 !== -1 && a1 > a0) return tryParse(txt.slice(a0, a1 + 1));
    throw new Error('Respuesta no JSON');
  } catch (e) {
    if (retry) {
      await new Promise((r2) => setTimeout(r2, 350));
      return fetchJSONsafe(url, { retry: false });
    }
    throw new Error(`No se pudo parsear JSON de ${url}: ${e.message}`);
  }
}

// Normalización CER desde FinancialData (serie 'cer')
function normalizeDateKey(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\d{2}\d{2}$/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  const asDMY = parseDMY(s);
  if (asDMY) return fmtISO(asDMY);
  const d = new Date(s);
  if (!isNaN(d)) return fmtISO(d);
  return null;
}

// raw puede ser directamente el array de filas: [ ["2025-11-28","659,6789"], ... ]
// o un objeto con .data: { data: [ [...], ... ] }
const normalizeCerSeriesFromFD = (raw) => {
  const out = {};

  if (!raw) return out;

  // Si viene como registro de FinancialData
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.data)
    ? raw.data
    : [];

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue;

    const dateRaw = row[0];
    const valueRaw = row[1];

    if (!dateRaw || valueRaw == null) continue;

    // fecha en formato YYYY-MM-DD
    const key = String(dateRaw).slice(0, 10); // "2025-11-28"
    const val = parseNumberAR(valueRaw);      // "659,6789" → 659.6789

    if (Number.isFinite(val)) {
      out[key] = val;
    }
  }

  return out;
};

// ---------- precios data912 ----------

const normTicker = (s) => String(s || '').toUpperCase().trim();

// La API de data912 devuelve un array plano de objetos con { symbol, px_ask, c, ... }
function findRecord(quotes, ticker) {
  const tk = normTicker(ticker);
  if (!Array.isArray(quotes)) return null;
  return quotes.find((e) => normTicker(e.symbol) === tk) || null;
}

// ASK = px_ask
const getAsk = (rec) =>
  rec && rec.px_ask != null && !isNaN(+rec.px_ask) ? +rec.px_ask : null;

// LAST = c
const getLast = (rec) =>
  rec && rec.c != null && !isNaN(+rec.c) ? +rec.c : null;

function pickPriceByMode(rec, mode) {
  if (!rec) return { precio: null, fuente: null };
  if (mode === 'ASK') {
    const a = getAsk(rec);
    if (a != null) return { precio: +a, fuente: 'ASK' };
    const l = getLast(rec);
    if (l != null) return { precio: +l, fuente: 'LAST' };
  } else {
    const l = getLast(rec);
    if (l != null) return { precio: +l, fuente: 'LAST' };
    const a = getAsk(rec);
    if (a != null) return { precio: +a, fuente: 'ASK' };
  }
  return { precio: null, fuente: null };
}

// ---------- Nelson–Siegel helpers ----------

function nsBasis(T, tau) {
  const x = T / tau;
  const e = Math.exp(-x);
  const L1 = (1 - e) / x;
  const L2 = L1 - e;
  return { L1, L2 };
}

function nsBetas(points, tau) {
  let S00 = 0,
    S01 = 0,
    S02 = 0,
    S11 = 0,
    S12 = 0,
    S22 = 0,
    b0 = 0,
    b1 = 0,
    b2 = 0;
  for (const p of points) {
    const T = p.x / 12;
    if (!(T > 0) || !isFinite(p.y)) continue;
    const { L1, L2 } = nsBasis(T, tau);
    const x0 = 1,
      x1 = L1,
      x2 = L2,
      y = p.y;
    S00 += x0 * x0;
    S01 += x0 * x1;
    S02 += x0 * x2;
    S11 += x1 * x1;
    S12 += x1 * x2;
    S22 += x2 * x2;
    b0 += x0 * y;
    b1 += x1 * y;
    b2 += x2 * y;
  }
  const A = [
    [S00, S01, S02],
    [S01, S11, S12],
    [S02, S12, S22],
  ];
  const B = [b0, b1, b2];

  function solve3(A2, B2) {
    const M = A2.map((r, i) => [...r, B2[i]]);
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++)
        if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      if (p !== i) [M[i], M[p]] = [M[p], M[i]];
      const piv = M[i][i] || 1e-12;
      for (let j = i; j < 4; j++) M[i][j] /= piv;
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const f = M[r][i];
        for (let j = i; j < 4; j++) M[r][j] -= f * M[i][j];
      }
    }
    return [M[0][3], M[1][3], M[2][3]];
  }

  const [beta0, beta1, beta2] = solve3(A, B);
  return { beta0, beta1, beta2 };
}

function nsRSS(points, tau) {
  const { beta0, beta1, beta2 } = nsBetas(points, tau);
  let rss = 0;
  for (const p of points) {
    const T = p.x / 12;
    if (!(T > 0) || !isFinite(p.y)) continue;
    const { L1, L2 } = nsBasis(T, tau);
    const yhat = beta0 + beta1 * L1 + beta2 * L2;
    const e = p.y - yhat;
    rss += e * e;
  }
  return { rss, beta0, beta1, beta2 };
}

function fitNelsonSiegel(points, tauMin = 0.05, tauMax = 8, steps = 120, gridN = 200) {
  if (!points.length) return { line: [], params: null };
  let best = null;
  for (let i = 0; i < steps; i++) {
    const tau = tauMin + (i * (tauMax - tauMin)) / (steps - 1);
    const r = nsRSS(points, tau);
    if (!best || r.rss < best.rss) best = { ...r, tau };
  }
  const { beta0, beta1, beta2, tau } = best;
  const xs = [...points].map((p) => p.x).sort((a, b) => a - b);
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const line = Array.from({ length: gridN }, (_, i) => {
    const x = xMin + (i * (xMax - xMin)) / (gridN - 1);
    const T = x / 12;
    const { L1, L2 } = nsBasis(T, tau);
    return { x, y: beta0 + beta1 * L1 + beta2 * L2 };
  });
  return { line, params: { beta0, beta1, beta2, tau } };
}

// =================== Tooltip para Recharts ===================

const CurveTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // 🔎 Buscamos un punto que tenga ticker (o sea, un bono real)
  const point = payload.find(
    (p) => p && p.payload && p.payload.ticker
  );

  // Si no hay ticker → estamos sobre la curva NS → no mostramos nada
  if (!point) return null;

  const data = point.payload;
  const dur = Number(data.x);
  const tea = Number(data.y);

  const fmtPct = (n) =>
    n == null || !isFinite(n)
      ? '—'
      : n.toFixed(2).replace('.', ',') + '%';

  const durTxt =
    dur != null && isFinite(dur)
      ? dur.toFixed(2).replace('.', ',')
      : '—';

  return (
    <div className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <div className="font-semibold">{data.ticker}</div>
      <div>TEA: {fmtPct(tea)}</div>
      <div>Duration: {durTxt} meses</div>
    </div>
  );
};



// =================== Componente principal ===================

export default function BonosCer() {
  const [priceMode, setPriceMode] = useState('ASK'); // 'ASK' | 'LAST'
  const [csvCerRows, setCsvCerRows] = useState([]); // bonos + flujos
  const [inhRows, setInhRows] = useState([]);
  const [cerIndex, setCerIndex] = useState({});
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorNote, setErrorNote] = useState('');
  const [todayStr, setTodayStr] = useState('');
  const fdRef = useRef(null);

  const nf = useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const nfp = useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('es-AR'));
  }, []);

useEffect(() => {
  async function loadAll() {
    setLoading(true);
    setErrorNote('');

    try {
      // 1) Bonos CER (flujos) desde FinancialData → category: "bonos_cer"
      let cerRowsFD = [];
      try {
        const bonosList = await FinancialData.filter(
          { category: 'bonos_cer', isActive: true },
          '-lastSync',
          1
        );

        if (bonosList && bonosList.length > 0) {
          const rec = bonosList[0];
          // Si headers viene vacío, usamos el esquema que me pasaste
          const headers =
            rec.headers && rec.headers.length
              ? rec.headers
              : [
                  'Tipo',
                  'Ticker',
                  'Emisión',
                  'Fecha pago',
                  'Interes (%)',
                  'Intereses ($)',
                  'Capital',
                  'Valor residual',
                ];

          const dataRows = Array.isArray(rec.data) ? rec.data : [];
          // Imitamos el CSV: primera fila headers, resto datos
          cerRowsFD = [headers, ...dataRows];
        } else {
          console.warn('No se encontró la serie "bonos_cer" en FinancialData');
        }
      } catch (e) {
        console.warn('No se pudo leer "bonos_cer" desde FinancialData:', e);
      }

      // 2) Inhábiles financieros desde FinancialData → category: "inhabiles_financieros"
      let inhRowsFD = [];
      try {
        const inhList = await FinancialData.filter(
          { category: 'inhabiles_financieros', isActive: true },
          '-lastSync',
          1
        );

        if (inhList && inhList.length > 0) {
          const recInh = inhList[0];
          const data = Array.isArray(recInh.data) ? recInh.data : [];

          // Imitamos la estructura del CSV:
          // primera fila header, luego una fecha por fila
          const rows = [['Fecha']];
          data.forEach((row) => {
            if (Array.isArray(row) && row[0]) {
              rows.push([String(row[0]).trim()]);
            } else if (row && !Array.isArray(row)) {
              // Por si viene plano tipo ["31/12/2015","01/01/2016", ...]
              rows.push([String(row).trim()]);
            }
          });

          inhRowsFD = rows;
        } else {
          console.warn(
            'No se encontró la serie "inhabiles_financieros" en FinancialData'
          );
        }
      } catch (e) {
        console.warn(
          'No se pudo leer "inhabiles_financieros" desde FinancialData:',
          e
        );
      }

      // 3) CER diario desde FinancialData (esto ya lo tenías bien)
      let cerSeries = {};
      try {
        const list = await FinancialData.filter(
          { category: CER_CATEGORY, isActive: true },
          '-lastSync',
          1
        );

        if (list && list.length > 0) {
          const cerRecord = list[0]; // .data = [ ["2025-11-28","659,6789"], ... ]
          cerSeries = normalizeCerSeriesFromFD(cerRecord.data);
        } else {
          console.warn('No se encontraron registros CER en FinancialData');
        }
      } catch (e) {
        console.warn('No se pudo leer CER desde FinancialData:', e);
        cerSeries = {};
      }

      // 4) Precios data912 (igual que antes)
      let quotesData = [];
      try {
        const res = await fetch('https://data912.com/live/arg_bonds', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        quotesData = Array.isArray(json) ? json : [];
      } catch (e) {
        console.warn('No se pudieron cargar precios de data912:', e);
        quotesData = [];
      }

      // 5) Guardar en estado (mismos estados que ya usás)
      setCsvCerRows(cerRowsFD);
      setInhRows(inhRowsFD);
      setCerIndex(cerSeries);
      setQuotes(quotesData);

      if (!Object.keys(cerSeries).length || !quotesData.length) {
        setErrorNote(
          '⚠️ CER o precios no están completos. Se calculan valores con lo que hay.'
        );
      }
    } catch (e) {
      console.error(e);
      setErrorNote(
        '❌ No se pudieron cargar los datos desde FinancialData. Revisá que existan las series bonos_cer, inhabiles_financieros y cer.'
      );
    } finally {
      setLoading(false);
    }
  }

  loadAll();
}, []);

  // =================== Cálculos principales ===================

  const { items, scatterPoints, nsLine, curveComment } = useMemo(() => {
    if (!csvCerRows.length) {
      return {
        items: [],
        scatterPoints: [],
        nsLine: [],
        curveComment: '',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Feriados / inhábiles
    const feriados = new Set(
      inhRows
        .slice(1)
        .map((r) => parseDMY(r[0]))
        .filter(Boolean)
        .map((d) => fmtISO(d))
    );
    const isHabil = (d) =>
      !(d.getDay() === 0 || d.getDay() === 6) && !feriados.has(fmtISO(d));

    const minusBusiness = (date, n = 10) => {
      let d = new Date(date),
        c = 0;
      while (c < n) {
        d = addDays(d, -1);
        if (isHabil(d)) c++;
      }
      return d;
    };

    const cerAt = (date) => {
      if (!cerIndex || !Object.keys(cerIndex).length) return null;
      let d = new Date(date);
      for (let i = 0; i < 370; i++) {
        const key = fmtISO(d);
        if (cerIndex[key] != null) return +cerIndex[key];
        d = addDays(d, -1);
      }
      return null;
    };

    // Parse filas de bonos CER: [tipo, ticker, emision, pago, int%, int$, amort, vnResidual]
    const rows = csvCerRows
      .slice(1)
      .map((r) => {
        const tipo = r[0]?.trim() || '';
        const ticker = r[1]?.trim() || '';
        const fEmi = parseDMY(r[2]);
        const fPago = parseDMY(r[3]);
        const intPct =
          parseFloat((r[4] || '').toString().replace(',', '.')) || 0;
        const intPesos =
          parseFloat((r[5] || '').toString().replace(',', '.')) || 0;
        const amort =
          parseFloat((r[6] || '').toString().replace(',', '.')) || 0;
        const vnResRaw = parseFloat(
          (r[7] || '').toString().replace(',', '.')
        );
        const vnRes = Number.isFinite(vnResRaw) ? vnResRaw : null;
        return { tipo, ticker, fEmi, fPago, intPct, intPesos, amort, vnRes };
      })
      .filter((x) => x.ticker && x.fPago);

    const byTicker = new Map();
    for (const r of rows) {
      if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
      byTicker.get(r.ticker).push(r);
    }

    const itemsLocal = [];

    for (const [ticker, arr0] of byTicker) {
      const arr = [...arr0].sort((a, b) => a.fPago - b.fPago);
      const tipo = arr[0]?.tipo || '';
      const fEmi = arr[0]?.fEmi || null;

      // CER base (emisión -10 hábiles) y hoy (-10 hábiles)
      const cerHoy = cerAt(minusBusiness(today, 10));
      const cerBase = cerAt(minusBusiness(fEmi ?? today, 10));

      // Pares de períodos
      const periodPairs = [];
      for (let i = 0; i < arr.length; i++) {
        const prev =
          i > 0 ? arr[i - 1].fPago : arr[0].fEmi || arr[0].fPago;
        periodPairs.push({ prevDate: prev, pago: arr[i] });
      }
      const pairFor = (date) =>
        periodPairs.find((p) => +p.pago.fPago === +date);

      // VN vigente hoy = VN residual del próximo pago (o último)
      const proxRow =
        arr.find((x) => x.fPago > today) || arr[arr.length - 1];
      const vnVivoHoy =
        proxRow?.vnRes != null ? proxRow.vnRes : 100;

      // VT capital + interés devengado (30/360)
      const factorHB =
        cerHoy && cerBase ? cerHoy / cerBase : null;
      const vtCapital =
        factorHB != null ? vnVivoHoy * factorHB : null;

      let interesDev = 0;
      if (vtCapital != null && proxRow) {
        const pr = pairFor(proxRow.fPago);
        const vnTramo =
          proxRow.vnRes != null ? proxRow.vnRes : vnVivoHoy;
        const rAnual = parseFloat(proxRow.intPct || 0) / 100;
        const fTotal = Math.max(
          1e-9,
          frac_30_360(pr.prevDate, proxRow.fPago)
        );
        const fHasta = Math.max(
          0,
          frac_30_360(pr.prevDate, today)
        );

        if (factorHB != null && proxRow.intPesos > 0) {
          interesDev =
            factorHB *
            proxRow.intPesos *
            (fHasta / fTotal);
        } else {
          interesDev =
            rAnual > 0
              ? factorHB * vnTramo * rAnual * Math.max(0, fHasta)
              : 0;
        }
      }

      const vtHoy =
        vtCapital != null ? vtCapital + interesDev : null;

      const venc = arr[arr.length - 1].fPago;
      const prox =
        arr.find((x) => x.fPago >= today)?.fPago || venc;
      const diasAlVto = Math.max(
        0,
        Math.round((venc - today) / 86400000)
      );

      // Precio / paridad
      const rec = findRecord(quotes, ticker);
      let precio = null,
        precioFuente = null;
      if (rec) {
        const pick = pickPriceByMode(rec, priceMode);
        precio = pick.precio;
        precioFuente = pick.fuente;
      }
      const paridad =
        precio != null && vtHoy != null
          ? (precio / vtHoy) * 100
          : null;

      // Flujos ajustados futuros
      const futuros = arr
        .filter((p) => p.fPago > today)
        .map((p) => {
          const pr = pairFor(p.fPago);
          const vnBase =
            p.vnRes != null ? p.vnRes : vnVivoHoy;
          const rAnual = parseFloat(p.intPct || 0) / 100;
          const f = frac_30_360(pr.prevDate, p.fPago);
          let cup = null;
          if (factorHB != null) {
            if (p.intPesos > 0) {
              cup = p.intPesos * factorHB;
            } else {
              cup = vnBase * rAnual * f * factorHB;
            }
          }
          const cap =
            p.amort > 0 && factorHB != null
              ? p.amort * factorHB
              : 0;
          const flujoAdj =
            cup != null ? cup + cap : null;
          return { fecha: p.fPago, flujoAdj };
        })
        .filter(
          (f) =>
            f.flujoAdj != null &&
            isFinite(f.flujoAdj) &&
            f.flujoAdj > 0
        );

      const accrued =
        typeof interesDev === 'number' ? interesDev : 0;
      let dirty = null;
      if (precio != null) {
        dirty =
          precioFuente === 'ASK'
            ? precio + accrued // ASK ~ clean → dirty
            : precio;
      }

      function pvAtTEA(tea) {
        let pv = 0;
        for (const f of futuros) {
          const t = Math.max(
            0,
            Math.round((f.fecha - today) / 86400000)
          ) / 365;
          if (
            t > 0 &&
            isFinite(f.flujoAdj) &&
            f.flujoAdj > 0
          ) {
            pv += f.flujoAdj / Math.pow(1 + tea, t);
          }
        }
        return pv;
      }

      function solveTEA(targetDirty) {
        if (
          targetDirty == null ||
          !isFinite(targetDirty) ||
          !futuros.length
        )
          return { TEA: null, TEM: null };
        let lo = -0.9,
          hi = 5.0;
        let pvLo = pvAtTEA(lo) - targetDirty;
        let pvHi = pvAtTEA(hi) - targetDirty;
        let guard = 0;
        while (pvLo * pvHi > 0 && hi < 20 && guard++ < 60) {
          hi += 0.5;
          pvHi = pvAtTEA(hi) - targetDirty;
        }
        guard = 0;
        while (
          pvLo * pvHi > 0 &&
          lo > -0.999 &&
          guard++ < 60
        ) {
          lo -= 0.05;
          pvLo = pvAtTEA(lo) - targetDirty;
        }
        if (pvLo * pvHi > 0) return { TEA: null, TEM: null };
        for (let i = 0; i < 120; i++) {
          const mid = (lo + hi) / 2;
          const pv = pvAtTEA(mid) - targetDirty;
          if (Math.abs(pv) < 1e-6) {
            lo = hi = mid;
            break;
          }
          if (pvLo * pv <= 0) {
            hi = mid;
            pvHi = pv;
          } else {
            lo = mid;
            pvLo = pv;
          }
        }
        const TEA = (lo + hi) / 2;
        const TEM = Math.pow(1 + TEA, 1 / 12) - 1;
        return { TEA, TEM };
      }

      let { TEA, TEM } = solveTEA(dirty);
      if (TEA == null && precio != null && precioFuente !== 'ASK') {
        ({ TEA, TEM } = solveTEA(precio + accrued));
      }

      // Duration
      const daysDiff = (d1, d2) =>
        Math.max(0, Math.round((d2 - d1) / 86400000));
      const tYears = (d) => daysDiff(today, d) / 365;
      let DUR = null;
      if (TEA != null && isFinite(TEA)) {
        let wsum = 0,
          pvSum = 0;
        for (const f of futuros) {
          const t = tYears(f.fecha);
          if (t <= 0) continue;
          const df = 1 / Math.pow(1 + TEA, t);
          const pv = f.flujoAdj * df;
          wsum += t * pv;
          pvSum += pv;
        }
        const durYears = pvSum > 0 ? wsum / pvSum : null;
        DUR =
          durYears != null ? durYears * 12 : null; // meses
      }

      itemsLocal.push({
        tipo,
        ticker,
        venc,
        prox,
        diasAlVto,
        vrHoy: vtCapital ?? null,
        intDevHoy: interesDev ?? null,
        vtHoy: vtHoy ?? null,
        precio: precio ?? null,
        precioFuente: precioFuente || null,
        paridad: paridad ?? null,
        TEM,
        TEA,
        DUR,
      });
    }

    // solo bonos con días > 0
    const itemsFiltered = itemsLocal
      .filter((it) => it.diasAlVto > 0)
      .sort((a, b) => a.venc - b.venc);

    const pts = itemsFiltered
      .filter(
        (x) =>
          x.TEA != null &&
          x.DUR != null &&
          isFinite(x.TEA) &&
          isFinite(x.DUR)
      )
      .map((x) => ({
        x: x.DUR,
        y: x.TEA * 100,
        ticker: x.ticker,
      }));

    const ns = fitNelsonSiegel(pts);

    const curveComment = (() => {
      if (pts.length < 2)
        return 'Aún no hay puntos suficientes para caracterizar la curva.';
      const ord = [...pts].sort((a, b) => a.x - b.x);
      const slope =
        (ord[ord.length - 1].y - ord[0].y) /
        Math.max(1e-6, ord[ord.length - 1].x - ord[0].x);
      const rising = slope > 0.05;
      const falling = slope < -0.05;
      let bends = 0;
      for (let i = 1; i < ord.length - 1; i++) {
        const y0 = ord[i - 1].y;
        const y1 = ord[i].y;
        const y2 = ord[i + 1].y;
        const c = y2 - 2 * y1 + y0;
        bends += c > 0 ? 1 : c < 0 ? -1 : 0;
      }
      if (rising)
        return 'Curva con pendiente positiva (normal), TEA mayor a mayores durations; consistente con prima a plazo.';
      if (falling)
        return 'Curva invertida: TEA cae al aumentar la duration; sugiere expectativas de baja de tasas o stress de corto plazo.';
      if (Math.abs(bends) > 1)
        return 'Curva con forma mixta/convexa: posible preferencia por ciertos tramos (belly) o cuellos de liquidez.';
      return 'Curva relativamente plana: pocas diferencias de TEA entre tramos; sensibles a micro-movimientos de precios.';
    })();

    return {
      items: itemsFiltered,
      scatterPoints: pts,
      nsLine: ns.line,
      curveComment,
    };
  }, [csvCerRows, inhRows, cerIndex, quotes, priceMode]);

  const precioHeader =
    priceMode === 'ASK' ? 'Precio (ASK)' : 'Precio (LAST)';

  // ➜ Control de tamaño adaptable de la tabla
const manyRows = items.length > 50; // elegí 12, 15, lo que quieras

const tableWrapperClass = manyRows
  ? "max-h-[60vh] overflow-auto"
  : "overflow-x-auto";      

  return (
    <div className="bg-white text-slate-900">
      {/* Toggle FINFOCUS style interno */}
      <style>{`
        .ff-card{background:#fff;border:1px solid ${BORDE};border-radius:14px;box-shadow:0 8px 22px rgba(0,0,0,.06);margin-bottom:16px;}
        .ff-card-header{padding:14px 16px;border-bottom:1px solid ${BORDE};display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .ff-kpi-item{flex:1 1 150px;background:#f9fafb;border:1px solid ${BORDE};border-radius:12px;padding:10px 12px;}
        .ff-kpi-item h4{margin:.1rem 0 .25rem 0;font-size:.85rem;color:#374151;}
        .ff-kpi-item p{margin:.1rem 0 0 0;font-weight:700;color:#0b5faf;}
      `}</style>

      {/* Header superior */}
{/* 🟦 HERO FINFOCUS – Bonos CER */}
<div
  className="relative mb-4 overflow-hidden rounded-3xl px-6 py-5 shadow-lg text-white"
  style={{
    background:
      "linear-gradient(90deg, #0f2f4b, #173d5f, #0f2f4b)",
  }}
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    
    {/* IZQUIERDA — Título + bajada */}
    <div className="space-y-1">
      <h1 className="text-xl font-bold tracking-tight">
        Bonos argentinas a tasa variable (CER)
      </h1>

      <p className="text-xs sm:text-sm text-slate-100/80 max-w-md">
        Rendimientos TEM, TEA, vs Duration, paridades ajustadas y curva de rendimiento.
      </p>

      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-medium border border-white/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
        {items?.length ? `${items.length} bonos CER` : "Cargando bonos…"}
      </span>
    </div>

    {/* DERECHA — Toggle ASK / LAST */}
    <div className="flex flex-col items-end gap-1">
      <span className="text-[0.7rem] uppercase tracking-wide text-slate-100/80">
        Modo precio: {priceMode}
      </span>

      <button
        type="button"
        onClick={() =>
          setPriceMode((prev) => (prev === "ASK" ? "LAST" : "ASK"))
        }
        className="relative w-[82px] h-[36px] rounded-full shadow-lg cursor-pointer transition-colors duration-200 flex items-center px-2 border border-white/30 bg-white/10"
      >
        {/* Labels */}
        <div className="absolute inset-0 flex items-center justify-between text-[0.7rem] font-bold px-2 select-none">
          <span className={priceMode === "ASK" ? "text-white" : "text-slate-300"}>
            ASK
          </span>
          <span className={priceMode === "LAST" ? "text-white" : "text-slate-300"}>
            LAST
          </span>
        </div>

        {/* Knob */}
        <div
          className="absolute top-[4px] w-[28px] h-[28px] rounded-full bg-[#5EA6D7] shadow-md transition-transform duration-200"
          style={{
            transform:
              priceMode === "ASK"
                ? "translateX(0)"
                : "translateX(44px)",
          }}
        />
      </button>

      <p className="text-[0.7rem] text-slate-100/80">
        Afecta precio, paridad y curva TEA
      </p>
    </div>
  </div>
</div>

      <main className="mx-auto max-w-6xl px-4 py-4">
        {errorNote && (
          <div className="mb-3 rounded-lg border-l-4 border-sky-400 bg-sky-50 px-3 py-2 text-xs text-slate-700">
            {errorNote}
          </div>
        )}

        {/* Card parámetros y toggle */}
        <div className="ff-card">
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-3">
              <div className="ff-kpi-item">
                <h4>Fecha de cálculo</h4>
                <p>{todayStr || '—'}</p>
              </div>
              <div className="ff-kpi-item">
                <h4>Regla CER</h4>
                <p>–10 hábiles fecha emisión / fecha pago</p>
              </div>
              <div className="ff-kpi-item">
                <h4>Bonos cargados</h4>
                <p>{items.length || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card tabla */}
        <div className="ff-card">
          <div className="ff-card-header">
            <div>
              <h2
                className="m-0 text-base font-semibold"
                style={{ color: AZUL }}
              >
                Tabla de Bonos (orden: vencimiento)
              </h2>
              <div className="text-[0.75rem] text-slate-600">
                Tipo, Ticker, Vencimiento, Próximo pago, Días al vto,
                Valor técnico, Precio, Paridad, TEM, TEA
              </div>
            </div>
          </div>
          <div className="px-3 py-3">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-center">
                <thead className="bg-slate-50 text-[0.7rem] text-slate-700">
                  <tr>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Tipo
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Ticker
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Vencimiento
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Próximo pago
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Días al vto
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Valor técnico (VN100)
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      VR ajustado
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Interés devengado
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      {precioHeader}
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      Paridad (%)
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      TEM
                    </th>
                    <th className="sticky top-0 border-b border-slate-200 px-2 py-2">
                      TEA
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[0.70rem]">
                  {items.map((it) => (
                    <tr
                      key={it.ticker}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-2 py-2">
                        <span className="inline-block rounded-full bg-blue-50 px-2 py-[2px] text-[0.7rem] font-semibold text-sky-800">
                          {it.tipo || ''}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-semibold">
                        {it.ticker}
                      </td>
                      <td className="px-2 py-2">
                        {it.venc
                          ? new Date(it.venc).toLocaleDateString(
                              'es-AR'
                            )
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {it.prox
                          ? new Date(it.prox).toLocaleDateString(
                              'es-AR'
                            )
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.diasAlVto ?? '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.vtHoy != null
                          ? '$ ' + nf.format(it.vtHoy)
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.vrHoy != null
                          ? '$ ' + nf.format(it.vrHoy)
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.intDevHoy != null
                          ? '$ ' + nf.format(it.intDevHoy)
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.precio != null
                          ? '$ ' + nf.format(it.precio)
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.paridad != null
                          ? nfp.format(it.paridad) + '%'
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.TEM != null
                          ? nfp.format(it.TEM * 100) + '%'
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {it.TEA != null
                          ? nfp.format(it.TEA * 100) + '%'
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {!items.length && !loading && (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-2 py-4 text-center text-[0.75rem] text-slate-500"
                      >
                        No hay bonos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-center text-[0.8rem] text-slate-500">
              VT y flujos ajustados por CER (FinancialData). Los
              cálculos usan la fuente de precio seleccionada
              (ASK/LAST) con fallback automático.
            </p>
          </div>
        </div>

        {/* Card curva TEA vs Duration */}
        <div className="ff-card">
          <div className="ff-card-header">
            <h2
              className="m-0 text-base font-semibold"
              style={{ color: AZUL }}
            >
              Curva (TEA vs Duration)
            </h2>
          </div>
          <div className="px-3 py-3">
<div className="h-[260px] w-full sm:h-[320px]">
  <ResponsiveContainer width="100%" height="100%">
<ComposedChart margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis
    type="number"
    dataKey="x"
    name="Duration"
    tick={{ fontSize: 10 }}
    label={{
      value: "Duration (meses)",
      position: "insideBottom",
      offset: -5,
      fontSize: 11,
    }}
  />
  <YAxis
    type="number"
    dataKey="y"
    name="TEA"
    tick={{ fontSize: 10 }}
    label={{
      value: "TEA (%)",
      angle: -90,
      position: "insideLeft",
      offset: 10,
      fontSize: 11,
    }}
  />

<RechartsTooltip content={<CurveTooltip />} />

<Scatter
  name="Bonos CER"
  data={scatterPoints}
  dataKey="y"
  fill={CELESTE}
  shape="circle"
/>

<Line
  type="monotone"
  data={nsLine}
  dataKey="y"
  name="Curva NS"
  stroke={AZUL}
  strokeWidth={2}
  dot={false}
  isAnimationActive={false}
/>

</ComposedChart>
  </ResponsiveContainer>
</div>
            <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {curveComment}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
