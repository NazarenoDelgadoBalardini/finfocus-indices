import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FinancialData } from '@/entities/FinancialData';

// ================== CONFIGURACIÓN GENERAL ==================
const SHEET_ID = '1cWgD3_oU6FpMSwYSdqNHLAOYtYX30QAH'; // ya no se usa, pero lo dejo
const SHEET_NAME = 'Letras';

// Bandas base
const BAND_BASE = new Date(2025, 3, 11); // 11-04-2025
const FLOOR_0 = 1000;
const CEIL_0 = 1400;
const RF_FLOOR = -0.01; // -1% mensual
const RF_CEIL = +0.01;  // +1% mensual

// Paleta
const COLORS = {
  floorLine: '#b0bec5',
  ceilLine: '#78909c',
  bandFill: 'rgba(120,144,156,0.10)',
  green: '#22c55e',
  amber: '#fbbf24',
  red: '#f97373',
  label: '#8a5a2b',
  scenario: '#f97316',
};

// =============== HELPERS FECHAS / BANDAS ===================
const dayMs = 24 * 60 * 60 * 1000;

function monthsAct365(base, d) {
  return 12 * ((d - base) / (365 * dayMs));
}

function monthsSince(base, d) {
  const y = d.getFullYear() - base.getFullYear();
  const m = d.getMonth() - base.getMonth();
  let n = y * 12 + m;
  if (d.getDate() < base.getDate()) n -= 1;
  return Math.max(0, n);
}

function fxBandDaily(dateObj) {
  const n = monthsAct365(BAND_BASE, dateObj);
  return {
    floor: FLOOR_0 * Math.pow(1 + RF_FLOOR, n),
    ceil: CEIL_0 * Math.pow(1 + RF_CEIL, n),
  };
}

function fxBandStep(dateObj) {
  const n = monthsSince(BAND_BASE, dateObj);
  return {
    floor: FLOOR_0 * Math.pow(1 + RF_FLOOR, n),
    ceil: CEIL_0 * Math.pow(1 + RF_CEIL, n),
  };
}

function scenarioBand(dateObj, rateAbs, escalonado) {
  // igual que las bandas oficiales, pero con ±rateAbs
  const n = escalonado
    ? monthsSince(BAND_BASE, dateObj)
    : monthsAct365(BAND_BASE, dateObj);

  return {
    pisoEsc: FLOOR_0 * Math.pow(1 - rateAbs, n), // piso: −rateAbs mensual
    techoEsc: CEIL_0 * Math.pow(1 + rateAbs, n), // techo: +rateAbs mensual
  };
}

// Escenario extra de devaluación (2% / 3% mensual)
function scenarioLineValue(dateObj, monthlyRate) {
  if (!isFinite(monthlyRate)) return null;
  const n = monthsAct365(BAND_BASE, dateObj);
  return CEIL_0 * Math.pow(1 + monthlyRate, n); // sirve para +r y -r
}

function parseDMY(dmy) {
  const s = String(dmy).trim().replaceAll('-', '/');
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function yearFracACT365(d0, d1) {
  return (d1 - d0) / (365 * dayMs);
}

function teaToTnaSimple(tea) {
  const rDay = Math.pow(1 + tea, 1 / 365) - 1;
  return 365 * rDay;
}

function ytmAct365(price, hoy, cfs, guess = 0.30) {
  let y = guess;
  for (let it = 0; it < 60; it++) {
    let f = -price;
    let df = 0;
    for (const [ds, amt] of cfs) {
      const t = yearFracACT365(hoy, new Date(ds));
      if (t <= 0) continue;
      const den = Math.pow(1 + y, t);
      f += amt / den;
      df += -(t * amt) / (den * (1 + y));
    }
    if (!isFinite(f) || !isFinite(df) || Math.abs(df) < 1e-12) break;
    const step = f / df;
    y -= step;
    if (Math.abs(step) < 1e-12) break;
    if (y <= -0.99) y = -0.99;
    if (y > 10) y = 10;
  }
  return y;
}

function fvReinvertidoACT365(hoy, cfs, tea) {
  const maturity = new Date(cfs[cfs.length - 1][0]);
  let fv = 0;
  for (const [ds, amt] of cfs) {
    const d = new Date(ds);
    if (d <= hoy) continue;
    const t = yearFracACT365(d, maturity);
    fv += amt * Math.pow(1 + tea, t);
  }
  return fv;
}

// =============== HELPERS PARA HEADERS (FinancialData) ===============
function normalizeHeaderName(s) {
  if (!s) return '';
  return s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findCol(headers = [], targetLabel) {
  const targetNorm = normalizeHeaderName(targetLabel);
  let idx = headers.findIndex(
    (h) => normalizeHeaderName(h) === targetNorm
  );
  if (idx !== -1) return idx;
  idx = headers.findIndex((h) =>
    normalizeHeaderName(h).includes(targetNorm)
  );
  return idx;
}

function toNumberAR(s) {
  if (s == null) return NaN;
  const t = String(s).replace(/\./g, '').replace(',', '.');
  return Number(t);
}

// =============== APIS EXTERNAS ===================
async function fetchPrices() {
  const out = new Map();

  const pick = (it) => {
    const ask = Number(it?.px_ask);
    const last = Number(it?.c);
    if (Number.isFinite(ask) && ask > 0) return ask;
    if (Number.isFinite(last) && last > 0) return last;
    return NaN;
  };

  try {
    const rB = await fetch('https://data912.com/live/arg_bonds', { mode: 'cors' });
    const jB = await rB.json();
    for (const it of jB || []) {
      const p = pick(it);
      if (it?.symbol && Number.isFinite(p)) out.set(it.symbol, p);
    }
  } catch (e) { /* silent */ }

  try {
    const rN = await fetch('https://data912.com/live/arg_notes', { mode: 'cors' });
    const jN = await rN.json();
    for (const it of jN || []) {
      const p = pick(it);
      if (it?.symbol && Number.isFinite(p)) out.set(it.symbol, p);
    }
  } catch (e) { /* silent */ }

  return out;
}

async function fetchMEP() {
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares/bolsa');
    const j = await r.json();
    if (j?.venta) return +j.venta;
    if (j?.bolsa?.venta) return +j.bolsa.venta;
  } catch (e) {
    // silent
  }
  return NaN;
}

/**
 * AHORA lee desde FinancialData:
 * category = 'letras_y_bonos_del_tesoro'
 * headers: Tipo, Ticker, Vto, Pago
 */
async function fetchInstrumentsFromSheet() {
  const records = await FinancialData.filter(
    {
      category: 'letras_y_bonos_del_tesoro',
      isActive: true,
    },
    '-lastSync',
    1
  );

  if (!records || !records.length) {
    throw new Error(
      'No se encontró la serie "letras_y_bonos_del_tesoro" en FinancialData.'
    );
  }

  const fd = records[0];
  const headers = fd.headers || [];
  const dataRows = fd.data || [];

  if (!headers.length || !dataRows.length) {
    throw new Error(
      'La serie "letras_y_bonos_del_tesoro" no tiene headers o data.'
    );
  }

  const idxTipo = findCol(headers, 'Tipo');
  const idxTicker = findCol(headers, 'Ticker');
  const idxVto = findCol(headers, 'Vto');
  const idxPago = findCol(headers, 'Pago');

  const arr = [];
  for (const row of dataRows) {
    const tipo = row[idxTipo] ?? '';
    const ticker = row[idxTicker] ?? '';
    const vtoStr = row[idxVto] ?? '';
    const pagoStr = row[idxPago] ?? '';

    if (!tipo && !ticker) continue;

    const vtoDate = parseDMY(vtoStr);
    if (!(vtoDate instanceof Date) || isNaN(vtoDate)) continue;

    const pagoNum = toNumberAR(pagoStr);

    arr.push({
      tipo: String(tipo || '').trim(),
      ticker: String(ticker || '').trim(),
      vto: vtoDate,
      pago: pagoNum,
    });
  }

  return arr;
}

// Clasificación por cobertura piso / techo
function classifyByCoverage(pagoFinal, precio, mep, band) {
  if (!isFinite(pagoFinal) || !isFinite(precio) || !isFinite(mep) || mep <= 0) {
    return { label: 'N/A', color: '#999' };
  }
  const pesosUSD_techo = (precio / mep) * band.ceil;
  const pesosUSD_piso = (precio / mep) * band.floor;
  if (pagoFinal > pesosUSD_techo) return { label: 'Cubre (techo)', color: COLORS.green };
  if (pagoFinal < pesosUSD_piso) return { label: 'No cubre (piso)', color: COLORS.red };
  return { label: 'Depende', color: COLORS.amber };
}

// =================== COMPONENTE PRINCIPAL ===================
export default function BandasCambioInstrumentos() {
  const [rows, setRows] = useState([]);
  const [priceMap, setPriceMap] = useState(null);
  const [mepBase, setMepBase] = useState(NaN);

  const [mepManual, setMepManual] = useState('');
  const [zoomBandas, setZoomBandas] = useState(false);
  const [modoEscalonado, setModoEscalonado] = useState(false);
  const [scenarioAbsRate, setScenarioAbsRate] = useState(0);
  const [bandToday, setBandToday] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Carga inicial: instrumentos (FinancialData) + precios + MEP
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const [sheetRows, prices, mep] = await Promise.all([
          fetchInstrumentsFromSheet(),
          fetchPrices(),
          fetchMEP(),
        ]);

        if (cancelled) return;

        setRows(sheetRows || []);
        setPriceMap(prices || new Map());
        setMepBase(mep);
      } catch (err) {
        console.error('Error cargando datos:', err);
        if (!cancelled) {
          setError('No se pudieron cargar los datos (FinancialData / APIs).');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Banda al día de hoy
  useEffect(() => {
    const hoy = new Date();
    const band = modoEscalonado ? fxBandStep(hoy) : fxBandDaily(hoy);
    setBandToday({ piso: band.floor, techo: band.ceil });
  }, [modoEscalonado]);

  const fmtNum = (n) =>
    isFinite(n)
      ? n.toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—';

  const { chartData, pointsData, yDomain, mepUsado } = useMemo(() => {
    if (!rows.length || !priceMap) {
      return {
        chartData: [],
        pointsData: [],
        yDomain: [0, 2400],
        mepUsado: NaN,
      };
    }

    const hoy = new Date();
    const mepVal = parseFloat(mepManual);
    const mep = isFinite(mepVal) && mepVal > 0 ? mepVal : mepBase;

    const vigentes = rows.filter((r) => r.vto > hoy);

    if (!vigentes.length) {
      return {
        chartData: [],
        pointsData: [],
        yDomain: [0, 2400],
        mepUsado: mep,
      };
    }

    const maxVto = vigentes.reduce(
      (acc, it) => (it.vto > acc ? it.vto : acc),
      BAND_BASE
    );

    const dataLines = [];
    for (let t = BAND_BASE.getTime(); t <= maxVto.getTime(); t += dayMs) {
      const d = new Date(t);
      const baseBand = modoEscalonado ? fxBandStep(d) : fxBandDaily(d);

      let pisoEsc = null;
      let techoEsc = null;

      if (scenarioAbsRate > 0) {
        const esc = scenarioBand(d, scenarioAbsRate, modoEscalonado);
        pisoEsc = esc.pisoEsc;
        techoEsc = esc.techoEsc;
      }

      dataLines.push({
        dateMs: t,
        piso: baseBand.floor,
        techo: baseBand.ceil,
        pisoEsc,
        techoEsc,
      });
    }

    const pts = [];

    const cfsByTicker = {
      TO26: [
        ['2025-10-17', 7.75],
        ['2026-04-17', 7.75],
        ['2026-10-19', 107.75],
      ],
    };

    for (const it of vigentes) {
      let vtoDate = it.vto;
      const cfs = cfsByTicker[it.ticker] || null;
      if (cfs) {
        vtoDate = new Date(cfs[cfs.length - 1][0]);
      }

      const dias = Math.ceil((vtoDate - hoy) / dayMs);

      const precio = priceMap.get(it.ticker);
      if (!isFinite(precio) || precio <= 0) continue;

      let pagoFinal = it.pago;
      let tna = NaN;
      let tea = NaN;

      if (cfs) {
        tea = ytmAct365(precio, hoy, cfs, 0.30);
        if (isFinite(tea)) {
          pagoFinal = fvReinvertidoACT365(hoy, cfs, tea);
          tna = teaToTnaSimple(tea);
        } else {
          pagoFinal = cfs
            .filter(([ds]) => new Date(ds) > hoy)
            .reduce((a, [, amt]) => a + amt, 0);
        }
      } else if (isFinite(pagoFinal) && dias > 0) {
        const tnaDec = (pagoFinal / precio - 1) * (365 / dias);
        tna = tnaDec;
        tea = Math.pow(1 + tnaDec / 365, 365) - 1;
      }

      const bandAtVto = (modoEscalonado ? fxBandStep : fxBandDaily)(vtoDate);
      const xStar =
        isFinite(mep) && mep > 0 ? (pagoFinal * mep) / precio : NaN;
      const cls = classifyByCoverage(pagoFinal, precio, mep, bandAtVto);
      const gapTechoPct = isFinite(xStar)
        ? (bandAtVto.ceil - xStar) / bandAtVto.ceil
        : NaN;

      pts.push({
        dateMs: vtoDate.getTime(),
        xStar,
        ticker: it.ticker,
        tipo: it.tipo,
        precio,
        pagoFinal,
        piso: bandAtVto.floor,
        techo: bandAtVto.ceil,
        color: cls.color,
        tna,
        tea,
        gapTechoPct,
      });
    }

    let yMin = 0;
    let yMax = 2400;

    const ys = [
      ...dataLines.map((d) => d.piso),
      ...dataLines.map((d) => d.techo),
      ...dataLines.map((d) => d.pisoEsc).filter((v) => isFinite(v)),
      ...dataLines.map((d) => d.techoEsc).filter((v) => isFinite(v)),
      ...pts.map((p) => p.xStar).filter((v) => isFinite(v)),
    ].filter((v) => isFinite(v));

    if (ys.length) {
      const minBand = Math.min(...ys);
      const maxBand = Math.max(...ys);
      yMin = zoomBandas ? minBand * 0.98 : 0;
      yMax = maxBand * 1.05;
    }

    return {
      chartData: dataLines,
      pointsData: pts,
      yDomain: [yMin, yMax],
      mepUsado: mep,
    };
  }, [
    rows,
    priceMap,
    mepBase,
    mepManual,
    zoomBandas,
    modoEscalonado,
    scenarioAbsRate,
  ]);

  useEffect(() => {
    if (!rows.length) return;
    if (!chartData.length) {
      setStatus('No hay instrumentos vigentes o datos suficientes.');
      return;
    }

    const ptsValid = pointsData.filter((p) => isFinite(p.xStar)).length;
    setStatus(
      `MEP usado: ${
        isFinite(mepUsado)
          ? mepUsado.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : 'N/D'
      }. Puntos trazados: ${ptsValid}/${pointsData.length}.`
    );
  }, [chartData, pointsData, mepUsado, rows.length]);

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const scatterIdx = payload.findIndex((p) => p.dataKey === 'xStar');
    if (scatterIdx >= 0) {
      const p = payload[scatterIdx]?.payload;
      if (!p) return null;
      const fmtNum = (n) =>
        isFinite(n)
          ? n.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '—';
      const fmtPct = (n) =>
        isFinite(n)
          ? (n * 100).toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + '%'
          : '—';

      return (
        <div className="rounded-lg border bg-white px-3 py-2 text-[11px] shadow">
          <div className="font-semibold text-[#0f2f4b] mb-1">
            {p.ticker} –{' '}
            {new Date(p.dateMs).toLocaleDateString('es-AR')}
          </div>
          <div>X* (breakeven): $ {fmtNum(p.xStar)}</div>
          <div>TNA: {fmtPct(p.tna)}</div>
          <div>TEA: {fmtPct(p.tea)}</div>
          <div>
            Gap a techo:{' '}
            {isFinite(p.gapTechoPct)
              ? (p.gapTechoPct * 100).toFixed(2) + '%'
              : '—'}{' '}
            (Techo $ {fmtNum(p.techo)})
          </div>
        </div>
      );
    }

    const d = payload[0]?.payload;
    if (!d) return null;
    const fmtNum = (n) =>
      isFinite(n)
        ? n.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : '—';

    return (
      <div className="rounded-lg border bg-white px-3 py-2 text-[11px] shadow">
        <div className="font-semibold text-[#0f2f4b] mb-1">
          {new Date(d.dateMs).toLocaleDateString('es-AR')}
        </div>
        {'piso' in d && <div>Límite inferior: $ {fmtNum(d.piso)}</div>}
        {'techo' in d && <div>Límite superior: $ {fmtNum(d.techo)}</div>}
        {'pisoEsc' in d && isFinite(d.pisoEsc) && (
          <div>Piso escenario: $ {fmtNum(d.pisoEsc)}</div>
        )}
        {'techoEsc' in d && isFinite(d.techoEsc) && (
          <div>Techo escenario: $ {fmtNum(d.techoEsc)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        {loading && (
          <div className="text-[12px] text-slate-600 py-10 text-center">
            Cargando datos (FinancialData + APIs)…
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 text-center">
            Error: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Controles */}
            <div className="flex flex-wrap gap-3 items-center text-[12px] mb-3">
              <label className="flex items-center gap-2">
                <span className="font-semibold">MEP manual:</span>
                <input
                  type="number"
                  step="0.01"
                  value={mepManual}
                  onChange={(e) => setMepManual(e.target.value)}
                  className="border rounded-md px-2 py-1 text-[12px] w-32"
                  placeholder="Dólar MEP"
                />
              </label>

              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={zoomBandas}
                  onChange={(e) => setZoomBandas(e.target.checked)}
                />
                <span>Zoom en bandas</span>
              </label>

              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={modoEscalonado}
                  onChange={(e) => setModoEscalonado(e.target.checked)}
                />
                <span>Escalonado mensual (BCRA)</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-semibold">Escenario ±% mensual:</span>
                <select
                  value={scenarioAbsRate}
                  onChange={(e) =>
                    setScenarioAbsRate(parseFloat(e.target.value))
                  }
                  className="border rounded-md px-2 py-1 text-[12px]"
                >
                  <option value={0}>Sin escenario</option>
                  <option value={0.02}>±2% mensual</option>
                  <option value={0.03}>±3% mensual</option>
                </select>
              </div>
            </div>

            {chartData.length > 0 && (
              <div style={{ width: '100%', height: 420 }}>
                {/* HERO CARDS: PISO / TECHO DE LA BANDA */}
                {bandToday && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-gradient-to-r from-[#0f2f4b] to-[#1d4f7c] text-white rounded-2xl px-4 py-3 shadow-md flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide opacity-80">
                          Piso de la banda (hoy)
                        </div>
                        <div className="text-xl font-bold">
                          ${' '}
                          {fmtNum(bandToday.piso ?? bandToday.floor)}
                        </div>
                      </div>
                      <div className="text-[10px] bg-white/15 px-2 py-1 rounded-full">
                        ±1% mensual
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-[#e5f2ff] to-[#cfe5ff] text-[#0f2f4b] rounded-2xl px-4 py-3 shadow-md flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide opacity-70">
                          Techo de la banda (hoy)
                        </div>
                        <div className="text-xl font-bold">
                          ${' '}
                          {fmtNum(bandToday.techo ?? bandToday.ceil)}
                        </div>
                      </div>
                      <div className="text-[10px] bg-[#0f2f4b]/5 px-2 py-1 rounded-full">
                        ±1% mensual
                      </div>
                    </div>
                  </div>
                )}

                <ResponsiveContainer>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="dateMs"
                      type="number"
                      tickFormatter={(t) =>
                        new Date(t).toLocaleDateString('es-AR')
                      }
                      domain={['dataMin', 'dataMax']}
                    />

                    <YAxis domain={yDomain} />

                    <Tooltip content={customTooltip} />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="piso"
                      stroke="#b0bec5"
                      strokeWidth={1.5}
                      dot={false}
                      name="Piso banda"
                    />

                    <Line
                      type="monotone"
                      dataKey="techo"
                      stroke="#78909c"
                      strokeWidth={1.5}
                      dot={false}
                      name="Techo banda"
                    />

                    {scenarioAbsRate > 0 && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="pisoEsc"
                          stroke="#ff9800"
                          strokeDasharray="4 2"
                          dot={false}
                          name="Piso escenario"
                        />
                        <Line
                          type="monotone"
                          dataKey="techoEsc"
                          stroke="#f57c00"
                          strokeDasharray="4 2"
                          dot={false}
                          name="Techo escenario"
                        />
                      </>
                    )}

                    <Scatter
                      name="Instrumentos"
                      data={pointsData}
                      dataKey="xStar"
                      fill="#0f2f4b"
                      shape="circle"
                      r={4}
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                <p className="mt-2 text-[11px] text-slate-600">
                  X* = Pago Final × MEP ÷ Precio. Verde: cubre incluso el techo;
                  rojo: no cubre ni el piso; amarillo: depende. <b>Gap a techo</b> =
                  (Techo − X*) / Techo.
                </p>

                <p className="mt-1 text-[11px] font-semibold text-[#0f2f4b]">
                  {status}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
