// src/components/FlujoFondosTIR.jsx
import * as RechartsPrimitive from 'recharts';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinancialData } from '@/entities/FinancialData';
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react';

const {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip: RechartsTooltip,
  Legend,
} = RechartsPrimitive;

// =======================
// CONFIGURACIÓN GENERAL
// =======================

// 🔹 Ahora apuntan exactamente a tus categorías en FinancialData
const DATA_CATEGORY = 'data';
const PERFIL_CATEGORY = 'perfil';
const MIN_NOMINAL_CATEGORY = 'minimo_nominales';

const QUOTES_SOURCES = [
  { name: 'bonds', url: 'https://data912.com/live/arg_bonds' },
  { name: 'corp', url: 'https://data912.com/live/arg_corp' },
];

const COMPANY_LOGOS = {
  "AEROPUERTOS ARGENTINA 2000": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151069-3000e8f0/aeropuertos_edited.png",
  "ARCOR S.A.I.C.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151265-dd733fca/arcor.png",
  "EDENOR S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151108-c039e58a/edenor.png",
  "GENERACIÓN MEDITERRÁNEA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151112-73a1980a/generacion.jpeg",
  "IRSA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136159263-699d82be/IRSA.png",
  "CRESUD": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765135937433-ffb92a4c/cresud.png",
  "LOMA NEGRA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136655572-e1c6b84f/loma.png",
  "MASTELLONE HERMANOS S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151269-18db4974/la_serenisima.jpg",
  "MSU ENERGY": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151255-7bf8e535/msu.png",
  "PAN AMERICAN ENERGY": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151101-62446a11/pan_american_energy.png",
  "PAMPA ENERGÍA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151257-b1927dd4/pampa_energia.png",
  "PLUSPETROL": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151268-429b4639/pluspetrol.png",
  "RIZOBACTER ARGENTINA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151266-a0142a54/rizobacter.png",
  "TELECOM ARGENTINA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136784249-ad6c5e57/telecom.jpg",
  "VISTA ENERGY ARGENTINA S.A.U.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151072-0aec4c32/vista.png",
  "YPF S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151084-6bdbf22a/ypf.png",
  "YPF LUZ": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151106-7fa036c9/ypf_luz.png",
  "BCRA ARGENTINA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png",
  "S.A. SAN MIGUEL": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136911802-1c4247f3/san_miguel.png",
  "PROVINCIA DE BUENOS AIRES": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png",
  "ESTADO ARGENTINO": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png",
  "JOHN DEERE": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765137071078-9b711a8c/john_deere.png",
};

// =======================
// HELPERS GENERALES
// =======================

const parseNumberCell = (v) => {
  if (v == null) return 0;
  let s = String(v).trim().replace(/^"(.*)"$/, '$1');
  if (s === '' || s === '-') return 0;
  s = s.replace(/[^\d.,\-]/g, '');
  s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
};

const stripCell = (v) => (v == null ? '' : String(v).trim().replace(/^"(.*)"$/, '$1'));

const toDate = (v) => {
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
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const fmtNum1 = (x) => {
  const n = Number(x || 0);
  return n
    .toFixed(1)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const fmtPerc = (x) => {
  const n = Number(x || 0);
  return n.toFixed(2).replace('.', ',') + '%';
};

const fmtMoneyBase = (x) => {
  const n = Number(x || 0);
  return n
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const fmtMoneyARS = (x) => '$ ' + fmtMoneyBase(x);
const fmtMoneyUSD = (x) => 'USD ' + fmtMoneyBase(x);

const initialsFrom = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');

const stylePerfilFrom = (p) => {
  if (!p) return 'bg-slate-50 text-slate-800 border-slate-200';
  const s = p.toLowerCase();
  if (s.includes('conserv')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s.includes('modera')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (s.includes('agres') || s.includes('alto')) return 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200';
  return 'bg-sky-50 text-sky-900 border-sky-200';
};

const isSovereignOrProvince = (meta, ticker) => {
  const emp = (meta?.empresa || '').toUpperCase();
  const sym = (ticker || '').toUpperCase();
  if (emp.includes('ESTADO ARGENTINO') || emp.includes('PROVINCIA') || emp.includes('TESORO')) return true;
  if (/^(AL|GD|AE)\d{2}[A-Z]*$/.test(sym)) return true;
  return false;
};

// IRR con guardas
const irr = (cashflows, guess = 0.1) => {
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
      return acc + -ex * cf.amount / Math.pow(1 + r, ex + 1);
    }, 0);

  let r = guess;
  for (let i = 0; i < 50; i++) {
    const f = npv(r);
    const df = dnpv(r);
    if (Math.abs(f) < 1e-8) return r;
    if (df === 0) break;
    r = r - f / df;
    if (!Number.isFinite(r)) break;
  }
  return null;
};

const nominalFactor = (n) => Number(n || 0) / 100;

// =======================
// CÁLCULO PRINCIPAL
// =======================

const buildARSUSDMap = (rows) => {
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
};

const resolveUSDFor = (ticker, mapsUSD) => {
  const t = (ticker || '').trim();
  if (!t) return '';
  if (mapsUSD.mapUSD2USD.has(t)) return t;
  const usd = mapsUSD.mapARS2USD.get(t);
  return usd || '';
};

const residualHoyPer100 = (ticker, fechaVal, byTicker) => {
  const cfs = byTicker[ticker] || [];
  if (!cfs.length) return 0;
  let last = null;
  for (let i = 0; i < cfs.length; i++) {
    const it = cfs[i];
    if (it.fecha <= fechaVal) last = it;
    else break;
  }
  return last ? Number(last.residual || 0) : 0;
};

const accruedPer100 = (ticker, fechaVal, byTicker, metaTicker) => {
  const cfs = byTicker[ticker] || [];
  if (!cfs.length) return 0;
  const tasa = (metaTicker[ticker]?.tasa || 0) / 100;
  let last = null;
  let next = null;
  for (let i = 0; i < cfs.length; i++) {
    const it = cfs[i];
    if (it.fecha <= fechaVal) last = it;
    if (it.fecha > fechaVal) {
      next = it;
      break;
    }
  }
  if (!last || !next || !tasa) return 0;
  const residualIni = Number(last.residual || 0);
  if (residualIni <= 0) return 0;

  const daysTot = (next.fecha - last.fecha) / (1000 * 60 * 60 * 24);
  const daysRun = Math.max(0, (fechaVal - last.fecha) / (1000 * 60 * 60 * 24));
  if (daysTot <= 0) return 0;

  const periodoTeorico = residualIni * tasa * (daysTot / 365);
  const periodoHoja = Number(next.intereses || 0);
  const periodo = periodoHoja > 0 ? periodoHoja : periodoTeorico;
  const dev = periodo * Math.min(daysRun / daysTot, 1);
  return Math.min(dev, periodo);
};

const durationFor = (usdTicker, fechaVal, r, byTicker, quotePer100Fn) => {
  if (r == null || !Number.isFinite(r) || r <= -0.9999) return { macaulay: null, modified: null };
  const cfs = byTicker[usdTicker] || [];
  if (!cfs.length) return { macaulay: null, modified: null };

  const priceQuoted = quotePer100Fn(usdTicker);
  if (priceQuoted == null || !(priceQuoted > 0)) return { macaulay: null, modified: null };

  const t0 = fechaVal;
  const days = (a, b) => (b - a) / (1000 * 60 * 60 * 24);

  let num = 0;
  cfs.forEach((cf) => {
    if (cf.fecha <= fechaVal) return;
    const t = days(t0, cf.fecha) / 365;
    const cfAmt = Number(cf.capital || 0) + Number(cf.intereses || 0);
    const pv = cfAmt / Math.pow(1 + r, t);
    num += t * pv;
  });

  const macaulay = num / priceQuoted;
  const modified = macaulay / (1 + r);
  return { macaulay, modified };
};

const buildCashflows = (fechaVal, obligaciones, byTicker) => {
  const porFecha = [];
  const flujoAnual = {};
  const flujoMensual = {};
  const yearsSet = new Set();

  obligaciones.forEach((item) => {
    const k = nominalFactor(item.nominal);
    const cfs = byTicker[item.ticker] || [];
    cfs.forEach((cf) => {
      if (cf.fecha <= fechaVal) return;
      const cap = (cf.capital || 0) * k;
      const inte = (cf.intereses || 0) * k;

      porFecha.push({ fecha: cf.fecha, cap, int: inte });

      const y = cf.fecha.getFullYear();
      yearsSet.add(y);
      (flujoAnual[y] = flujoAnual[y] || { cap: 0, int: 0 });
      flujoAnual[y].cap += cap;
      flujoAnual[y].int += inte;

      const ym = `${y}-${String(cf.fecha.getMonth() + 1).padStart(2, '0')}`;
      (flujoMensual[ym] = flujoMensual[ym] || { cap: 0, int: 0 });
      flujoMensual[ym].cap += cap;
      flujoMensual[ym].int += inte;
    });
  });

  porFecha.sort((a, b) => a.fecha - b.fecha);
  const years = Array.from(yearsSet).sort((a, b) => a - b);
  return { porFecha, flujoAnual, flujoMensual, years };
};

const annualFromMonthly = (flujoMensual) => {
  const out = {};
  Object.entries(flujoMensual || {}).forEach(([ym, vals]) => {
    const y = Number(ym.slice(0, 4));
    if (!Number.isFinite(y)) return;
    (out[y] = out[y] || { cap: 0, int: 0 });
    out[y].cap += vals.cap || 0;
    out[y].int += vals.int || 0;
  });
  return out;
};

const buildReinvDeltaAnnualAligned = (flujoMensual, years, rDec) => {
  const out = new Array(years.length).fill(0);
  if (!(rDec > -0.9999) || !years.length) return out;

  const rM = rDec / 12;
  let balance = 0;

  for (let i = 0; i < years.length; i++) {
    const y = years[i];
    let gainYear = 0;
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const cf = (flujoMensual[key]?.cap || 0) + (flujoMensual[key]?.int || 0);
      const gain = balance * rM;
      gainYear += gain;
      balance += gain + cf;
    }
    out[i] = gainYear;
  }
  return out;
};

// =======================
// COMPONENTE PRINCIPAL
// =======================

export default function FlujoFondosTIR() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [byEmpresa, setByEmpresa] = useState({});
  const [byTicker, setByTicker] = useState({});
  const [metaTicker, setMetaTicker] = useState({});
  const [mapsUSD, setMapsUSD] = useState({ mapARS2USD: new Map(), mapUSD2USD: new Map(), mapUSD2ARS: new Map() });

  const [empresaActiva, setEmpresaActiva] = useState('');
  const [tickerSeleccionado, setTickerSeleccionado] = useState('');
  const [nominales, setNominales] = useState('');
  const [fechaValuacion, setFechaValuacion] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [obligaciones, setObligaciones] = useState([]);
  const [warningMin, setWarningMin] = useState('');
  const [quotes, setQuotes] = useState({});
  const [mepRate, setMepRate] = useState(null);

  const [anioSeleccionado, setAnioSeleccionado] = useState(null);
  const [reinvertir, setReinvertir] = useState(false);

  // --------- LOAD DATA FROM FINANCIALDATA ---------

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError('');

        // 1) series FinancialData
        const [dataArr, perfilArr, minNomArr] = await Promise.all([
          FinancialData.filter({ category: DATA_CATEGORY, isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: PERFIL_CATEGORY, isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: MIN_NOMINAL_CATEGORY, isActive: true }, '-lastSync', 1),
        ]);

        const dataRec = dataArr?.[0];
        const perfilRec = perfilArr?.[0];
        const minNomRec = minNomArr?.[0];

        if (!dataRec || !Array.isArray(dataRec.data)) {
          setError('No se encontraron datos de la serie "data" en FinancialData.');
          setLoading(false);
          return;
        }

        // perfil: Empresa -> Perfil
        const perfilMap = {};
        if (perfilRec && Array.isArray(perfilRec.data)) {
          const headers = (perfilRec.headers || []).map((h) => String(h || '').toLowerCase());
          const idxEmp = headers.findIndex((h) => h.includes('empresa'));
          const idxPerfil = headers.findIndex((h) => h.includes('perfil'));
          perfilRec.data.forEach((row) => {
            const emp = stripCell(row[idxEmp]);
            const per = stripCell(row[idxPerfil]);
            if (emp) perfilMap[emp] = per;
          });
        }


// mínimo nominal: ticker ARS / USD -> minNominal
const minMap = {};
if (minNomRec && Array.isArray(minNomRec.data) && minNomRec.data.length > 1) {
  minNomRec.data.forEach((row, idx) => {
    // fila 0 = encabezados, la salteamos
    if (idx === 0) return;

    // Columna 0: Ticker ($)
    // Columna 1: Ticker (USD)
    // Columna 2: Mínimo
    const tARS = stripCell(row[0]);      // "ARC1O"
    const tUSD = stripCell(row[1]);      // "ARC1D"
    const mn   = parseNumberCell(row[2]); // "1.000" -> 1000

    if (tARS) minMap[tARS] = mn;
    if (tUSD) minMap[tUSD] = mn;
  });
}

        // data principal
        const headers = (dataRec.headers || []).map((h) => String(h || '').toLowerCase());
        const idxEmpresa = headers.findIndex((h) => h.includes('empresa'));
        const idxTickARS = headers.findIndex((h) => h.includes('ticker') && h.includes('$'));
        const idxTickUSD = headers.findIndex((h) => h.includes('ticker') && h.includes('usd'));
        const idxFecha = headers.findIndex((h) => h.includes('fecha'));
        const idxInt = headers.findIndex((h) => h.includes('interes') || h.includes('interés'));
        const idxCap = headers.findIndex((h) => h.includes('capital'));
        const idxResidual = headers.findIndex((h) => h.includes('residual'));
        const idxTasa = headers.findIndex((h) => h.includes('tasa'));
        const idxPerfilData = headers.findIndex((h) => h.includes('perfil'));

        const newRows = [];
        dataRec.data.forEach((row) => {
          const empresa = stripCell(row[idxEmpresa]);
          const tickerARS = stripCell(row[idxTickARS]);
          const tickerUSD = stripCell(row[idxTickUSD]);
          const fecha = toDate(stripCell(row[idxFecha]));
          if (!empresa || (!tickerARS && !tickerUSD) || !fecha) return;

          const intereses = parseNumberCell(row[idxInt]);
          const capital = parseNumberCell(row[idxCap]);
          const residual = parseNumberCell(row[idxResidual]);
          const tasa = parseNumberCell(row[idxTasa]);
          const perfilData = stripCell(row[idxPerfilData]);
          const perfilFinal = perfilMap[empresa] || perfilData || '';

          newRows.push({
            empresa,
            tickerARS,
            tickerUSD,
            fecha,
            intereses,
            capital,
            residual,
            tasa,
            perfil: perfilFinal,
            minNominalARS: tickerARS ? minMap[tickerARS] || 0 : 0,
            minNominalUSD: tickerUSD ? minMap[tickerUSD] || 0 : 0,
          });
        });

        // ordenar por fecha
        newRows.sort((a, b) => a.fecha - b.fecha);

        const be = {};
        const bt = {};
        const meta = {};

        newRows.forEach((r) => {
          const emp = r.empresa;
          be[emp] = be[emp] || { tickers: new Set(), perfiles: new Set() };
          if (r.perfil) be[emp].perfiles.add(r.perfil);

          const tARS = r.tickerARS ? r.tickerARS.trim() : '';
          const tUSD = r.tickerUSD ? r.tickerUSD.trim() : '';

          if (tARS) {
            be[emp].tickers.add(`${tARS}|ARS`);
            meta[tARS] = {
              moneda: 'ARS',
              minNominal: r.minNominalARS || 0,
              tasa: r.tasa || 0,
              empresa: emp,
            };
            (bt[tARS] = bt[tARS] || []).push({
              fecha: r.fecha,
              intereses: r.intereses,
              capital: r.capital,
              residual: r.residual,
            });
          }
          if (tUSD) {
            be[emp].tickers.add(`${tUSD}|USD`);
            meta[tUSD] = {
              moneda: 'USD',
              minNominal: r.minNominalUSD || 0,
              tasa: r.tasa || 0,
              empresa: emp,
            };
            (bt[tUSD] = bt[tUSD] || []).push({
              fecha: r.fecha,
              intereses: r.intereses,
              capital: r.capital,
              residual: r.residual,
            });
          }
        });

        Object.values(bt).forEach((arr) => arr.sort((a, b) => a.fecha - b.fecha));

        setRows(newRows);
        setByEmpresa(be);
        setByTicker(bt);
        setMetaTicker(meta);
        setMapsUSD(buildARSUSDMap(newRows));

        // 2) cotizaciones
        const settled = await Promise.allSettled(
          QUOTES_SOURCES.map((s) =>
            fetch(s.url)
              .then((r) => r.json())
              .then((a) => ({ name: s.name, data: a }))
          )
        );
        const q = {};
        for (const res of settled) {
          if (res.status !== 'fulfilled') continue;
          const { name, data } = res.value;
          if (!Array.isArray(data)) continue;

          data.forEach((it) => {
            const sym = it.symbol;
            if (!sym) return;
            const ask = Number(it.px_ask);
            const hasAsk = Number.isFinite(ask);
            if (!q[sym]) {
              q[sym] = { ...it, __src: name };
            } else {
              const curAsk = Number(q[sym].px_ask);
              const curHasAsk = Number.isFinite(curAsk);
              if (!curHasAsk && hasAsk) {
                q[sym] = { ...it, __src: name };
              }
            }
          });
        }
        setQuotes(q);

        // 3) MEP
        try {
          const resMEP = await fetch('https://dolarapi.com/v1/dolares/bolsa');
          const dataMEP = await resMEP.json();
          const mep = Number(dataMEP?.venta) || Number(dataMEP?.compra) || null;
          setMepRate(mep);
        } catch (e) {
          console.error('Error MEP', e);
          setMepRate(null);
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Error cargando datos. Verificá FinancialData y las APIs.');
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // --------- HELPERS DERIVADOS ---------

  const empresasOrdenadas = useMemo(() => Object.keys(byEmpresa).sort(), [byEmpresa]);

  const tickersEmpresaActiva = useMemo(() => {
    if (!empresaActiva || !byEmpresa[empresaActiva]) return [];
    return [...byEmpresa[empresaActiva].tickers].sort().map((s) => {
      const [t, mon] = s.split('|');
      return { ticker: t, moneda: mon };
    });
  }, [empresaActiva, byEmpresa]);

  const getQuote = (sym) => {
    if (!sym) return null;
    return quotes[String(sym).trim()] || null;
  };

  const quotePer100 = (ticker) => {
    const q = getQuote(ticker);
    if (!q) return null;
    const ask = Number(q.px_ask);
    const last = Number(q.c);
    const raw = Number.isFinite(ask) && ask > 0 ? ask : Number.isFinite(last) && last > 0 ? last : NaN;
    if (!Number.isFinite(raw)) return null;
    const meta = metaTicker[ticker] || {};

    if (raw >= 1000) return raw / 100;

    if (meta.moneda === 'USD') {
      if (isSovereignOrProvince(meta, ticker)) {
        return raw;
      }
      if (raw < 50) return raw * 100;
      return raw;
    }

    return raw;
  };

  const displayTicker = (t) => {
    const k = String(t || '').trim();
    if (!k) return '';
    if (mapsUSD.mapUSD2ARS && mapsUSD.mapUSD2ARS.has(k)) return mapsUSD.mapUSD2ARS.get(k);
    return k;
  };

  const pickTickerForPrice = (group, metaTickerLocal) => {
    const arr = [...group.setTickers];
    const usd = arr.find((t) => metaTickerLocal[t]?.moneda === 'USD');
    return usd || arr.find((t) => metaTickerLocal[t]?.moneda === 'ARS') || arr[0];
  };

  // --------- CÁLCULOS GLOBAL PORTFOLIO / TIR ---------

  const fechaValDate = useMemo(() => toDate(fechaValuacion), [fechaValuacion]);

  const calcTIRyParidad = useMemo(() => {
    if (!fechaValDate || !obligaciones.length) return [];
    const out = [];
    const seen = new Set();

    obligaciones.forEach((item) => {
      const usdTicker = resolveUSDFor(item.ticker, mapsUSD);
      if (!usdTicker) return;
      if (seen.has(usdTicker)) return;
      seen.add(usdTicker);

      const priceQuoted = quotePer100(usdTicker);
      const dev = accruedPer100(usdTicker, fechaValDate, byTicker, metaTicker);
      const vr = residualHoyPer100(usdTicker, fechaValDate, byTicker);

      const k = 1;
      const priceDirtyPer100 = priceQuoted;
      const desembolso = priceDirtyPer100 == null ? 0 : -priceDirtyPer100 * k;

      const cflows = [{ date: fechaValDate, amount: desembolso }];
      (byTicker[usdTicker] || []).forEach((cf) => {
        if (cf.fecha <= fechaValDate) return;
        const amt = ((cf.capital || 0) + (cf.intereses || 0)) * k;
        if (amt !== 0) cflows.push({ date: cf.fecha, amount: amt });
      });

      const r = priceDirtyPer100 == null ? null : irr(cflows, 0.1);

      const { macaulay, modified } =
        r != null ? durationFor(usdTicker, fechaValDate, r, byTicker, quotePer100) : { macaulay: null, modified: null };

      const vt = vr != null && dev != null ? vr + dev : null;
      const paridad = priceQuoted != null && vt != null && vt > 0 ? (priceQuoted / vt) * 100 : null;

      out.push({
        ticker: usdTicker,
        tir: r != null ? r * 100 : null,
        paridad,
        vt,
        price: priceQuoted,
        vr,
        dev,
        durMac: macaulay,
        durMod: modified,
      });
    });

    return out;
  }, [byTicker, fechaValDate, mapsUSD, metaTicker, obligaciones]);

  const tirPortafolio = useMemo(() => {
    if (!obligaciones.length || !calcTIRyParidad.length || !fechaValDate) return null;

    const metricsByUsd = new Map();
    calcTIRyParidad.forEach((m) => metricsByUsd.set(m.ticker, m));

    let sumW = 0;
    let sumTIR = 0;

    obligaciones.forEach((item) => {
      const usdTicker = resolveUSDFor(item.ticker, mapsUSD);
      if (!usdTicker) return;

      const meta = metaTicker[item.ticker] || {};
      const pricePer100 = quotePer100(item.ticker);
      let invUSD = null;
      if (meta.moneda === 'USD') {
        const cotPer1 = pricePer100 != null ? pricePer100 / 100 : null;
        invUSD = cotPer1 != null ? item.nominal * cotPer1 : null;
      } else if (meta.moneda === 'ARS') {
        if (!mepRate || mepRate <= 0) return;
        invUSD = pricePer100 != null ? (item.nominal * pricePer100) / mepRate : null;
      }
      if (invUSD == null || !(invUSD > 0)) return;

      const met = metricsByUsd.get(usdTicker);
      if (!met || met.tir == null) return;

      const tirDec = met.tir / 100;
      sumTIR += invUSD * tirDec;
      sumW += invUSD;
    });

    if (!sumW) return null;
    return sumTIR / sumW; // decimal
  }, [calcTIRyParidad, mepRate, metaTicker, mapsUSD, obligaciones, quotePer100, fechaValDate]);

  const inversionTotals = useMemo(() => {
    let totalARS = 0;
    let totalUSD = 0;

    obligaciones.forEach((item) => {
      const meta = metaTicker[item.ticker] || {};
      const pricePer100 = quotePer100(item.ticker);
      if (meta.moneda === 'ARS') {
        const monto = pricePer100 != null ? item.nominal * pricePer100 : 0;
        totalARS += monto;
      } else if (meta.moneda === 'USD') {
        const cotPer1 = pricePer100 != null ? pricePer100 / 100 : null;
        const monto = cotPer1 != null ? item.nominal * cotPer1 : 0;
        totalUSD += monto;
      }
    });

    const totalEnUSD = mepRate && mepRate > 0 ? totalUSD + totalARS / mepRate : null;
    const totalEnARS = mepRate && mepRate > 0 ? totalARS + totalUSD * mepRate : null;

    return { totalARS, totalUSD, totalEnUSD, totalEnARS };
  }, [metaTicker, obligaciones, mepRate, quotePer100]);

  const cashflowData = useMemo(() => {
    if (!fechaValDate || !obligaciones.length) {
      return {
        porFecha: [],
        flujoAnual: {},
        flujoMensual: {},
        years: [],
        flujoAnualDerivado: {},
      };
    }
    const { porFecha, flujoAnual, flujoMensual, years } = buildCashflows(fechaValDate, obligaciones, byTicker);
    const flujoAnualDerivado = annualFromMonthly(flujoMensual);
    return { porFecha, flujoAnual, flujoMensual, years, flujoAnualDerivado };
  }, [byTicker, fechaValDate, obligaciones]);

    // Datos para gráfico anual (Recharts)
  const anualChartData = useMemo(() => {
    const { years, flujoAnualDerivado, flujoMensual } = cashflowData;
    if (!years.length) return [];

    const base = years.map((y) => ({
      year: y,
      capital: flujoAnualDerivado[y]?.cap || 0,
      intereses: flujoAnualDerivado[y]?.int || 0,
      reinversion: 0,
    }));

    if (reinvertir && tirPortafolio != null) {
      const gains = buildReinvDeltaAnnualAligned(flujoMensual, years, tirPortafolio);
      return base.map((row, idx) => ({
        ...row,
        reinversion: gains[idx] || 0,
      }));
    }

    return base;
  }, [cashflowData, reinvertir, tirPortafolio]);


  // Datos para gráfico mensual (Recharts)
  const mensualChartData = useMemo(() => {
    const { flujoMensual } = cashflowData;
    const yearSel = Number(anioSeleccionado);
    if (!yearSel) return [];

    const labelsM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    return labelsM.map((name, idx) => {
      const key = `${yearSel}-${String(idx + 1).padStart(2, '0')}`;
      const fm = flujoMensual[key] || { cap: 0, int: 0 };
      return {
        mes: name,
        capital: fm.cap,
        intereses: fm.int,
      };
    });
  }, [cashflowData, anioSeleccionado]);

  // set año por defecto si no hay
  useEffect(() => {
    if (!cashflowData.years.length) return;
    if (!anioSeleccionado || !cashflowData.years.includes(Number(anioSeleccionado))) {
      setAnioSeleccionado(String(cashflowData.years[0]));
    }
  }, [cashflowData.years, anioSeleccionado]);

  // --------- CHARTS (Chart.js desde window) ---------



  // --------- HANDLERS UI ---------

  const handleAgregar = () => {
    if (!empresaActiva) {
      alert('Elegí una empresa');
      return;
    }
    if (!tickerSeleccionado) {
      alert('Elegí un ticker');
      return;
    }
    const nom = parseFloat(nominales || '0');
    if (!(nom > 0)) {
      alert('Ingresá nominales válidos');
      return;
    }
    if (!fechaValuacion) {
      alert('Seleccioná fecha de valuación');
      return;
    }

    const meta = metaTicker[tickerSeleccionado] || { minNominal: 0 };
    if (meta.minNominal && nom < meta.minNominal) {
      setWarningMin(`El mínimo de nominales es ${meta.minNominal}. Aumentá los nominales.`);
      return;
    }
    setWarningMin('');

    setObligaciones((prev) => [...prev, { empresa: empresaActiva, ticker: tickerSeleccionado, nominal: nom }]);
  };

  const handleLimpiar = () => {
    setObligaciones([]);
  };

  const groupedLista = useMemo(() => {
    const grup = new Map();
    obligaciones.forEach((it) => {
      const disp = displayTicker(it.ticker);
      const meta = metaTicker[it.ticker] || {};
      const g = grup.get(disp) || {
        empresa: it.empresa,
        setTickers: new Set(),
        nominalTotal: 0,
        metaVisual: meta,
      };
      g.setTickers.add(it.ticker);
      g.nominalTotal += Number(it.nominal || 0);
      grup.set(disp, g);
    });
    return [...grup.entries()];
  }, [obligaciones, metaTicker, mapsUSD]);

  // --------- RENDER ---------

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sky-700 mr-3" />
          <span className="text-slate-600">Cargando datos de instrumentos...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-sm text-slate-600">
            Revisá que las series <code>data</code>, <code>perfil</code> y <code>minimo_nominal</code> existan en
            FinancialData y los <code>category</code> de este componente.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2 bg-sky-700 hover:bg-sky-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* CARD 1: Selección y carga */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sky-900 text-lg flex items-center justify-between gap-2">
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logos empresas */}
          <div>
            <h3 className="text-xs font-semibold text-sky-900 text-center mb-2 uppercase tracking-wide">
              Elegí un emisor
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {empresasOrdenadas.map((emp) => {
                const info = byEmpresa[emp];
                const url = COMPANY_LOGOS[emp];
                const isActive = emp === empresaActiva;
                const perfilLabel = [...(info?.perfiles || [])];
                const labelPerfil =
                  perfilLabel.length === 1
                    ? perfilLabel[0]
                    : perfilLabel.length > 1
                    ? 'Mixto'
                    : '';
                const badgeClass = stylePerfilFrom(labelPerfil);

                return (
                  <button
                    key={emp}
                    type="button"
                    className={`relative flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl border shadow-sm text-center transition-all ${
                      isActive
                        ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50'
                        : 'border-slate-200 hover:border-sky-200 hover:shadow-md bg-white'
                    }`}
                    onClick={() => {
                      setEmpresaActiva(emp);
                      setTickerSeleccionado('');
                    }}
                  >
                    {labelPerfil && (
                      <span
                        className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-sm border ${badgeClass}`}
                      >
                        {labelPerfil}
                      </span>
                    )}
                    {url ? (
                      <img
                        src={url}
                        alt={emp}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {!url && (
                      <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-800 font-bold text-sm">
                        {initialsFrom(emp)}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-sky-900 leading-tight mt-1">{emp}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila de carga de instrumento */}
          <div className="border-t border-slate-200 pt-4 mt-2">
            <h3 className="text-xs font-semibold text-sky-900 text-center mb-3 uppercase tracking-wide">
              Cargar instrumento
            </h3>

            <div
              className={`grid gap-3 md:grid-cols-4 ${
                empresaActiva ? '' : 'opacity-60 pointer-events-none'
              }`}
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">Empresa seleccionada</div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  {empresaActiva || '—'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">Ticker</div>
                <Select
                  value={tickerSeleccionado}
                  onValueChange={(v) => setTickerSeleccionado(v)}
                  disabled={!empresaActiva}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="— seleccionar —" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {tickersEmpresaActiva.map(({ ticker, moneda }) => (
                      <SelectItem key={ticker} value={ticker}>
                        {ticker} ({moneda})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-[11px] text-slate-500 min-h-[1.1rem]">
                  {tickerSeleccionado && metaTicker[tickerSeleccionado] && (
                    <>
                      Moneda: {metaTicker[tickerSeleccionado].moneda} · Tasa (sheet):{' '}
                      {metaTicker[tickerSeleccionado].tasa || '—'}% · Mínimo nominal:{' '}
                      {metaTicker[tickerSeleccionado].minNominal || 0}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">Nominales</div>
                <Input
                  type="number"
                  min="1"
                  value={nominales}
                  onChange={(e) => setNominales(e.target.value)}
                  placeholder="Ej: 1000"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-700">Fecha de valuación</div>
                <Input
                  type="date"
                  value={fechaValuacion}
                  onChange={(e) => setFechaValuacion(e.target.value)}
                  className="h-9 text-xs"
                />
                <div className="text-[11px] text-slate-500">
                  Se usa para TIR, devengado y flujos futuros.
                </div>
              </div>
            </div>

            {warningMin && (
              <div className="mt-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {warningMin}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                className="bg-sky-700 hover:bg-sky-800 text-xs"
                onClick={handleAgregar}
              >
                + Agregar instrumento
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleLimpiar}
              >
                Limpiar lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Lista de instrumentos */}
      {obligaciones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-sky-900 text-center">
              Instrumentos agregados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Nominales</TableHead>
                  <TableHead>Min. nominal</TableHead>
                  <TableHead>Cotización</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedLista.map(([disp, g]) => {
                  const meta = g.metaVisual || {};
                  const tForPrice = pickTickerForPrice(g, metaTicker);
                  const metaPrecio = metaTicker[tForPrice] || {};

                  const cotPer100 = quotePer100(tForPrice);
                  const esUSD = metaPrecio.moneda === 'USD';

                  const cotizacionMostrar =
                    esUSD && cotPer100 != null ? cotPer100 / 100 : cotPer100;
                  const total = esUSD
                    ? cotPer100 != null
                      ? g.nominalTotal * (cotPer100 / 100)
                      : null
                    : cotPer100 != null
                    ? g.nominalTotal * cotPer100
                    : null;

                  const cotFmt =
                    cotizacionMostrar != null
                      ? esUSD
                        ? fmtMoneyUSD(cotizacionMostrar)
                        : fmtMoneyARS(cotizacionMostrar)
                      : '—';

                  const totFmt =
                    total != null
                      ? esUSD
                        ? fmtMoneyUSD(total)
                        : fmtMoneyARS(total)
                      : '—';

                  return (
                    <TableRow key={disp}>
                      <TableCell>{g.empresa}</TableCell>
                      <TableCell>
                        {disp} ({metaPrecio.moneda || ''})
                      </TableCell>
                      <TableCell>{g.nominalTotal}</TableCell>
                      <TableCell>{meta.minNominal || 0}</TableCell>
                      <TableCell>{cotFmt}</TableCell>
                      <TableCell>{totFmt}</TableCell>
                      <TableCell>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-[11px]"
                          onClick={() =>
                            setObligaciones((prev) =>
                              prev.filter((it) => displayTicker(it.ticker) !== disp)
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* CARD 3: Resultado, gráficos, tablas y TIR */}
      {obligaciones.length > 0 && fechaValDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sky-900 text-base">
              <span>Resultado del portafolio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Totales */}
            <div className="space-y-1">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-900">
                  Inversión: {fmtMoneyARS(inversionTotals.totalARS)}
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                  Inversión USD: {fmtMoneyUSD(inversionTotals.totalUSD)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {inversionTotals.totalEnUSD != null && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                    Total (USD c/MEP): {fmtMoneyUSD(inversionTotals.totalEnUSD)}
                  </div>
                )}
                {inversionTotals.totalEnARS != null && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-xs font-semibold text-fuchsia-900">
                    Total ($ c/MEP): {fmtMoneyARS(inversionTotals.totalEnARS)}
                  </div>
                )}
              </div>
            </div>

            {/* TIR portafolio + toggle reinversión */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReinvertir((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reinvertir ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      reinvertir ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-sky-900">
                  Reinvertir flujos a TIR del portafolio
                </span>
              </div>
              {tirPortafolio != null && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                  TIR Portafolio: {fmtPerc(tirPortafolio * 100)}
                </span>
              )}
            </div>

            {/* Gráficos */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Gráfico anual */}
              <div className="h-80 border rounded-lg p-2">
                <div className="text-xs font-semibold text-sky-900 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Flujo anual (capital + intereses)
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={anualChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <RechartsTooltip
                      formatter={(value, name) => [`${fmtNum1(value)} USD`, name]}
                    />
                    <Legend />
                    <Bar dataKey="intereses" stackId="base" fill="rgba(94,166,215,0.85)" />
                    <Bar dataKey="capital" stackId="base" fill="rgba(232,141,161,0.85)" />
                    {reinvertir && (
                      <Bar
                        dataKey="reinversion"
                        stackId="base"
                        fill="rgba(22,163,74,0.75)"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico mensual */}
              <div className="h-80 border rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-sky-900 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Flujo mensual del año seleccionado
                  </div>
                  {cashflowData.years.length > 0 && (
                    <Select
                      value={anioSeleccionado || ''}
                      onValueChange={(v) => setAnioSeleccionado(v)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-28">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        {cashflowData.years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mensualChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <RechartsTooltip
                      formatter={(value, name) => [`${fmtNum1(value)} USD`, name]}
                    />
                    <Legend />
                    <Bar dataKey="intereses" stackId="base" fill="#5EA6D7" />
                    <Bar dataKey="capital" stackId="base" fill="#e88da1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla portafolio: TIR ponderada y durations */}
            <div>
              <h3 className="text-xs font-bold text-sky-900 mb-1 text-center bg-sky-50 border border-sky-100 rounded-md py-1">
                Datos del portafolio
              </h3>
              <Table className="text-xs">
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">
                      TIR del portafolio (ponderada)
                    </TableCell>
                    <TableCell className="text-right">
                      {tirPortafolio == null ? '—' : fmtPerc(tirPortafolio * 100)}
                    </TableCell>
                  </TableRow>
                  {/* Podrías agregar aquí durations ponderadas si querés sumarlas más adelante */}
                  <TableRow>
                    <TableCell colSpan={2} className="text-[11px] text-slate-500">
                      Ponderación por monto invertido en USD (ARS convertidos con MEP
                      {mepRate ? ` ${mepRate.toFixed(2)} ARS/USD` : ''}).
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Tabla TIR por instrumento */}
            <div>
              <h3 className="text-xs font-bold text-sky-900 mb-1 text-center bg-sky-50 border border-sky-100 rounded-md py-1">
                TIR y paridad por instrumento
              </h3>
              <Table className="text-[11px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>TIR (anual)</TableHead>
                    <TableHead>Paridad</TableHead>
                    <TableHead>Valor técnico</TableHead>
                    <TableHead>Cotización</TableHead>
                    <TableHead>Valor residual (VR)</TableHead>
                    <TableHead>Devengado</TableHead>
                    <TableHead>Dur. Macaulay (años)</TableHead>
                    <TableHead>Dur. Modificada (años)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calcTIRyParidad.map((r) => (
                    <TableRow key={r.ticker}>
                      <TableCell>{r.ticker}</TableCell>
                      <TableCell>{r.tir == null ? '—' : fmtPerc(r.tir)}</TableCell>
                      <TableCell>{r.paridad == null ? '—' : fmtPerc(r.paridad)}</TableCell>
                      <TableCell>{r.vt == null ? '—' : r.vt.toFixed(2)}</TableCell>
                      <TableCell>{r.price == null ? '—' : r.price.toFixed(2)}</TableCell>
                      <TableCell>{r.vr == null ? '—' : r.vr.toFixed(2)}</TableCell>
                      <TableCell>{r.dev == null ? '—' : r.dev.toFixed(2)}</TableCell>
                      <TableCell>{r.durMac == null ? '—' : r.durMac.toFixed(2)}</TableCell>
                      <TableCell>{r.durMod == null ? '—' : r.durMod.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-[11px] text-slate-500 mt-1">
                Paridad = Cotización de hoy / Valor técnico. Valor técnico = Residual a hoy + Devengado (por cada 100
                VN).
              </p>
            </div>

            {/* Tablas de flujo anual y mensual */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <h3 className="text-xs font-bold text-sky-900 mb-1 text-center bg-sky-50 border border-sky-100 rounded-md py-1">
                  Flujo anual
                </h3>
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Año</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Intereses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashflowData.years.map((y) => {
                      const fa = cashflowData.flujoAnualDerivado[y] || { cap: 0, int: 0 };
                      return (
                        <TableRow key={y}>
                          <TableCell>{y}</TableCell>
                          <TableCell>{fmtNum1(fa.cap)} USD</TableCell>
                          <TableCell>{fmtNum1(fa.int)} USD</TableCell>
                        </TableRow>
                      );
                    })}
                    {cashflowData.years.length > 0 && (
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="font-semibold">
                          {fmtNum1(
                            cashflowData.years.reduce(
                              (acc, y) =>
                                acc + (cashflowData.flujoAnualDerivado[y]?.cap || 0),
                              0
                            )
                          )}{' '}
                          USD
                        </TableCell>
                        <TableCell className="font-semibold">
                          {fmtNum1(
                            cashflowData.years.reduce(
                              (acc, y) =>
                                acc + (cashflowData.flujoAnualDerivado[y]?.int || 0),
                              0
                            )
                          )}{' '}
                          USD
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-xs font-bold text-sky-900 mb-1 text-center bg-sky-50 border border-sky-100 rounded-md py-1">
                  Flujo mensual {anioSeleccionado ? `(${anioSeleccionado})` : ''}
                </h3>
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Intereses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anioSeleccionado &&
                      ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map(
                        (name, idx) => {
                          const key = `${anioSeleccionado}-${String(idx + 1).padStart(2, '0')}`;
                          const fm = cashflowData.flujoMensual[key] || { cap: 0, int: 0 };
                          return (
                            <TableRow key={key}>
                              <TableCell>{name}</TableCell>
                              <TableCell>{fmtNum1(fm.cap)} USD</TableCell>
                              <TableCell>{fmtNum1(fm.int)} USD</TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    {anioSeleccionado && (
                      <TableRow>
                        <TableCell className="font-semibold">
                          Total {anioSeleccionado}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {fmtNum1(
                            Array.from({ length: 12 }).reduce((acc, _, idx) => {
                              const key = `${anioSeleccionado}-${String(idx + 1).padStart(2, '0')}`;
                              return acc + (cashflowData.flujoMensual[key]?.cap || 0);
                            }, 0)
                          )}{' '}
                          USD
                        </TableCell>
                        <TableCell className="font-semibold">
                          {fmtNum1(
                            Array.from({ length: 12 }).reduce((acc, _, idx) => {
                              const key = `${anioSeleccionado}-${String(idx + 1).padStart(2, '0')}`;
                              return acc + (cashflowData.flujoMensual[key]?.int || 0);
                            }, 0)
                          )}{' '}
                          USD
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
