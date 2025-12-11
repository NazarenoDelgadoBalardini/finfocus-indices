import { FinancialData } from '@/entities/FinancialData';
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
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

// ======================
// Config general
// ======================
const SHEET_ID = '1cWgD3_oU6FpMSwYSdqNHLAOYtYX30QAH';
const SHEET_EVOL_NAME = 'Real vs. teórica';
const SHEET_CARTERAS_NAME = 'Carteras';
const SHEET_BOLETOS_TAB = 'Boletos';
const LOCALE = 'es-AR';

const MES_3 = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// Para boletos
const MONTH_ORDER = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// En la hoja Boletos, el link está en la columna C,
// y en el select vamos a pedir A,B,C => índices 0,1,2
const LINK_COL_INDEX = 2;

// ======================
// Helpers GViz
// ======================
const gvizQueryURL = (sheetId, sheetName, tq) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName
  )}&tq=${encodeURIComponent(tq)}`;

const gvizRangeURL = (sheetId, sheetName, range) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName
  )}&range=${encodeURIComponent(range)}&tq=${encodeURIComponent(
    'select *'
  )}`;

async function fetchGViz(url) {
  const res = await fetch(url, { mode: 'cors' });
  const txt = await res.text();
  return JSON.parse(
    txt.replace(/^[\s\S]*setResponse\(/, '').replace(/\);?$/, '')
  );
}

// ======================
// Helpers comunes
// ======================
function toNumber(x) {
  if (typeof x === 'number') return x;
  if (x == null) return NaN;
  let s = String(x).trim();
  // "1.234,56" -> 1234.56
  if (/\d\.\d{3},\d{2}/.test(s) || /,\d{1,}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  return Number.parseFloat(s);
}

const fmtMoney = (n) =>
  (isFinite(n) ? n : 0).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n) =>
  (isFinite(n) ? n : 0).toFixed(2).replace('.', ',') + ' %';

function normSym(sym) {
  if (!sym) return '';
  let s = String(sym).trim().toUpperCase();
  s = s.replace(/\.(BA|AR|B|X[A-Z]{2})$/i, '');
  s = s.replace(/\s+/g, '');
  return s;
}

// ======================
// Helpers para FinancialData (headers / columnas)
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
// Helpers fechas / labels Evolución
// ======================
function labelFromCellA(cell) {
  if (!cell) return '';
  const v = cell.v;

  // 1) GViz típico: v = "Date(YYYY,MM,DD)" -> sep-25
  if (typeof v === 'string' && /^Date\(/.test(v)) return formatGvizDate(v);

  // 2) Date real
  if (Object.prototype.toString.call(v) === '[object Date]') {
    const y = v.getFullYear();
    const mo = v.getMonth(); // 0-index
    return `${MES_3[mo]}-${String(y).slice(-2)}`;
  }

  // 3) Formato "1/9/2025" en cell.f
  if (cell.f) return fromDMY(cell.f);

  // 4) Fallback
  return normalizeLabel(String(v ?? ''));
}

function formatGvizDate(s) {
  const m = s.match(/^Date\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return s;
  const y = +m[1];
  const mo = +m[2]; // mes 0-index
  return `${MES_3[mo]}-${String(y).slice(-2)}`;
}

function fromDMY(s) {
  s = String(s).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return normalizeLabel(s);
  const mon = +m[2] - 1;
  let y = +m[3];
  if (y < 100) y = 2000 + y;
  return `${MES_3[mon]}-${String(y).slice(-2)}`;
}

function normalizeLabel(s) {
  s = s.toLowerCase().trim();
  s = s.replace(/\./g, '');
  s = s.replace(/\s+de\s+/g, '-');
  s = s.replace(/\s+/g, '-');
  s = s.replace('sept', 'sep');
  s = s.replace(/-(\d{4})$/, (_, y) => '-' + y.slice(-2));
  return s;
}

// ======================
// Fetch serie evolución (Real vs Teórica vs Colchón) desde FinancialData
// ======================
async function fetchSeriesEvolucion() {
  const all = await FinancialData.list('-lastSync');

  const fd = (all || []).find(
    (f) => (f.category || '').toLowerCase() === 'teorica_versus_real'
  );

  if (!fd) {
    console.warn('No se encontró la serie "teorica_versus_real" en FinancialData');
    return { labels: [], colchon: [], teorica: [], real: [] };
  }

  const rawData = fd.data || [];

  // 1) Detectar encabezados: fd.headers o primera fila del data
  let headers = fd.headers && fd.headers.length ? fd.headers : [];
  let dataRows = rawData;

  if (!headers.length && rawData.length > 0 && Array.isArray(rawData[0])) {
    headers = rawData[0];
    dataRows = rawData.slice(1); // resto son datos
  }

  // 2) Buscar índices de columnas para FINFOCUS START
  const idxMes = findCol(headers, 'Mes');
  const idxColchonStart = findCol(headers, 'FINFOCUS START (colchón)');
  const idxTeoricaStart = findCol(headers, 'FINFOCUS START (teórica)');
  const idxRealStart = findCol(headers, 'FINFOCUS START (real)');

  if (
    idxMes === -1 ||
    idxColchonStart === -1 ||
    idxTeoricaStart === -1 ||
    idxRealStart === -1
  ) {
    console.warn(
      'No se encontraron todas las columnas de FINFOCUS START en teorica_versus_real'
    );
    return { labels: [], colchon: [], teorica: [], real: [] };
  }

const labels = [];
const colchon = [];
const teorica = [];
const real = [];

  for (const row of dataRows) {
    if (!row) continue;

    const mesRaw = row[idxMes];
    const colchonRaw = row[idxColchonStart];
    const teoricaRaw = row[idxTeoricaStart];
    const realRaw = row[idxRealStart];

    const label = mesRaw != null ? String(mesRaw).trim() : '';
    const c = toNumber(colchonRaw);
    const t = toNumber(teoricaRaw);
    const r = toNumber(realRaw);

    // Solo guardamos filas donde START tenga datos válidos
    if (label && Number.isFinite(c) && Number.isFinite(t) && Number.isFinite(r)) {
      labels.push(label);
      colchon.push(c);
      teorica.push(t);
      real.push(r);
    }
  }

  return { labels, colchon, teorica, real };
}

// ======================
// Fetch carteras desde FinancialData (FINFOCUS PESOS)
// ======================
async function fetchSheetTickers() {
  const all = await FinancialData.list('-lastSync');

  const fd = (all || []).find(
    (f) => (f.category || '').toLowerCase() === 'carteras'
  );

  if (!fd) {
    console.warn('No se encontró la serie "carteras" en FinancialData');
    return [];
  }

  const headers = fd.headers || [];
  const data = fd.data || [];

  const idxTicker = findCol(headers, 'Ticker');
  const idxFinfocusPesos = findCol(headers, 'FINFOCUS PESOS');

  if (idxTicker === -1 || idxFinfocusPesos === -1) {
    console.warn('No se encontraron columnas Ticker / FINFOCUS PESOS en "carteras"');
    return [];
  }

  const rows = [];

  for (const row of data) {
    const rawTicker = row[idxTicker];
    const rawVal = row[idxFinfocusPesos];

    const ticker = rawTicker != null ? String(rawTicker).trim() : '';
    const cantidad = toNumber(rawVal);

    if (!ticker || !Number.isFinite(cantidad) || cantidad <= 0) continue;

    rows.push({
      ticker,
      cantidad,
    });
  }

  return rows;
}

async function fetchPreciosARS() {
  const [rc, rb, rn] = await Promise.allSettled([
    fetch('https://data912.com/live/arg_corp', { mode: 'cors' }),
    fetch('https://data912.com/live/arg_bonds', { mode: 'cors' }),
    fetch('https://data912.com/live/arg_notes', { mode: 'cors' }),
  ]);

  const asJson = async (r) =>
    r.status === 'fulfilled' ? r.value.json() : [];

  const corp = await asJson(rc).catch(() => []);
  const bonds = await asJson(rb).catch(() => []);
  const notes = await asJson(rn).catch(() => []);
  const merged = [...corp, ...bonds, ...notes];

  const map = {};
  for (const it of merged) {
    const sym = normSym(
      it.symbol || it['símbolo'] || it.ticker || it.Ticker
    );
    const pxCandidates = [
      it.px_ask,
      it.ask,
      it.last,
      it.px_last,
      it.price,
      it.c,
    ];
    const px = pxCandidates.map(toNumber).find((n) => isFinite(n) && n > 0);
    if (sym && isFinite(px)) map[sym] = px;
  }
  return map;
}

// ======================
// Helpers para Boletos
// ======================
function normalizeMonthBoletos(m) {
  if (!m) return null;
  const s = String(m).trim().toLowerCase();
  const cap = s.charAt(0).toUpperCase() + s.slice(1);

  const map = {
    ene: 'Enero',
    feb: 'Febrero',
    mar: 'Marzo',
    abr: 'Abril',
    may: 'Mayo',
    jun: 'Junio',
    jul: 'Julio',
    ago: 'Agosto',
    sep: 'Septiembre',
    sept: 'Septiembre',
    oct: 'Octubre',
    nov: 'Noviembre',
    dic: 'Diciembre',
  };

  if (MONTH_ORDER.includes(cap)) return cap;
  const key = cap.replace(/\./g, '').slice(0, 4).toLowerCase();
  return map[key] || cap;
}

function sortByMonth(a, b) {
  const ia = MONTH_ORDER.indexOf(a.mes);
  const ib = MONTH_ORDER.indexOf(b.mes);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

function parseRowsToStructure(rows, linkColIndex) {
  const byYear = {};
  rows.forEach((r) => {
    if (!r || r.length < 2) return;
    const year = String(r[0] ?? '').trim();
    const mes = normalizeMonthBoletos(r[1]);
    const url = (r[linkColIndex] ?? '').toString().trim();
    if (!year || !mes || !url) return;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({ mes, url });
  });
  Object.keys(byYear).forEach((y) => byYear[y].sort(sortByMonth));
  return byYear;
}

// ======================
// Component principal
// ======================
export default function CarteraFinfocusTabs() {
  // Evolución
  const [evoData, setEvoData] = useState(null);
  const [evoLoading, setEvoLoading] = useState(true);
  const [evoError, setEvoError] = useState(null);

  const [visibleLines, setVisibleLines] = useState({
    real: true,
    teorica: true,
    colchon: true,
  });

  const toggleLine = (key) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Composición
  const [rowsComp, setRowsComp] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [compLoading, setCompLoading] = useState(true);
  const [compError, setCompError] = useState(null);

  // Boletos
  const [boletosData, setBoletosData] = useState({});
  const [boletosLoading, setBoletosLoading] = useState(true);
  const [boletosError, setBoletosError] = useState(null);
  const [openYear, setOpenYear] = useState(null);

  // === Efecto Evolución ===
  useEffect(() => {
    let isMounted = true;

    async function loadEvolucion() {
      try {
        setEvoLoading(true);
        setEvoError(null);
        const series = await fetchSeriesEvolucion();
        if (!isMounted) return;

        const { labels, colchon, teorica, real } = series;
        if (!labels.length) {
          setEvoError(
            'No se encontraron filas con datos válidos en "Real vs. teórica".'
          );
          setEvoData(null);
        } else {
          const data = labels.map((lab, idx) => ({
            label: lab,
            colchon: colchon[idx],
            teorica: teorica[idx],
            real: real[idx],
          }));
          setEvoData(data);
        }
      } catch (e) {
        console.error(e);
        if (isMounted)
          setEvoError(
            'Ocurrió un error al cargar la evolución. Ver consola.'
          );
      } finally {
        if (isMounted) setEvoLoading(false);
      }
    }

    loadEvolucion();
    return () => {
      isMounted = false;
    };
  }, []);

// === Efecto Composición ===
useEffect(() => {
  let isMounted = true;

  async function loadComposicion() {
    try {
      setCompLoading(true);
      setCompError(null);

      // 1) Cantidades por ticker desde FinancialData (FINFOCUS PESOS)
      const items = await fetchSheetTickers();
      if (!isMounted) return;

      if (!items.length) {
        setCompError(
          'No se encontraron tickers con cantidad > 0 en la serie "carteras" (FINFOCUS PESOS).'
        );
        setRowsComp([]);
        setTotalGeneral(0);
        return;
      }

      // 2) Precios de mercado
      const preciosMap = await fetchPreciosARS();
      if (!isMounted) return;

      let sumaActivos = 0;
      let liquidezVal = 0;

      const rows = items.map(({ ticker, cantidad }) => {
        const symNorm = normSym(ticker);
        const esLiquidez = symNorm === 'LIQUIDEZ';

        if (esLiquidez) {
          // Interpretamos FINFOCUS PESOS como monto de liquidez ya en $
          liquidezVal += cantidad;
          return {
            ticker: 'Liquidez',
            cantidad: null,
            precio: null,
            totalInvertido: cantidad,
            porcentaje: 0,
            isLiquidez: true,
          };
        }

        // Activos con precio de mercado (ONs / bonos / etc.)
        let precio = preciosMap[symNorm];

        if (!isFinite(precio)) {
          const key = Object.keys(preciosMap).find((k) =>
            k.startsWith(symNorm)
          );
          if (key) precio = preciosMap[key];
        }

        const precioNum = isFinite(precio) ? precio : 0;
        const totalInvertido = cantidad * (precioNum / 100);

        sumaActivos += totalInvertido;

        return {
          ticker,
          cantidad,
          precio: precioNum || null,
          totalInvertido,
          porcentaje: 0,
          isLiquidez: false,
        };
      });

      const totalGeneral = sumaActivos + liquidezVal;

      const rowsConPct = rows.map((r) => ({
        ...r,
        porcentaje:
          totalGeneral > 0
            ? (r.totalInvertido / totalGeneral) * 100
            : 0,
      }));

      setRowsComp(rowsConPct);
      setTotalGeneral(totalGeneral);
    } catch (e) {
      console.error(e);
      if (isMounted)
        setCompError('Error al cargar composición desde FinancialData. Ver consola.');
    } finally {
      if (isMounted) setCompLoading(false);
    }
  }

  loadComposicion();
  return () => {
    isMounted = false;
  };
}, []);

// === Efecto Boletos ===
useEffect(() => {
  let isMounted = true;

  async function loadBoletos() {
    try {
      setBoletosLoading(true);
      setBoletosError(null);

      const all = await FinancialData.list('-lastSync');

      const fd = (all || []).find(
        (f) => (f.category || '').toLowerCase() === 'boletos'
      );

      if (!fd) {
        if (isMounted) {
          setBoletosError('No se encontró la serie "boletos" en FinancialData.');
          setBoletosData({});
        }
        return;
      }

      const rawData = fd.data || [];
      let headers = fd.headers && fd.headers.length ? fd.headers : [];
      let dataRows = rawData;

      // Headers en la primera fila, si hace falta
      if (!headers.length && rawData.length > 0 && Array.isArray(rawData[0])) {
        headers = rawData[0];
        dataRows = rawData.slice(1);
      }

      const idxYear = findCol(headers, 'Año');
      const idxMes = findCol(headers, 'Mes');
      const idxPesos = findCol(headers, 'FINFOCUS PESOS');

      if (idxYear === -1 || idxMes === -1 || idxPesos === -1) {
        if (isMounted) {
          setBoletosError(
            'No se encontraron columnas Año / Mes / FINFOCUS PESOS en la serie "boletos".'
          );
          setBoletosData({});
        }
        return;
      }

      // [Año, Mes, URL] SOLO con FINFOCUS PESOS
      let rows = dataRows.map((row) => {
        const year = row[idxYear];
        const mes = row[idxMes];

        const linkPesos =
          row[idxPesos] != null ? String(row[idxPesos]).trim() : '';

        return [year, mes, linkPesos];
      });

      // ⬇️ Agregar esto
// Si la primera fila no tiene año numérico, asumimos que es encabezado y la quitamos
if (rows.length && isNaN(parseInt(rows[0][0], 10))) {
  rows = rows.slice(1);
}

      // Quitamos filas sin año, mes o link
      rows = rows.filter(
        (r) =>
          r[0] != null &&
          r[1] != null &&
          r[2] &&
          String(r[2]).trim() !== ''
      );

      const struct = parseRowsToStructure(rows, 2); // col 2 = URL

      if (!isMounted) return;
      setBoletosData(struct);
    } catch (err) {
      console.error(err);
      if (isMounted) {
        setBoletosError(
          err?.message ||
            'Error al cargar los boletos de compra desde FinancialData.'
        );
        setBoletosData({});
      }
    } finally {
      if (isMounted) setBoletosLoading(false);
    }
  }

  loadBoletos();
  return () => {
    isMounted = false;
  };
}, []);

  // === Cálculo de desviación final para Evolución ===
  let desviacionLabel = 'Calculando desviación…';
  if (evoData && evoData.length > 0) {
    const last = evoData[evoData.length - 1];
    if (
      Number.isFinite(last.real) &&
      Number.isFinite(last.teorica) &&
      last.teorica !== 0
    ) {
      const d = ((last.real - last.teorica) / last.teorica) * 100;
      desviacionLabel = `Desviación vs. teórica en ${last.label}: ${d.toFixed(
        2
      )}%`;
    } else {
      desviacionLabel = 'Sin datos suficientes para calcular desviación.';
    }
  }

  const boletoYears = Object.keys(boletosData).sort();

  const renderBoletosSkeleton = (count = 6) => (
    <div class="grid gap-4 place-items-center sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-3xl border border-gray-200 shadow-md p-4"
        >
          <div className="h-16 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="mt-4 h-4 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="h-9 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-9 rounded-xl bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  const LogoPlate = ({ year }) => (
    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#e8eef5] to-white flex items-center justify-center shadow-inner">
      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[#0f2f4b] font-extrabold border border-[#e5e7eb]">
        {String(year).slice(2)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="evolucion">
        <div className="w-full flex justify-center">
          <TabsList className="max-w-xl grid grid-cols-3">
            <TabsTrigger value="evolucion">
              Evolución de la cartera
            </TabsTrigger>
            <TabsTrigger value="composicion">
              Composición de la cartera
            </TabsTrigger>
            <TabsTrigger value="boletos">
              Boletos de compra
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Evolución */}
        <TabsContent value="evolucion">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0f2f4b]">
                Evolución de la cartera
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evoLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0f2f4b]" />
                  <span>Cargando datos …</span>
                </div>
              )}

              {!evoLoading && evoError && (
                <p className="text-sm text-red-600">{evoError}</p>
              )}

              {!evoLoading && !evoError && evoData && evoData.length > 0 && (
                <>
                  <div className="flex flex-wrap justify-center gap-2 mb-3 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleLine('real')}
                      className={
                        'px-3 py-1 rounded-full border transition ' +
                        (visibleLines.real
                          ? 'bg-[#0f2f4b] text-white border-[#0f2f4b]'
                          : 'bg-white text-[#0f2f4b] border-slate-300')
                      }
                    >
                      Cartera real
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleLine('teorica')}
                      className={
                        'px-3 py-1 rounded-full border transition ' +
                        (visibleLines.teorica
                          ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                          : 'bg-white text-[#0f2f4b] border-slate-300')
                      }
                    >
                      Cartera teórica
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleLine('colchon')}
                      className={
                        'px-3 py-1 rounded-full border transition ' +
                        (visibleLines.colchon
                          ? 'bg-[#10B981] text-white border-[#10B981]'
                          : 'bg-white text-[#0f2f4b] border-slate-300')
                      }
                    >
                      Colchón
                    </button>
                  </div>

                  <div className="chart-wrap w-full h-72 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evoData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis
                          tickFormatter={(v) =>
                            Number(v).toLocaleString('en-US')
                          }
                        />
                        <RechartsTooltip
                          formatter={(value, name) => [
                            `$ ${Number(value).toLocaleString('en-US')}`,
                            name,
                          ]}
                        />

                        {visibleLines.real && (
                          <Line
                            type="monotone"
                            dataKey="real"
                            name="Cartera real"
                            stroke="#0f2f4b"
                            strokeWidth={3}
                            dot={{ r: 2 }}
                            activeDot={{ r: 4 }}
                          />
                        )}

                        {visibleLines.teorica && (
                          <Line
                            type="monotone"
                            dataKey="teorica"
                            name="Cartera teórica"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 2 }}
                          />
                        )}

                        {visibleLines.colchon && (
                          <Line
                            type="monotone"
                            dataKey="colchon"
                            name="Colchón"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ r: 2 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p
                    id="desviacion"
                    className="text-sm font-semibold text-[#0f2f4b] text-center"
                  >
                    {desviacionLabel}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Composición */}
        <TabsContent value="composicion">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-[#0f2f4b]">
                🚀 Cartera FINFOCUS PESOS
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Compras acumuladas y reinversiones desde el 01-06-2025
              </p>
            </CardHeader>
            <CardContent>
              {compLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0f2f4b]" />
                  <span>
                    Cargando tickers, liquidez y precios …
                  </span>
                </div>
              )}

              {!compLoading && compError && (
                <p className="text-sm text-red-600">{compError}</p>
              )}

              {!compLoading && !compError && (
                <>
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm text-center">
                      <thead>
                        <tr className="bg-slate-100 text-[#0f2f4b]">
                          <th className="px-3 py-2 border border-slate-200">
                            Ticker
                          </th>
                          <th className="px-3 py-2 border border-slate-200">
                            Cantidad
                          </th>
                          <th className="px-3 py-2 border border-slate-200">
                            Precio
                          </th>
                          <th className="px-3 py-2 border border-slate-200">
                            Total $ invertido
                          </th>
                          <th className="px-3 py-2 border border-slate-200">
                            % del portafolio
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsComp.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              row.isLiquidez
                                ? 'bg-slate-100 font-semibold'
                                : idx % 2 === 0
                                ? 'bg-white'
                                : 'bg-slate-50'
                            }
                          >
                            <td className="px-3 py-2 border border-slate-200">
                              {row.isLiquidez ? (
                                <span className="font-semibold">
                                  Liquidez
                                </span>
                              ) : (
                                row.ticker
                              )}
                            </td>
                            <td className="px-3 py-2 border border-slate-200">
                              {row.cantidad != null ? row.cantidad : ''}
                            </td>
                            <td className="px-3 py-2 border border-slate-200">
                              {row.precio != null
                                ? `$ ${fmtMoney(row.precio)}`
                                : row.isLiquidez
                                ? ''
                                : 'N/D'}
                            </td>
                            <td className="px-3 py-2 border border-slate-200">
                              $ {fmtMoney(row.totalInvertido || 0)}
                            </td>
                            <td className="px-3 py-2 border border-slate-200">
                              {fmtPct(row.porcentaje || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 text-[#0f2f4b] font-semibold">
                          <td
                            className="px-3 py-2 border border-slate-200"
                            colSpan={4}
                          >
                            Total general:
                          </td>
                          <td className="px-3 py-2 border border-slate-200">
                            $ {fmtMoney(totalGeneral)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Boletos de compra */}
        <TabsContent value="boletos">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-[#0f2f4b]">
                Boletos de compra
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                
              </p>
            </CardHeader>
            <CardContent>
              {boletosLoading && renderBoletosSkeleton()}

              {!boletosLoading && boletosError && (
                <p className="text-sm text-red-600 text-center">
                  {boletosError}
                </p>
              )}

              {!boletosLoading &&
                !boletosError &&
                boletoYears.length === 0 && (
                  <p className="text-sm text-slate-500 text-center">
                    No se encontraron filas válidas en la hoja &quot;Boletos&quot;.
                  </p>
                )}

              {!boletosLoading &&
                !boletosError &&
                boletoYears.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {boletoYears.map((year) => {
                      const meses = boletosData[year] || [];
                      const count = meses.length;
                      const isOpen = openYear === year;

                      return (
                        <div
                          key={year}
                          className={`bg-white rounded-3xl border border-gray-200 shadow-md p-3 transition ${
                            isOpen ? 'ring-2 ring-[#0f2f4b] ring-offset-2' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenYear(isOpen ? null : year)
                            }
                            className="w-full text-left rounded-2xl border border-transparent hover:border-[#0f2f4b]/20 hover:shadow-sm px-4 pt-4 pb-3"
                          >
                            <div className="text-center">
                              <LogoPlate year={year} />
                              <h3 className="mt-3 text-sm font-extrabold tracking-wide text-[#0f2f4b]">
                                AÑO {year}
                              </h3>
                              <div className="mt-1 inline-flex items-center text-[11px] font-bold text-[#0f2f4b] bg-[#0f2f4b]/10 border border-[#0f2f4b]/20 rounded-full px-2 py-0.5">
                                {count} {count === 1 ? 'boleto' : 'boletos'}
                              </div>
                              <p className="mt-1 text-xs text-gray-600 min-h-5">
                                {count
                                  ? 'Boletos disponibles por mes'
                                  : 'Sin operaciones'}
                              </p>
                              <div className="flex items-center justify-center text-[#0f2f4b] opacity-80 mt-1">
                                <span
                                  className={
                                    'inline-block transform transition-transform ' +
                                    (isOpen ? 'rotate-180' : '')
                                  }
                                >
                                  ▼
                                </span>
                              </div>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="mt-2 rounded-2xl border-2 border-[#0f2f4b] p-4 bg-gray-50">
                              {count ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {meses.map((m, idx) => (
                                    <a
                                      key={idx}
                                      href={m.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-center rounded-2xl border border-[#0f2f4b] bg-white px-4 py-3 text-[#0f2f4b] text-sm font-semibold hover:bg-[#0f2f4b] hover:text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f2f4b]"
                                    >
                                      <span className="mr-2 text-xs">
                                        📅
                                      </span>
                                      {m.mes}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="italic text-gray-500 text-sm">
                                  No hay boletos cargados para {year}.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
