import { FinancialData } from '@/entities/FinancialData';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';


const AZUL = '#0f2f4b';
const CELESTE = '#5EA6D7';



// Cashflows por ticker (ej: TO26 con reinversión)
const CFS_BY_TICKER = {
  TO26: [
    ['2025-10-17', 7.75],
    ['2026-04-17', 7.75],
    ['2026-10-19', 107.75],
  ],
};

// ========= helpers de formato =========
const fmtARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtPct = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtNum2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ========= helpers de parseo/fechas =========

const normalizeHeaderName = (s) => {
  if (!s) return '';
  return s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const findCol = (headers = [], targetLabel) => {
  const targetNorm = normalizeHeaderName(targetLabel);
  let idx = headers.findIndex(
    (h) => normalizeHeaderName(h) === targetNorm
  );
  if (idx !== -1) return idx;

  idx = headers.findIndex((h) =>
    normalizeHeaderName(h).includes(targetNorm)
  );
  return idx;
};

const toNumberAR = (s) => {
  if (s == null) return NaN;
  return Number(String(s).replace(/\./g, '').replace(',', '.'));
};

const parseDMY_toDate = (dmy) => {
  // admite dd/mm/yyyy o dd-mm-yyyy
  const [d, m, y] = String(dmy).replaceAll('-', '/').split('/').map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const formatDateDMY = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const diffDays = (d1, d2) =>
  Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

const yearFracACT365 = (d0, d1) =>
  (d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24 * 365);

// ===== Helpers numéricos sin dependencias externas =====

// Pequeño linspace tipo numeric.linspace
function linspace(start, end, num) {
  if (num <= 1) return [start];
  const step = (end - start) / (num - 1);
  const arr = [];
  for (let i = 0; i < num; i++) {
    arr.push(start + step * i);
  }
  return arr;
}

// Modelo Nelson–Siegel
function nelsonSiegelFunc(t, b0, b1, b2, tau) {
  if (!t) return b0; // para t ~ 0 usar el nivel
  const x = t / tau;
  const term = (1 - Math.exp(-x)) / x;
  return b0 + b1 * term + b2 * (term - Math.exp(-x));
}

// Ajuste muy simple por descenso de gradiente (sin numeric)
function fitNelsonSiegel(spots) {
  if (!spots.length) return null;

  // params: [b0, b1, b2, tau]
  let b0 = spots[spots.length - 1].s; // nivel inicial ~ último punto
  let b1 = 0;
  let b2 = 0;
  let tau = 1;

  const params = [b0, b1, b2, tau];

  const loss = (p) => {
    const [B0, B1, B2, TAU] = p;
    let sum = 0;
    for (const { t, s } of spots) {
      const m = nelsonSiegelFunc(t, B0, B1, B2, TAU);
      const e = m - s;
      sum += e * e;
    }
    return sum;
  };

  const gradStep = 1e-4;
  const lr = 1e-2;
  const maxIter = 150;

  for (let iter = 0; iter < maxIter; iter++) {
    const currentLoss = loss(params);
    const grad = [0, 0, 0, 0];

    for (let i = 0; i < 4; i++) {
      const orig = params[i];
      params[i] = orig + gradStep;
      const lossPlus = loss(params);
      grad[i] = (lossPlus - currentLoss) / gradStep;
      params[i] = orig;
    }

    // update
    for (let i = 0; i < 4; i++) {
      params[i] -= lr * grad[i];
    }

    // límites básicos
    if (params[3] < 0.1) params[3] = 0.1; // tau > 0
  }

  return params; // [b0, b1, b2, tau]
}

// ========= helpers financieros =========
const ytmAct365 = (price, hoy, cfs, guess = 0.3) => {
  let y = guess;
  for (let it = 0; it < 50; it++) {
    let f = -price;
    let df = 0;
    for (const [dateStr, amt] of cfs) {
      const t = yearFracACT365(hoy, new Date(dateStr));
      if (t <= 0) continue;
      const den = Math.pow(1 + y, t);
      f += amt / den;
      df += -(t * amt) / (den * (1 + y));
    }
    if (!isFinite(f) || !isFinite(df) || Math.abs(df) < 1e-12) break;
    const step = f / df;
    y -= step;
    if (Math.abs(step) < 1e-10) break;
    if (y <= -0.99) y = -0.99;
    if (y > 10) y = 10;
  }
  return y; // TEA (decimal)
};

const teaToTnaSimple = (tea) => {
  const rDay = Math.pow(1 + tea, 1 / 365) - 1;
  return 365 * rDay;
};

const fvReinvertidoACT365 = (hoy, cfs, tea) => {
  const maturity = new Date(cfs[cfs.length - 1][0]);
  let fv = 0;
  for (const [dateStr, amt] of cfs) {
    const d = new Date(dateStr);
    if (d <= hoy) continue;
    const t = yearFracACT365(d, maturity);
    fv += amt * Math.pow(1 + tea, t);
  }
  return fv;
};

// ========= Tooltip custom de Recharts =========
const YieldTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const pt = payload[0].payload;
  if (!pt) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs shadow-sm">
      <div className="font-semibold text-slate-800 mb-1">
        {pt.ticker ?? '—'}
      </div>
      <div className="text-slate-600">
        Plazo: <span className="font-semibold">{pt.days} días</span>
      </div>
      <div className="text-slate-600">
        TNA:{' '}
        <span className="font-semibold">
          {fmtNum2.format(pt.tna)}
          {'%'}
        </span>
      </div>
    </div>
  );
};

// ========= Componente principal =========
export default function BonosArgLetras() {
  const [priceMode, setPriceMode] = useState('ask'); // 'ask' | 'last'
  const [rows, setRows] = useState([]); // [{ tipo, ticker, vto, pago }]
  const [quotes, setQuotes] = useState([]); // data912 (notes+bonds)
  const [mepHoy, setMepHoy] = useState(NaN);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // ====== carga inicial (Sheet + APIs) ======
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
// 1) FinancialData: letras_y_bonos_del_tesoro
const records = await FinancialData.filter(
  { category: 'letras_y_bonos_del_tesoro', isActive: true },
  '-lastSync',
  1
);

if (!records || !records.length) {
  throw new Error('No se encontró la serie "letras_y_bonos_del_tesoro" en FinancialData.');
}

const fd = records[0];
const headers = fd.headers || [];
const dataRows = fd.data || [];

if (!headers.length || !dataRows.length) {
  throw new Error('La serie "letras_y_bonos_del_tesoro" no tiene headers o data.');
}

// índices de columnas
const idxTipo = findCol(headers, 'Tipo');
const idxTicker = findCol(headers, 'Ticker');
const idxVto = findCol(headers, 'Vto');
const idxPago = findCol(headers, 'Pago');

const hoy = new Date();

// mapear filas de FinancialData → estructura interna
const body = dataRows
  .map((row) => {
    const tipo = row[idxTipo] ?? '';
    const ticker = row[idxTicker] ?? '';
    const vtoStr = row[idxVto] ?? '';
    const pagoStr = row[idxPago] ?? '';

    if (!ticker) return null;

    return {
      tipo: String(tipo || '').trim(),
      ticker: String(ticker || '').trim(),
      vto: String(vtoStr || '').trim(),          // sigue siendo dd/mm/yyyy
      pago: toNumberAR(pagoStr),
    };
  })
  .filter(Boolean)
  .sort((a, b) => {
    const da = parseDMY_toDate(a.vto);
    const db = parseDMY_toDate(b.vto);
    return da - db;
  });

// filtrar sólo futuros
const onlyFuture = body.filter((r) => {
  const d = parseDMY_toDate(r.vto);
  return d && d > hoy;
});

// deduplicar por ticker + ajustar vto si hay CF (igual que antes)
const seen = new Set();
const deduped = [];
for (const r of onlyFuture) {
  if (seen.has(r.ticker)) continue;
  seen.add(r.ticker);

  if (CFS_BY_TICKER[r.ticker]) {
    const cfs = CFS_BY_TICKER[r.ticker];
    const last = new Date(cfs[cfs.length - 1][0]);
    r.vto = formatDateDMY(last);
  }

  deduped.push(r);
}

setRows(deduped);

        // 2) APIs data912 (notas + bonos)
        let apiData = [];
        try {
          const [resNotas, resBonos] = await Promise.all([
            fetch('https://data912.com/live/arg_notes', { mode: 'cors' }),
            fetch('https://data912.com/live/arg_bonds', { mode: 'cors' }),
          ]);
          const notas = await resNotas.json();
          const bonos = await resBonos.json();
          apiData = [...notas, ...bonos];
        } catch (e) {
          console.warn('No se pudieron cargar cotizaciones:', e);
        }
        setQuotes(apiData);

        // 3) Dólar MEP
        let mepVal = NaN;
        try {
          const r = await fetch('https://dolarapi.com/v1/dolares/bolsa');
          const j = await r.json();
          if (j?.venta) mepVal = parseFloat(j.venta);
          else if (j?.bolsa?.venta) mepVal = parseFloat(j.bolsa.venta);
        } catch (e) {
          console.warn('No se pudo obtener MEP:', e);
        }
        setMepHoy(mepVal);
      } catch (e) {
        console.error(e);
        setErrorMsg(e.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // ====== cálculo de tabla + curva (memo) ======
  const { tableRows, scatterData, smoothData } = useMemo(() => {
    if (!rows.length) {
      return { tableRows: [], scatterData: [], smoothData: [] };
    }

    const hoy = new Date();
    const mepFijos = [1300, 1400, 1500, 1600, 1700];

    const table = [];
    const spots = [];

    for (const row of rows) {
      const ticker = row.ticker;
      let vtoStr = row.vto;
      const pagoBase = row.pago;

      // Si hay CF, aseguramos vto según último flujo
      const cfs = CFS_BY_TICKER[ticker] || null;
      if (cfs && cfs.length) {
        const last = new Date(cfs[cfs.length - 1][0]);
        vtoStr = formatDateDMY(last);
      }

      const fechaVto = parseDMY_toDate(vtoStr);
      if (!fechaVto) continue;

      const dias = diffDays(hoy, fechaVto);
      if (!(dias > 0)) continue; // sólo futuros

      // Cotizaciones
      const info = quotes.find((b) => b.symbol === ticker);
      let precio = NaN;
      if (info) {
        const ask = parseFloat(info.px_ask);
        const last = parseFloat(info.c);
        const primary = priceMode === 'ask' ? ask : last;
        const secondary = priceMode === 'ask' ? last : ask;
        if (Number.isFinite(primary) && primary > 0) precio = primary;
        else if (Number.isFinite(secondary) && secondary > 0)
          precio = secondary;
      }

      let tna = NaN;
      let tea = NaN;
      let tem = NaN;
      let pagoFinal = isFinite(pagoBase) ? pagoBase : NaN;

      if (isFinite(precio) && dias > 0) {
        if (cfs) {
          // YTM por flujos
          tea = ytmAct365(precio, hoy, cfs, 0.3);
          const tnaDec = teaToTnaSimple(tea);
          tna = tnaDec * 100;
          tem = Math.pow(1 + tea, 1 / 12) - 1;

          // FV reinvertido
          pagoFinal = isFinite(tea)
            ? fvReinvertidoACT365(hoy, cfs, tea)
            : cfs
                .filter(([ds]) => new Date(ds) > hoy)
                .reduce((a, [, amt]) => a + amt, 0);
        } else if (isFinite(pagoBase)) {
          const tnaDec = (pagoBase / precio - 1) * (365 / dias);
          tna = tnaDec * 100;
          tea = Math.pow(1 + tnaDec / 365, 365) - 1;
          tem = Math.pow(1 + tea, 1 / 12) - 1;
        }
      }

      // Comparación en USD
      let usdHoyVal = NaN;
      if (isFinite(mepHoy) && mepHoy > 0 && isFinite(precio)) {
        usdHoyVal = precio / mepHoy;
      }
      const usdComparacion = {};
      mepFijos.forEach((mepVal) => {
        let pct = NaN;
        if (isFinite(pagoFinal) && isFinite(usdHoyVal) && mepVal > 0) {
          const usdMaturityFijo = pagoFinal / mepVal;
          pct = ((usdMaturityFijo / usdHoyVal) - 1) * 100;
        }
        usdComparacion[mepVal] = pct;
      });

      table.push({
        tipo: row.tipo,
        ticker,
        vto: vtoStr,
        dias,
        pagoFinal,
        precio,
        tna,
        tem,
        tea,
        usdMepHoy: mepHoy,
        usdComparacion,
      });

      // Punto para curva (sólo si TNA válida)
      if (isFinite(tna) && tna > 0) {
        const t = dias / 365;
        spots.push({ t, s: tna / 100, days: dias, ticker });
      }
    }

    // Curva Nelson–Siegel
    if (spots.length < 2) {
      return { tableRows: table, scatterData: [], smoothData: [] };
    }

 const fitted = fitNelsonSiegel(spots);
 if (!fitted) {
   return {
     tableRows: table,
     scatterData: spots.map((p) => ({
       days: p.days,
       tna: p.s * 100,
       ticker: p.ticker,
     })),
     smoothData: [],
   };
 }

 const [B0, B1, B2, TAU] = fitted;

// 1) corregir el typo y calcular tMin/tMax
const tMin = Math.min(...spots.map((s) => s.t));
const tMax = Math.max(...spots.map((s) => s.t));

// 2) arrancar la grilla en tMin (no en 0)
const grid = linspace(tMin, tMax, 60);

const scatterData = spots.map((p) => ({
  days: p.days,
  tna: p.s * 100,
  ticker: p.ticker,
}));

const smoothData = grid.map((tVal) => ({
  days: Math.round(tVal * 365),
  tna: nelsonSiegelFunc(tVal, B0, B1, B2, TAU) * 100,
}));

    return { tableRows: table, scatterData, smoothData };
  }, [rows, quotes, mepHoy, priceMode]);

  const precioHeader =
    priceMode === 'ask' ? 'Precio (ask)' : 'Precio (último)';

  const toggleLabel = priceMode === 'ask' ? 'Ask' : 'Último';

  return (
    <div className="w-full max-w-5xl mx-auto">
{/* 🟦 HERO FINFOCUS – Bonos ARG */}
<div className="mb-4">
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white px-5 py-4 shadow-lg">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Lado izquierdo: título + contexto */}
      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">
          Bonos argentinos en pesos a tasa fija
        </h1>
        <p className="text-xs sm:text-sm text-slate-100/80 max-w-md">
          Panel de rendimientos con curva de rendimientos
          y comparación contra dólar MEP.
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-medium border border-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          {tableRows.length
            ? `${tableRows.length} instrumentos activos`
            : 'Sin instrumentos activos'}
        </span>
      </div>

      {/* Lado derecho: toggle precio */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-[0.7rem] uppercase tracking-wide text-slate-100/80">
          Modo de precio: {toggleLabel}
        </span>

        {/* Toggle FINFOCUS dentro del HERO */}
        <button
          type="button"
          onClick={() =>
            setPriceMode((prev) => (prev === 'ask' ? 'last' : 'ask'))
          }
          className="relative w-[82px] h-[36px] rounded-full shadow-lg cursor-pointer transition-colors duration-200 flex items-center px-2 border border-white/30 bg-white/10"
        >
          {/* labels */}
          <div className="absolute inset-0 flex items-center justify-between text-[0.7rem] font-bold px-2 select-none">
            <span className={priceMode === 'ask' ? 'text-white' : 'text-slate-200/80'}>
              Ask
            </span>
            <span className={priceMode === 'last' ? 'text-white' : 'text-slate-200/80'}>
              Último
            </span>
          </div>
          {/* knob */}
          <div
            className="absolute top-[4px] w-[28px] h-[28px] rounded-full bg-white shadow-md transition-transform duration-200"
            style={{
              transform:
                priceMode === 'ask'
                  ? 'translateX(0)'
                  : 'translateX(44px)',
            }}
          />
        </button>

        <p className="text-[0.7rem] text-slate-100/80">
          Afecta tabla y curva de rendimiento
        </p>
      </div>
    </div>
  </div>
</div>

      {/* Tabla */}
      <div className="overflow-auto border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="min-w-full text-[0.65rem]">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="px-3 py-2 text-left font-semibold">Tipo</th>
              <th className="px-3 py-2 text-left font-semibold">Ticker</th>
              <th className="px-3 py-2 text-center font-semibold">Vto</th>
              <th className="px-3 py-2 text-right font-semibold">Días</th>
              <th className="px-3 py-2 text-right font-semibold">
                Pago Final
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                {precioHeader}
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                TNA %
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                TEM %
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                TEA %
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD MEP (hoy)
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD 1300
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD 1400
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD 1500
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD 1600
              </th>
              <th className="px-3 py-2 text-right font-semibold">
                USD 1700
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={15}
                  className="px-3 py-3 text-center text-xs text-slate-500"
                >
                  Cargando datos…
                </td>
              </tr>
            )}
            {!loading && errorMsg && (
              <tr>
                <td
                  colSpan={15}
                  className="px-3 py-3 text-center text-xs text-red-600"
                >
                  {errorMsg}
                </td>
              </tr>
            )}
            {!loading && !errorMsg && tableRows.length === 0 && (
              <tr>
                <td
                  colSpan={15}
                  className="px-3 py-3 text-center text-xs text-slate-500"
                >
                  No hay bonos futuros para mostrar.
                </td>
              </tr>
            )}
            {!loading &&
              !errorMsg &&
              tableRows.map((r) => (
                <tr
                  key={r.ticker}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-1">{r.tipo}</td>
                  <td className="px-3 py-1">{r.ticker}</td>
                  <td className="px-3 py-1 text-center">{r.vto}</td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.dias) ? r.dias : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.pagoFinal)
                      ? fmtNum2.format(r.pagoFinal)
                      : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.precio)
                      ? fmtNum2.format(r.precio)
                      : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.tna)
                      ? fmtPct.format(r.tna / 100)
                      : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.tem)
                      ? fmtPct.format(r.tem)
                      : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.tea)
                      ? fmtPct.format(r.tea)
                      : '—'}
                  </td>
                  <td className="px-3 py-1 text-right">
                    {Number.isFinite(r.usdMepHoy)
                      ? fmtNum2.format(r.usdMepHoy)
                      : '—'}
                  </td>
                  {[1300, 1400, 1500, 1600, 1700].map((mepVal) => {
                    const pct = r.usdComparacion[mepVal];
                    const cls =
                      Number.isFinite(pct) && pct > 0
                        ? 'text-green-600'
                        : Number.isFinite(pct) && pct < 0
                        ? 'text-red-600'
                        : '';
                    return (
                      <td
                        key={mepVal}
                        className={`px-3 py-1 text-right ${cls}`}
                      >
                        {Number.isFinite(pct)
                          ? `${fmtNum2.format(pct)}%`
                          : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Curva de rendimiento */}
      <div className="mt-6 h-[260px] sm:h-[320px] border border-slate-200 rounded-lg bg-white shadow-sm px-3 py-2">
        {scatterData.length < 2 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No hay suficientes puntos para trazar la curva de rendimiento.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.4)" />
              <XAxis
                type="number"
                dataKey="days"
                name="Plazo"
                unit=" días"
                tick={{ fontSize: 10 }}
                tickMargin={4}
                label={{
                  value: 'Plazo al vencimiento (días)',
                  position: 'insideBottom',
                  offset: -2,
                  fontSize: 10,
                }}
              />
              <YAxis
                type="number"
                dataKey="tna"
                name="TNA"
                unit="%"
                tick={{ fontSize: 10 }}
                tickMargin={4}
                label={{
                  value: 'TNA %',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 4,
                  fontSize: 10,
                }}
              />
              <RechartsTooltip content={<YieldTooltip />} />
<Legend
  verticalAlign="top"
  height={20}
  wrapperStyle={{ width: "100%" }}
  content={() => (
    <div className="w-full flex justify-center mt-1">
      <div className="flex items-center gap-6 text-[11px] text-slate-700">

        {/* Mercado */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-[3px] rounded-sm bg-[#0f2f4b]" />
          <span>Mercado</span>
        </div>

        {/* Nelson–Siegel */}
        {smoothData.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-[3px] rounded-sm bg-[#ff6600]" />
            <span>Nelson–Siegel</span>
          </div>
        )}

      </div>
    </div>
  )}
/>
<Scatter
  name="Mercado"
  data={scatterData}
  fill={AZUL}
  shape="circle"
/>

{smoothData.length > 0 && (
  <Scatter
    name="Nelson–Siegel"
    data={smoothData}
    line={{ stroke: '#ff6600', strokeWidth: 2 }}
    lineType="joint"
    shape={() => null} // sin puntos, solo la curva
  />
)}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
