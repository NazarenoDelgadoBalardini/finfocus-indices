import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const F = { azul: '#0f2f4b', cel: '#5EA6D7' };

const nf = (x) =>
  `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x ?? 0)} USD`;

const pct = (x) => (x * 100).toFixed(2) + '%';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- Donut "Paciencia paga" (arreglado) ----------

function DonutPaciencia({
  aporte,
  intereses,
  titulo,
  totalTexto,
  showPercentages = true,
}) {
  const total = aporte + intereses || 1;
  const fracAporte = aporte / total;
  const fracIntereses = intereses / total;

  const pctAporte = (fracAporte * 100).toFixed(1) + '%';
  const pctIntereses = (fracIntereses * 100).toFixed(1) + '%';

  const cx = 50;
  const cy = 50;
  const rOuter = 45;
  const rInner = 28;
  const midR = (rOuter + rInner) / 2;

  const TAU = Math.PI * 2;
  const startBase = -Math.PI / 2; // arranca arriba (12 en punto)

  const buildArcPath = (startAngle, endAngle) => {
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    const x1 = cx + rOuter * Math.cos(startAngle);
    const y1 = cy + rOuter * Math.sin(startAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);

    return [
      'M',
      x1,
      y1,
      'A',
      rOuter,
      rOuter,
      0,
      largeArcFlag,
      1,
      x2,
      y2,
      'L',
      x3,
      y3,
      'A',
      rInner,
      rInner,
      0,
      largeArcFlag,
      0,
      x4,
      y4,
      'Z',
    ].join(' ');
  };

  // Ángulos de cada sector
  const angleAporte = fracAporte * TAU;
  const angleIntereses = fracIntereses * TAU;

  const startAporte = startBase;
  const endAporte = startAporte + angleAporte;

  const startIntereses = endAporte;
  const endIntereses = startIntereses + angleIntereses;

  // Posición de etiquetas de porcentaje (en el centro de cada sector)
  const midAporte = startAporte + angleAporte / 2;
  const midIntereses = startIntereses + angleIntereses / 2;

  const labelAx = cx + midR * Math.cos(midAporte);
  const labelAy = cy + midR * Math.sin(midAporte);

  const labelIx = cx + midR * Math.cos(midIntereses);
  const labelIy = cy + midR * Math.sin(midIntereses);

  return (
    <div className="group bg-white border border-gray-200 rounded-2xl shadow-md p-6 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-xl">
      {titulo && (
        <h2 className="text-lg font-semibold text-[#0f2f4b] mb-3 text-center">
          {titulo}
        </h2>
      )}

      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-40 md:h-40">
          {/* Sector Aporte */}
          {fracAporte > 0 && (
            <path
              d={buildArcPath(startAporte, endAporte)}
              fill="#0f2f4b"
              stroke="#ffffff"
              strokeWidth="1"
            />
          )}

          {/* Sector Intereses */}
          {fracIntereses > 0 && (
            <path
              d={buildArcPath(startIntereses, endIntereses)}
              fill="#36a2eb"
              stroke="#ffffff"
              strokeWidth="1"
            />
          )}

          {/* Etiquetas de porcentaje sobre el anillo */}
          {showPercentages && fracAporte > 0 && (
            <text
              x={labelAx}
              y={labelAy}
              fontSize="7"
              fontWeight="600"
              fill="#ffffff"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {pctAporte}
            </text>
          )}

          {showPercentages && fracIntereses > 0 && (
            <text
              x={labelIx}
              y={labelIy}
              fontSize="7"
              fontWeight="600"
              fill="#ffffff"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {pctIntereses}
            </text>
          )}
        </svg>

        {/* Texto del medio (monto total) */}
        <div className="absolute inset-0 flex items-center justify-center text-[11px] md:text-xs font-bold text-[#0f2f4b] text-center px-2">
          {totalTexto}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full bg-[#0f2f4b]" />
          <span>Aporte</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full bg-[#36a2eb]" />
          <span>Intereses</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Gráfico de líneas (panel “Interés compuesto”) ----------

function LineChart({
  series,
  colors = ['#0f2f4b', '#5EA6D7', '#9CA3AF', '#22C55E'],
  horizonLabel = '',
  gutter = 140,
  minGap = 12,
}) {
  const padding = 12;
  const w = 680;
  const h = 260;
  if (!series?.length || series[0].length < 2) {
    return <svg className="w-full" viewBox={`0 0 ${w} ${h}`} />;
  }

  const nfLocal = (x) =>
    `${new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(x ?? 0)} USD`;

  const n = series[0].length;
  const plotLeft = padding;
  const plotRight = w - padding - gutter;
  const plotW = plotRight - plotLeft;

  const flat = series.flat();
  const minV = Math.min(...flat);
  const maxV = Math.max(...flat);
  const span = maxV - minV || 1;

  const xs = series[0].map((_, i) => plotLeft + (i * plotW) / (n - 1));
  const yOf = (v) => h - padding - ((v - minV) / span) * (h - padding * 2);

  const TAG = { fs: 11, padX: 10, padY: 6, bulletR: 3.5, gap: 6 };
  const textW = (txt, fs) => String(txt).length * fs * 0.62;
  const tagDims = (value) => {
    const tW = textW(value, TAG.fs);
    const wRect = TAG.padX * 2 + TAG.gap + TAG.bulletR * 2 + tW;
    const hRect = TAG.fs + TAG.padY * 2;
    return { wRect, hRect };
  };

  const ValueTag = ({ x, cY, value, color }) => {
    const fs = 12;
    const padX = 4;
    const textColor = '#0f172a';
    const textY = cY + fs / 3;
    return (
      <g>
        <circle cx={x + padX} cy={cY} r="3.5" fill={color} />
        <text x={x + padX + 8} y={textY} fontSize={fs} fontWeight="600" fill={textColor}>
          {value}
        </text>
      </g>
    );
  };

  const finals = series.map((d, si) => {
    const endX = xs[n - 1];
    const endY = yOf(d[n - 1]);
    const value = nfLocal(d[n - 1] ?? 0);
    const { wRect, hRect } = tagDims(value);
    return { si, endX, endY, value, color: colors[si] || '#999', wRect, hRect };
  });

  const margin = 6;
  const sorted = finals
    .map((f) => {
      const top = padding + margin + f.hRect / 2;
      const bot = h - padding - margin - f.hRect / 2;
      const cY0 = Math.min(bot, Math.max(top, f.endY));
      return { ...f, cY: cY0, top, bot };
    })
    .sort((a, b) => a.cY - b.cY);

  for (let i = 1; i < sorted.length; i++) {
    const need = (sorted[i - 1].hRect + sorted[i].hRect) / 2 + minGap / 2;
    if (sorted[i].cY - sorted[i - 1].cY < need) {
      sorted[i].cY = sorted[i - 1].cY + need;
    }
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].cY > sorted[i].bot) {
      const delta = sorted[i].cY - sorted[i].bot;
      for (let j = i; j >= 0; j--) {
        sorted[j].cY = Math.max(sorted[j].top, sorted[j].cY - delta);
        if (j > 0) {
          const need = (sorted[j - 1].hRect + sorted[j].hRect) / 2 + minGap / 2;
          if (sorted[j].cY - sorted[j - 1].cY < need) {
            sorted[j - 1].cY = Math.max(sorted[j - 1].top, sorted[j].cY - need);
          }
        }
      }
    }
  }
  const laid = sorted.sort((a, b) => a.si - b.si);

  const centerX = plotLeft + plotW / 2;
  const centerY = padding + ((h - 2 * padding) * 0.25);

  return (
    <svg className="w-full" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <rect x="0" y="0" width={w} height={h} fill="white" stroke="#e5e7eb" />
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line
          key={i}
          x1={plotLeft}
          x2={plotRight}
          y1={h - padding - g * (h - padding * 2)}
          y2={h - padding - g * (h - padding * 2)}
          stroke="#eef2f7"
          strokeWidth={1}
        />
      ))}
      <line
        x1={plotRight}
        x2={plotRight}
        y1={padding}
        y2={h - padding}
        stroke="#CBD5E1"
        strokeWidth={2}
        strokeDasharray="4 6"
      />
      {horizonLabel && (
        <g>
          <rect x={centerX - 36} y={centerY - 13} width={72} height={26} rx={10} fill="#fff" stroke="#E5E7EB" />
          <text x={centerX} y={centerY + 4} fontSize={11} textAnchor="middle" fill="#475569">
            {horizonLabel}
          </text>
        </g>
      )}
      {series.map((data, si) => {
        const ys = data.map((v) => yOf(v));
        const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
        return (
          <path
            key={si}
            d={d}
            stroke={colors[si]}
            fill="none"
            strokeWidth={2.6}
            strokeDasharray={si >= 2 ? '6 6' : '0'}
          />
        );
      })}
      {laid.map((f, i) => {
        const desiredX = plotRight + 10;
        const labelX = Math.min(desiredX, w - f.wRect - 4);
        const connectorX = Math.min(f.endX + 8, plotRight - 6);
        return (
          <g key={`lab-${i}`}>
            <circle cx={f.endX} cy={f.endY} r={3.4} fill={f.color} />
            <line x1={f.endX} y1={f.endY} x2={connectorX} y2={f.endY} stroke={f.color} strokeWidth={1.5} />
            <line x1={plotRight} y1={f.endY} x2={plotRight} y2={f.cY} stroke="#E5E7EB" strokeWidth={1} />
            <ValueTag x={labelX} cY={f.cY} value={f.value} color={f.color} />
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Motor de simulación (panel “Interés compuesto”) ----------

function simulate({
  initial = 0,
  monthly = 100,
  years = 10,
  rAnnual = 0.08,
  inflAnnual = 0,
  real = false,
  rateMode = 'effective',
  roundPerPeriod = false,
}) {
  const months = Math.max(1, Math.round(years * 12));
  const r = rateMode === 'nominal' ? rAnnual / 12 : Math.pow(1 + rAnnual, 1 / 12) - 1;
  const i = Math.pow(1 + inflAnnual, 1 / 12) - 1;

  let inv = initial;
  let cash = initial;
  const seriesInv = [];
  const seriesCash = [];
  const round2 = (x) => Math.round(x * 100) / 100;

  for (let m = 0; m <= months; m++) {
    const deflator = real ? Math.pow(1 + i, m) : 1;
    seriesInv.push(inv / deflator);
    seriesCash.push(cash / deflator);
    if (m === months) break;

    let nextInv = inv * (1 + r);
    if (roundPerPeriod) nextInv = round2(nextInv);
    nextInv += monthly;
    if (roundPerPeriod) nextInv = round2(nextInv);

    let nextCash = cash + monthly;
    if (roundPerPeriod) nextCash = round2(nextCash);

    inv = nextInv;
    cash = nextCash;
  }

  return { seriesInv, seriesCash };
}

// ---------- Calculadora simple (replica Calculadora.html) ----------

function calcularInteresCompuestoSimple(
  capitalInicial,
  tasaAnual,
  tiempoAnios,
  contribucion,
  frecuencia
) {
  const mapPeriodos = {
    mensual: 12,
    bimestral: 6,
    trimestral: 4,
    cuatrimestral: 3,
    semestral: 2,
    anual: 1,
  };

  const periodosPorAnio = mapPeriodos[frecuencia] ?? 12;
  const tasaPeriodica = tasaAnual / periodosPorAnio;
  const depositoPeriodico = contribucion;
  const totalPeriodos = Math.max(0, Math.round(tiempoAnios * periodosPorAnio));

  let montoActual = capitalInicial;
  let interesesAcumulados = 0;
  let totalCapitalAportado = capitalInicial;
  const evolucion = [];

  for (let p = 1; p <= totalPeriodos; p++) {
    let interesPeriodo = montoActual * tasaPeriodica;
    interesPeriodo = parseFloat(interesPeriodo.toFixed(2));
    interesesAcumulados = parseFloat((interesesAcumulados + interesPeriodo).toFixed(2));
    montoActual = parseFloat((montoActual + interesPeriodo).toFixed(2));

    montoActual = parseFloat((montoActual + depositoPeriodico).toFixed(2));
    totalCapitalAportado = parseFloat((totalCapitalAportado + depositoPeriodico).toFixed(2));

    const esFinDeAnio = p % periodosPorAnio === 0 || p === totalPeriodos;
    if (esFinDeAnio) {
      const anio = Math.ceil(p / periodosPorAnio);
      evolucion.push({
        anio,
        aporte: totalCapitalAportado,
        intereses: interesesAcumulados,
        total: montoActual,
      });
    }
  }

  const pctAporte = montoActual > 0 ? (totalCapitalAportado / montoActual) * 100 : 0;
  const pctIntereses = montoActual > 0 ? (interesesAcumulados / montoActual) * 100 : 0;

  return {
    montoFinal: montoActual,
    totalAportado: totalCapitalAportado,
    intereses: interesesAcumulados,
    pctAporte,
    pctIntereses,
    evolucion,
  };
}

// ---------- Componente principal con TABS ----------

export default function InteresCompuesto({ toolName }) {
  // Panel 2 – simulador
  const [initial, setInitial] = useState(0);
  const [monthly, setMonthly] = useState(100);
  const [years, setYears] = useState(30);
  const [rAnnual, setRAnnual] = useState(0.08);
  const [inflAnnual, setInfl] = useState(0.02);
  const [real, setReal] = useState(false);
  const [rateMode, setRateMode] = useState('nominal');
  const [roundPerPeriod, setRoundPerPeriod] = useState(false);

  // Panel 3 – calculadora
  const [simpleCapital, setSimpleCapital] = useState(0);
  const [simpleTasa, setSimpleTasa] = useState(8);
  const [simpleTiempo, setSimpleTiempo] = useState(10);
  const [simpleContrib, setSimpleContrib] = useState(100);
  const [simpleFrecuencia, setSimpleFrecuencia] = useState('mensual');

  // Toggle evolución (panel 3)
  const [showEvoAporte, setShowEvoAporte] = useState(true);
  const [showEvoIntereses, setShowEvoIntereses] = useState(true);

  const initialNum = useMemo(() => {
    const n = parseFloat(initial || '0');
    return Number.isNaN(n) ? 0 : clamp(n, 0, 1e9);
  }, [initial]);

  const monthlyNum = useMemo(() => {
    const n = parseFloat(monthly || '0');
    return Number.isNaN(n) ? 0 : clamp(n, 0, 1e8);
  }, [monthly]);

  const simpleResult = useMemo(
    () =>
      calcularInteresCompuestoSimple(
        simpleCapital,
        simpleTasa / 100,
        simpleTiempo,
        simpleContrib,
        simpleFrecuencia
      ),
    [simpleCapital, simpleTasa, simpleTiempo, simpleContrib, simpleFrecuencia]
  );

  const { seriesInv, seriesCash, series4, series6 } = useMemo(() => {
    const base = simulate({
      initial: initialNum,
      monthly: monthlyNum,
      years,
      rAnnual,
      inflAnnual,
      real,
      rateMode,
      roundPerPeriod,
    });

    const sim4 = simulate({
      initial: initialNum,
      monthly: monthlyNum,
      years,
      rAnnual: 0.04,
      inflAnnual,
      real,
      rateMode,
      roundPerPeriod,
    });

    const sim6 = simulate({
      initial: initialNum,
      monthly: monthlyNum,
      years,
      rAnnual: 0.06,
      inflAnnual,
      real,
      rateMode,
      roundPerPeriod,
    });

    return {
      seriesInv: base.seriesInv,
      seriesCash: base.seriesCash,
      series4: sim4.seriesInv,
      series6: sim6.seriesInv,
    };
  }, [initialNum, monthlyNum, years, rAnnual, inflAnnual, real, rateMode, roundPerPeriod]);

  const endInv = seriesInv[seriesInv.length - 1] ?? 0;
  const endCash = seriesCash[seriesCash.length - 1] ?? 0;
  const end4 = series4[series4.length - 1] ?? 0;
  const end6 = series6[series6.length - 1] ?? 0;

  const diff = (a, b) => ({ abs: a - b, rel: b > 0 ? a / b - 1 : 0 });
  const dCash = diff(endInv, endCash);
  const d4 = diff(endInv, end4);
  const d6 = diff(endInv, end6);

  const evolucion = simpleResult.evolucion || [];
  const maxTotalEvo =
    evolucion.length > 0 ? Math.max(...evolucion.map((e) => e.total)) : 1;

  return (
    <div className="space-y-6">
      {/* TABS superiores */}
      <Tabs defaultValue="paciencia" className="w-full">
        <div className="flex justify-center mb-4">
          <TabsList className="bg-slate-100 rounded-2xl p-1 grid grid-cols-3 gap-1 w-full max-w-xl">
            <TabsTrigger
              value="paciencia"
              className="text-xs md:text-sm py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f2f4b]"
            >
              Paciencia paga
            </TabsTrigger>
            <TabsTrigger
              value="simulador"
              className="text-xs md:text-sm py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f2f4b]"
            >
              Interés compuesto
            </TabsTrigger>
            <TabsTrigger
              value="calculadora"
              className="text-xs md:text-sm py-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#0f2f4b]"
            >
              Calculadora interés compuesto
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1 — Paciencia paga */}
        <TabsContent value="paciencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                La paciencia paga
                <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
                  Ejemplo: 100 USD mensuales
                </span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Tres horizontes con el mismo aporte mensual muestran cómo el{' '}
                <strong>tiempo</strong> hace crecer la porción de intereses sobre el total.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DonutPaciencia
                  titulo="10 años"
                  aporte={12000}
                  intereses={6294.6}
                  totalTexto={`USD ${(
                    12000 + 6294.6
                  ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <DonutPaciencia
                  titulo="20 años"
                  aporte={24000}
                  intereses={34901.99}
                  totalTexto={`USD ${(
                    24000 + 34901.99
                  ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <DonutPaciencia
                  titulo="30 años"
                  aporte={36000}
                  intereses={113035.85}
                  totalTexto={`USD ${(
                    36000 + 113035.85
                  ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 — Simulador interés compuesto */}
        <TabsContent value="simulador">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {toolName || 'Simulador: invertir vs colchón'}
                <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
                  Simulación determinística · Montos en USD
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Parámetros + resultados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parámetros */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Capital inicial</div>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={initial}
                        min={0}
                        step={50}
                        onChange={(e) => setInitial(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Aporte mensual</div>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={monthly}
                        min={0}
                        step={10}
                        onChange={(e) => setMonthly(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Horizonte (años)</div>
                      <input
                        type="range"
                        min={1}
                        max={40}
                        step={1}
                        value={years}
                        onChange={(e) => setYears(parseInt(e.target.value, 10) || 1)}
                        className="w-full"
                      />
                      <div className="text-sm font-semibold">{years} años</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Rendimiento anual (invertir)</div>
                      <input
                        type="range"
                        min={0}
                        max={0.25}
                        step={0.005}
                        value={rAnnual}
                        onChange={(e) => setRAnnual(parseFloat(e.target.value || '0'))}
                        className="w-full"
                      />
                      <div className="text-sm font-semibold">{pct(rAnnual)}</div>
                    </div>

                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Inflación anual USD (opcional)</div>
                      <input
                        type="range"
                        min={0}
                        max={0.08}
                        step={0.005}
                        value={inflAnnual}
                        onChange={(e) => setInfl(parseFloat(e.target.value || '0'))}
                        className="w-full"
                      />
                      <div className="text-sm font-semibold">{pct(inflAnnual)}</div>
                    </div>

                    <div className="flex items-end gap-2">
                      <input
                        id="real"
                        type="checkbox"
                        className="h-4 w-4"
                        checked={real}
                        onChange={(e) => setReal(e.target.checked)}
                      />
                      <label htmlFor="real" className="text-xs">
                        Mostrar en <strong>términos reales</strong>
                      </label>
                    </div>

                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Interpretación de la tasa</div>
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-xs"
                        value={rateMode}
                        onChange={(e) => setRateMode(e.target.value)}
                      >
                        <option value="effective">Efectiva anual → mensual: (1+r)^(1/12) − 1</option>
                        <option value="nominal">Nominal anual prorrateada: r/12</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-2">
                      <input
                        id="rounding"
                        type="checkbox"
                        className="h-4 w-4"
                        checked={roundPerPeriod}
                        onChange={(e) => setRoundPerPeriod(e.target.checked)}
                      />
                      <label htmlFor="rounding" className="text-xs">
                        Redondear cada mes a 2 decimales
                      </label>
                    </div>
                  </div>
                </div>

                {/* Resultados */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="bg-[#0f2f4b] text-white rounded-xl px-4 py-3">
                    <div className="text-xs uppercase tracking-wide opacity-90">
                      Valor final invirtiendo
                    </div>
                    <div className="text-2xl font-semibold">{nf(endInv)}</div>
                    <div className="text-[11px] opacity-80 mt-1">
                      Mismos aportes pero invertidos a la tasa seleccionada.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                    <div>
                      <div className="text-[11px] text-gray-500">Colchón (base)</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]">{nf(endCash)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500">Benchmark 4% EA</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]">{nf(end4)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-500">Benchmark 6% EA</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]">{nf(end6)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <div>
                      <div className="text-[11px] text-gray-600 mb-1">vs. Colchón</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]">{nf(dCash.abs)}</div>
                      <div className="text-[11px] text-green-700">
                        {(dCash.rel * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-600 mb-1">vs. 4% EA</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]}">{nf(d4.abs)}</div>
                      <div className="text-[11px] text-green-700">
                        {(d4.rel * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-600 mb-1">vs. 6% EA</div>
                      <div className="text-sm font-semibold text-[#0f2f4b]}">{nf(d6.abs)}</div>
                      <div className="text-[11px] text-green-700">
                        {(d6.rel * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de evolución */}
              <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-4">
                <LineChart
                  series={[seriesInv, seriesCash, series4, series6]}
                  colors={[F.azul, F.cel, '#9CA3AF', '#22C55E']}
                  horizonLabel={`${years} años`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 — Calculadora con torta + evolución filtrable */}
        <TabsContent value="calculadora">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Calculadora de interés compuesto
                <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
                  Modo rápido · desglose aporte / intereses
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Capital inicial (USD)</div>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={simpleCapital}
                      min={0}
                      onChange={(e) =>
                        setSimpleCapital(clamp(parseFloat(e.target.value || '0'), 0, 1e9))
                      }
                    />
                  </div>
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">
                      Contribución por período (USD)
                    </div>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={simpleContrib}
                      min={0}
                      onChange={(e) =>
                        setSimpleContrib(clamp(parseFloat(e.target.value || '0'), 0, 1e8))
                      }
                    />
                  </div>
                  <div>
                    <div className="text-[12px] text-gray-600 mb-1">Frecuencia de aporte</div>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={simpleFrecuencia}
                      onChange={(e) => setSimpleFrecuencia(e.target.value)}
                    >
                      <option value="mensual">Mensual</option>
                      <option value="bimestral">Bimestral</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="cuatrimestral">Cuatrimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Tasa anual (%)</div>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={simpleTasa}
                        min={0}
                        max={50}
                        step={0.1}
                        onChange={(e) =>
                          setSimpleTasa(clamp(parseFloat(e.target.value || '0'), 0, 50))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-gray-600 mb-1">Tiempo (años)</div>
                      <input
                        type="number"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={simpleTiempo}
                        min={0}
                        max={50}
                        step={1}
                        onChange={(e) =>
                          setSimpleTiempo(clamp(parseFloat(e.target.value || '0'), 0, 50))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Resultados + donut */}
                <div className="space-y-3">
                  <div className="bg-[#ecf5ff] border border-[#cfe3f7] rounded-2xl px-4 py-4 shadow-sm text-center">
                    <div className="text-xs uppercase tracking-wide text-[#0f2f4b]/70 mb-1">
                      Monto final estimado
                    </div>
                    <div className="text-2xl font-extrabold text-[#0b375a]">
                      {nf(simpleResult.montoFinal)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Aportando de forma constante según tus parámetros.
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-600">Total contribuido</span>
                      <span className="text-sm font-semibold text-[#0f2f4b]">
                        {nf(simpleResult.totalAportado)}{' '}
                        <span className="text-xs text-gray-500">
                          ({simpleResult.pctAporte.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-600">Total intereses</span>
                      <span className="text-sm font-semibold text-emerald-700">
                        {nf(simpleResult.intereses)}{' '}
                        <span className="text-xs text-gray-500">
                          ({simpleResult.pctIntereses.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Torta aporte vs intereses */}
                  <DonutPaciencia
                    titulo="Composición del monto final"
                    aporte={simpleResult.totalAportado}
                    intereses={simpleResult.intereses}
                    totalTexto={nf(simpleResult.montoFinal)}
                  />
                </div>
              </div>

              {/* Evolución año a año – capital vs intereses */}
              {evolucion.length > 0 && (
                <div className="mt-6 bg-white border border-gray-200 rounded-2xl px-4 py-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <div className="text-[12px] text-gray-600">
                      Evolución año a año (Aporte vs Intereses)
                    </div>
                    <div className="flex gap-2 justify-start md:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowEvoAporte((v) => !v)}
                        className={`text-[11px] px-3 py-1 rounded-full border ${
                          showEvoAporte
                            ? 'bg-[#0f2f4b] text-white border-[#0f2f4b]'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Aporte
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEvoIntereses((v) => !v)}
                        className={`text-[11px] px-3 py-1 rounded-full border ${
                          showEvoIntereses
                            ? 'bg-[#36a2eb] text-white border-[#36a2eb]'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Intereses
                      </button>
                    </div>
                  </div>

<div className="flex items-end gap-3 pt-3 pb-2">
  {evolucion.map((e) => {
    const totalYear = e.total || e.aporte + e.intereses;
    const barTotalPct = (totalYear / maxTotalEvo) * 100;

    let aportePct = 0;
    let interesPct = 0;
    if (totalYear > 0) {
      if (showEvoAporte) {
        aportePct = (e.aporte / totalYear) * barTotalPct;
      }
      if (showEvoIntereses) {
        interesPct = (e.intereses / totalYear) * barTotalPct;
      }
    }

    return (
      <div key={e.anio} className="flex-1 flex flex-col items-center">
        <div className="h-40 w-full max-w-[40px] bg-gray-100 rounded-t-xl overflow-hidden flex flex-col justify-end">
          <div
            className="w-full bg-[#0f2f4b] transition-all"
            style={{ height: `${aportePct}%` }}
            title={`Aporte año ${e.anio}`}
          />
          <div
            className="w-full bg-[#36a2eb] transition-all"
            style={{ height: `${interesPct}%` }}
            title={`Intereses año ${e.anio}`}
          />
        </div>
        <div className="text-[10px] mt-1">Año {e.anio}</div>
      </div>
    );
  })}
</div>

                  {/* Leyenda */}
                  <div className="flex justify-center gap-4 mt-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#0f2f4b]" />
                      <span>Aporte</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-[#36a2eb]" />
                      <span>Intereses</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
