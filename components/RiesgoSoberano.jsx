import React, { useState, useMemo } from 'react';
import * as Recharts from 'recharts';

// ==== Utilidades numéricas ====
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const seg = (x, a, b, ya, yb) => {
  if (x <= a) return ya;
  if (x >= b) return yb;
  return ya + (yb - ya) * ((x - a) / (b - a));
};
const sigmoid = (t) => 1 / (1 + Math.exp(-t));

// ==== Sub-scores por bloque (0–100) ====
function sFiscal({ primBal, intToRev, debtToGdp, mat12Gdp, pesoShare, indexedShare }) {
  // Primario: -3%→20, 0%→50, 1.5%→70, 3%→85, >3%→90
  let sPrim;
  if (primBal <= -3) sPrim = 20;
  else if (primBal < 0) sPrim = seg(primBal, -3, 0, 20, 50);
  else if (primBal < 1.5) sPrim = seg(primBal, 0, 1.5, 50, 70);
  else if (primBal < 3) sPrim = seg(primBal, 1.5, 3, 70, 85);
  else sPrim = 90;

  // Intereses/ingresos: 30%→20, 20%→40, 10%→70, 5%→85, <5%→90
  let sI2R;
  if (intToRev >= 30) sI2R = 20;
  else if (intToRev > 20) sI2R = seg(intToRev, 30, 20, 20, 40);
  else if (intToRev > 10) sI2R = seg(intToRev, 20, 10, 40, 70);
  else if (intToRev > 5) sI2R = seg(intToRev, 10, 5, 70, 85);
  else sI2R = 90;

  // Deuda/PBI total: 120%→25, 90%→45, 60%→70, 40%→85, <40%→92
  let sDebt;
  if (debtToGdp >= 120) sDebt = 25;
  else if (debtToGdp > 90) sDebt = seg(debtToGdp, 120, 90, 25, 45);
  else if (debtToGdp > 60) sDebt = seg(debtToGdp, 90, 60, 45, 70);
  else if (debtToGdp > 40) sDebt = seg(debtToGdp, 60, 40, 70, 85);
  else sDebt = 92;

  // Vencimientos 12m: 15%→30, 10%→55, 5%→80, <5%→90
  let sMat;
  if (mat12Gdp >= 15) sMat = 30;
  else if (mat12Gdp > 10) sMat = seg(mat12Gdp, 15, 10, 30, 55);
  else if (mat12Gdp > 5) sMat = seg(mat12Gdp, 10, 5, 55, 80);
  else sMat = 90;

  // Mix pesos/indexada
  const pesoImpact = seg(pesoShare, 20, 60, 40, 80);   // 20%→40 ; 60%→80
  const idxPenalty = seg(indexedShare, 90, 50, 30, 80); // 90%→30 ; 50%→80
  const sMix = clamp(0.55 * pesoImpact + 0.45 * idxPenalty, 20, 90);

  const score =
    0.28 * sPrim +
    0.22 * sI2R +
    0.24 * sDebt +
    0.16 * sMat +
    0.10 * sMix;

  return Math.round(score * 10) / 10;
}

function sFinance({ rollRate, cashBuff, privateDem }) {
  // Rollover: 60%→30, 80%→55, 100%→75, 120%→88, >120%→92
  let sRoll;
  if (rollRate <= 60) sRoll = 30;
  else if (rollRate < 80) sRoll = seg(rollRate, 60, 80, 30, 55);
  else if (rollRate < 100) sRoll = seg(rollRate, 80, 100, 55, 75);
  else if (rollRate < 120) sRoll = seg(rollRate, 100, 120, 75, 88);
  else sRoll = 92;

  // Caja: 0m→25, 1m→50, 2m→70, 4m→85, >4m→90
  let sCash;
  if (cashBuff <= 0) sCash = 25;
  else if (cashBuff < 1) sCash = seg(cashBuff, 0, 1, 25, 50);
  else if (cashBuff < 2) sCash = seg(cashBuff, 1, 2, 50, 70);
  else if (cashBuff < 4) sCash = seg(cashBuff, 2, 4, 70, 85);
  else sCash = 90;

  // Demanda privada: 20%→30, 40%→55, 60%→70, 80%→85, >80%→90
  let sPriv;
  if (privateDem <= 20) sPriv = 30;
  else if (privateDem < 40) sPriv = seg(privateDem, 20, 40, 30, 55);
  else if (privateDem < 60) sPriv = seg(privateDem, 40, 60, 55, 70);
  else if (privateDem < 80) sPriv = seg(privateDem, 60, 80, 70, 85);
  else sPriv = 90;

  const score =
    0.45 * sRoll +
    0.30 * sCash +
    0.25 * sPriv;

  return Math.round(score * 10) / 10;
}

function sMacro({ inflYoY, inflExp, fxGap, netRes, realRate }) {
  // Inflación actual: 200%→20, 100%→40, 50%→65, 20%→85, <20%→90
  let sInf;
  if (inflYoY >= 200) sInf = 20;
  else if (inflYoY > 100) sInf = seg(inflYoY, 200, 100, 20, 40);
  else if (inflYoY > 50) sInf = seg(inflYoY, 100, 50, 40, 65);
  else if (inflYoY > 20) sInf = seg(inflYoY, 50, 20, 65, 85);
  else sInf = 90;

  // Expectativas: 150%→20, 80%→45, 40%→70, 20%→85, <20%→92
  let sExp;
  if (inflExp >= 150) sExp = 20;
  else if (inflExp > 80) sExp = seg(inflExp, 150, 80, 20, 45);
  else if (inflExp > 40) sExp = seg(inflExp, 80, 40, 45, 70);
  else if (inflExp > 20) sExp = seg(inflExp, 40, 20, 70, 85);
  else sExp = 92;

  // Brecha: 150%→20, 80%→45, 40%→65, 20%→80, <20%→88
  let sGap;
  if (fxGap >= 150) sGap = 20;
  else if (fxGap > 80) sGap = seg(fxGap, 150, 80, 20, 45);
  else if (fxGap > 40) sGap = seg(fxGap, 80, 40, 45, 65);
  else if (fxGap > 20) sGap = seg(fxGap, 40, 20, 65, 80);
  else sGap = 88;

  // Reservas netas: -5→25, 0→40, 5→60, 10→75, 20→88, >20→92
  let sRes;
  if (netRes <= -5) sRes = 25;
  else if (netRes < 0) sRes = seg(netRes, -5, 0, 25, 40);
  else if (netRes < 5) sRes = seg(netRes, 0, 5, 40, 60);
  else if (netRes < 10) sRes = seg(netRes, 5, 10, 60, 75);
  else if (netRes < 20) sRes = seg(netRes, 10, 20, 75, 88);
  else sRes = 92;

  // Tasa real: -20→25, 0→55, 3→70, 7→85, >7→90
  let sReal;
  if (realRate <= -20) sReal = 25;
  else if (realRate < 0) sReal = seg(realRate, -20, 0, 25, 55);
  else if (realRate < 3) sReal = seg(realRate, 0, 3, 55, 70);
  else if (realRate < 7) sReal = seg(realRate, 3, 7, 70, 85);
  else sReal = 90;

  const score =
    0.30 * sInf +
    0.25 * sExp +
    0.20 * sGap +
    0.15 * sRes +
    0.10 * sReal;

  return Math.round(score * 10) / 10;
}

function sPolitical({ polRisk }) {
  // 0 (muy bajo) = 90 | 100 (muy alto) = 20
  const score = seg(polRisk, 100, 0, 20, 90);
  return Math.round(score * 10) / 10;
}

// Bandas de riesgo y rangos de PD
function bandFromScore(score) {
  if (isNaN(score)) return { k: '—', cls: '', ranges: null };
  if (score >= 75)
    return {
      k: 'Riesgo bajo',
      cls: 'good',
      ranges: {
        m12: '1–5%',
        m24: '3–10%',
        m36: '7–18%',
      },
    };
  if (score >= 60)
    return {
      k: 'Riesgo medio',
      cls: 'mid',
      ranges: {
        m12: '5–12%',
        m24: '12–25%',
        m36: '20–40%',
      },
    };
  if (score >= 45)
    return {
      k: 'Riesgo alto',
      cls: 'bad',
      ranges: {
        m12: '12–25%',
        m24: '25–45%',
        m36: '40–65%',
      },
    };
  return {
    k: 'Riesgo muy alto',
    cls: 'bad',
    ranges: {
      m12: '25–45%',
      m24: '45–70%',
      m36: '65–90%',
    },
  };
}

// Score → PD
function pdFromScore(score) {
  if (isNaN(score)) return { pd12: NaN, pd24: NaN, pd36: NaN };
  // 12m: logística (piso 0.5%, techo 60%)
  const pd12 =
    100 * (0.005 + (0.6 - 0.005) * (1 - sigmoid((score - 60) / 6.5)));
  // acumulación a 24/36m
  const pd24 = 100 * (1 - Math.pow(1 - pd12 / 100, 2 * 0.85));
  const pd36 = 100 * (1 - Math.pow(1 - pd12 / 100, 3 * 0.8));
  return { pd12, pd24, pd36 };
}

const defaultWeights = {
  wFiscal: 40,
  wFinance: 30,
  wMacro: 20,
  wPol: 10,
};

export default function CalculadoraPDSoberana() {
  const [inputs, setInputs] = useState({
    primBal: '',
    intToRev: '',
    debtToGdp: '',
    mat12Gdp: '',
    pesoShare: '',
    indexedShare: '',
    rollRate: '',
    cashBuff: '',
    privateDem: '',
    inflYoY: '',
    inflExp: '',
    fxGap: '',
    netRes: '',
    realRate: '',
    polRisk: '',
  });

  const [weights, setWeights] = useState(defaultWeights);
  const [presetJson, setPresetJson] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleInputChange = (field) => (e) => {
    setInputs((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleWeightChange = (field) => (e) => {
    setWeights((prev) => ({
      ...prev,
      [field]: Number(e.target.value) || 0,
    }));
  };

  // Cálculo principal: subs + score
  const { subs, score } = useMemo(() => {
    const vals = {
      primBal: +inputs.primBal,
      intToRev: +inputs.intToRev,
      debtToGdp: +inputs.debtToGdp,
      mat12Gdp: +inputs.mat12Gdp,
      pesoShare: +inputs.pesoShare,
      indexedShare: +inputs.indexedShare,
      rollRate: +inputs.rollRate,
      cashBuff: +inputs.cashBuff,
      privateDem: +inputs.privateDem,
      inflYoY: +inputs.inflYoY,
      inflExp: +inputs.inflExp,
      fxGap: +inputs.fxGap,
      netRes: +inputs.netRes,
      realRate: +inputs.realRate,
      polRisk: +inputs.polRisk,
    };

    const fiscal = sFiscal(vals);
    const finance = sFinance(vals);
    const macro = sMacro(vals);
    const polit = sPolitical(vals);

    const { wFiscal, wFinance, wMacro, wPol } = weights;
    const sum =
      (wFiscal || 0) +
        (wFinance || 0) +
        (wMacro || 0) +
        (wPol || 0) || 1;

    const rawScore =
      fiscal * (wFiscal / sum) +
      finance * (wFinance / sum) +
      macro * (wMacro / sum) +
      polit * (wPol / sum);

    return {
      subs: {
        Fiscal: fiscal,
        Financiamiento: finance,
        Macro: macro,
        Político: polit,
      },
      score: Math.round(rawScore * 10) / 10,
    };
  }, [inputs, weights]);

  const bandInfo = useMemo(() => bandFromScore(score), [score]);
  const { pd12, pd24, pd36 } = useMemo(
    () => pdFromScore(score),
    [score]
  );

  const pdRows = useMemo(
    () => [
      { label: '12 meses', value: pd12, range: bandInfo.ranges?.m12 ?? '—' },
      { label: '24 meses', value: pd24, range: bandInfo.ranges?.m24 ?? '—' },
      { label: '36 meses', value: pd36, range: bandInfo.ranges?.m36 ?? '—' },
    ],
    [pd12, pd24, pd36, bandInfo]
  );

  const chartData = useMemo(
    () =>
      pdRows.map((r) => ({
        horizonte: r.label.replace(' meses', 'm'),
        pd: isNaN(r.value) ? 0 : Math.round(r.value * 10) / 10,
      })),
    [pdRows]
  );

  const handleCalcular = () => {
    setHasCalculated(true);
  };

  const handleDemo = () => {
    const demo = {
      primBal: 0.6,
      intToRev: 11,
      debtToGdp: 85,
      mat12Gdp: 9,
      pesoShare: 48,
      indexedShare: 72,
      rollRate: 105,
      cashBuff: 1.8,
      privateDem: 62,
      inflYoY: 85,
      inflExp: 60,
      fxGap: 30,
      netRes: 5.5,
      realRate: 2.5,
      polRisk: 55,
    };
    setInputs(
      Object.fromEntries(
        Object.entries(demo).map(([k, v]) => [k, String(v)])
      )
    );
    setHasCalculated(true);
  };

  const handleResetWeights = () => {
    setWeights(defaultWeights);
    setHasCalculated(true);
  };

  const handleExportPreset = () => {
    const data = {
      values: inputs,
      weights,
    };
    setPresetJson(JSON.stringify(data, null, 2));
  };

  const handleImportPreset = () => {
    try {
      const obj = JSON.parse(presetJson || '{}');
      if (obj.values) {
        setInputs((prev) => ({ ...prev, ...obj.values }));
      }
      if (obj.weights) {
        setWeights((prev) => ({ ...prev, ...obj.weights }));
      }
      setHasCalculated(true);
    } catch (e) {
      alert('Preset inválido');
    }
  };

  const scoreBarColor = (() => {
    if (isNaN(score)) return '#e5e7eb';
    if (score >= 60) return '#A7F3D0';
    if (score >= 45) return '#FDE68A';
    return '#FCA5A5';
  })();

  const bandBadgeClasses = (() => {
    if (bandInfo.cls === 'good') return 'bg-emerald-50 text-emerald-700';
    if (bandInfo.cls === 'mid') return 'bg-amber-50 text-amber-700';
    if (bandInfo.cls === 'bad') return 'bg-rose-50 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  })();

  return (
    <>
      {/* HERO estilo FINFOCUS, mismo logo que Riesgo Corporativo */}
      <div className="max-w-5xl mx-auto mb-6 rounded-2xl bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white px-6 py-4 md:py-5 shadow-md flex items-center gap-4 md:gap-5">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/95 flex items-center justify-center shadow-md">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765224116377-784fbb45/riesgo_soberano_o_corporativo.png"
              alt="Riesgo soberano FINFOCUS"
              className="w-12 h-12 md:w-14 md:h-14 object-contain"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-base md:text-xl font-extrabold tracking-tight">
            Riesgo soberano – Calculadora de Probabilidad de Default (PD)
          </h1>
          <p className="text-xs md:text-sm leading-snug opacity-90 max-w-2xl">
            Ingresá los principales indicadores fiscales, de financiamiento, macro
            y políticos para estimar de forma heurística la PD soberana en pesos
            a 12, 24 y 36 meses.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              'Fiscal y deuda pública',
              'Financiamiento y rollover',
              'Macro y reservas',
              'PD 12 / 24 / 36 meses',
            ].map((chip) => (
              <span
                key={chip}
                className="text-[0.65rem] md:text-[0.7rem] px-2 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Caja principal blanca */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg px-4 py-5 md:px-8 md:py-7">
        <div className="text-[0.7rem] md:text-xs text-center text-slate-500 mb-5">
          Uso educativo y para <strong>screening inicial</strong>. No sustituye un
          análisis de sustentabilidad de deuda completo, ni las métricas oficiales
          de organismos ni el riesgo país de mercado.
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {/* 1) Variables de entrada */}
          <div className="border border-slate-100 rounded-2xl bg-slate-50/60 px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-2">
              1) Variables de entrada
            </h2>

            <div className="grid grid-cols-1 gap-3 text-xs md:text-sm">
              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Resultado primario / PBI (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={inputs.primBal}
                  onChange={handleInputChange('primBal')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Superávit (+) reduce PD. Referencia: ≥1.5% bueno, &lt;0% malo.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Intereses / Ingresos (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="8"
                  value={inputs.intToRev}
                  onChange={handleInputChange('intToRev')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  {'<'}10% cómodo, {'>'}20% estresante.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Deuda bruta / PBI (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="85"
                  value={inputs.debtToGdp}
                  onChange={handleInputChange('debtToGdp')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Usar total. El mix se carga abajo.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Participación deuda en pesos (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="45"
                  value={inputs.pesoShare}
                  onChange={handleInputChange('pesoShare')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Sobre el total de deuda.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Indexada (CER / dólar-linked) sobre pesos (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={inputs.indexedShare}
                  onChange={handleInputChange('indexedShare')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Mayor indexación = mayor sensibilidad macro.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Vencimientos 12m / PBI (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="8"
                  value={inputs.mat12Gdp}
                  onChange={handleInputChange('mat12Gdp')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Calendario de corto plazo.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Tasa de rollover 12m (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="110"
                  value={inputs.rollRate}
                  onChange={handleInputChange('rollRate')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  {'<'}80% preocupante; {'>'}100% mejora liquidez.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Colchón de caja Tesoro (meses de intereses)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={inputs.cashBuff}
                  onChange={handleInputChange('cashBuff')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Demanda privada en licitaciones (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="65"
                  value={inputs.privateDem}
                  onChange={handleInputChange('privateDem')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  % del financiamiento que no proviene de BCRA/sector público.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Inflación YoY (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="85"
                  value={inputs.inflYoY}
                  onChange={handleInputChange('inflYoY')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Inflación esperada 12m (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="60"
                  value={inputs.inflExp}
                  onChange={handleInputChange('inflExp')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Brecha cambiaria (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="25"
                  value={inputs.fxGap}
                  onChange={handleInputChange('fxGap')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Reservas netas (USD bn)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="6"
                  value={inputs.netRes}
                  onChange={handleInputChange('netRes')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Afecta expectativas y rollover en pesos.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Tasa real esperada (CER real, %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="3"
                  value={inputs.realRate}
                  onChange={handleInputChange('realRate')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Positiva sostiene demanda de pesos.
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Riesgo político (0–100)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="55"
                  value={inputs.polRisk}
                  onChange={handleInputChange('polRisk')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
                <div className="text-[0.7rem] text-slate-500">
                  Subjetivo: 0 = muy bajo, 100 = muy alto.
                </div>
              </div>
            </div>

            {/* Pesos avanzados */}
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer font-semibold text-[#0f2f4b]">
                Ajustar pesos del modelo
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold text-slate-700">
                    Fiscal %
                  </label>
                  <input
                    type="number"
                    value={weights.wFiscal}
                    onChange={handleWeightChange('wFiscal')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.7rem] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold text-slate-700">
                    Financiamiento %
                  </label>
                  <input
                    type="number"
                    value={weights.wFinance}
                    onChange={handleWeightChange('wFinance')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.7rem] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold text-slate-700">
                    Macro %
                  </label>
                  <input
                    type="number"
                    value={weights.wMacro}
                    onChange={handleWeightChange('wMacro')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.7rem] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold text-slate-700">
                    Político %
                  </label>
                  <input
                    type="number"
                    value={weights.wPol}
                    onChange={handleWeightChange('wPol')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.7rem] bg-white"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetWeights}
                  className="px-3 py-1.5 rounded-full border border-[#0f2f4b] text-[#0f2f4b] text-[0.7rem] font-semibold bg-white hover:bg-[#0f2f4b] hover:text-white transition"
                >
                  Reset pesos
                </button>
                <button
                  type="button"
                  onClick={handleExportPreset}
                  className="px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                >
                  Exportar preset
                </button>
                <button
                  type="button"
                  onClick={handleImportPreset}
                  className="px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                >
                  Importar preset
                </button>
              </div>

              <textarea
                rows={4}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.7rem] font-mono"
                placeholder="Pegá aquí tu preset JSON"
                value={presetJson}
                onChange={(e) => setPresetJson(e.target.value)}
              />
            </details>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleDemo}
                className="px-3 py-1.5 rounded-full border border-[#0f2f4b] text-[#0f2f4b] text-[0.75rem] font-semibold bg-white hover:bg-[#0f2f4b] hover:text-white transition"
              >
                Demo AR
              </button>
              <button
                type="button"
                onClick={handleCalcular}
                className="px-4 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.8rem] font-semibold"
              >
                Calcular PD
              </button>
            </div>
          </div>

          {/* 2) Resultados */}
          <div className="border border-slate-100 rounded-2xl bg-white px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-3">
              2) Resultados
            </h2>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                <div className="flex-1 space-y-2">
                  <div className="text-[0.7rem] text-slate-500">
                    Score soberano (0–100)
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-[#0f2f4b]">
                    {isNaN(score) ? '—' : score.toFixed(1)}
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: isNaN(score)
                          ? '0%'
                          : `${clamp(score, 0, 100)}%`,
                        background: scoreBarColor,
                      }}
                    />
                  </div>
                  <div
                    className={`inline-flex items-center mt-1 px-2 py-1 rounded-full text-[0.7rem] font-semibold ${bandBadgeClasses}`}
                  >
                    {bandInfo.k}
                  </div>
                </div>

                <div className="flex-[1.6] w-full h-40 md:h-48">
                  <Recharts.ResponsiveContainer width="100%" height="100%">
                    <Recharts.BarChart data={hasCalculated ? chartData : []}>
                      <Recharts.CartesianGrid strokeDasharray="3 3" />
                      <Recharts.XAxis
                        dataKey="horizonte"
                        tick={{ fontSize: 10 }}
                      />
                      <Recharts.YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 'auto']}
                      />
                      <Recharts.Tooltip
                        formatter={(value) => [`${value}% PD`, 'PD']}
                      />
                      <Recharts.Bar dataKey="pd">
                        <Recharts.LabelList
                          dataKey="pd"
                          position="top"
                          formatter={(v) => `${v}%`}
                        />
                      </Recharts.Bar>
                    </Recharts.BarChart>
                  </Recharts.ResponsiveContainer>
                </div>
              </div>

              {/* Tabla PD por horizonte */}
              <div className="mt-2">
                <table className="w-full text-[0.7rem] md:text-xs border-separate border-spacing-y-1">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="text-left px-2 py-1">Horizonte</th>
                      <th className="text-left px-2 py-1">PD puntual</th>
                      <th className="text-left px-2 py-1">Rango orientativo</th>
                      <th className="text-left px-2 py-1">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdRows.map((r) => {
                      const sensitivity =
                        score >= 60
                          ? '±1 punto en score ≈ 0,35 pp en 12m'
                          : '±1 punto en score ≈ 0,70 pp en 12m';
                      return (
                        <tr
                          key={r.label}
                          className="bg-slate-50 rounded-xl shadow-sm"
                        >
                          <td className="px-2 py-1 rounded-l-xl">
                            {r.label}
                          </td>
                          <td className="px-2 py-1">
                            <strong>
                              {isNaN(r.value)
                                ? '—'
                                : `${r.value.toFixed(1)}%`}
                            </strong>
                          </td>
                          <td className="px-2 py-1">{r.range}</td>
                          <td className="px-2 py-1 rounded-r-xl text-slate-500">
                            {sensitivity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cómo se calcula */}
              <details className="mt-2 text-[0.7rem] md:text-xs">
                <summary className="cursor-pointer font-semibold text-[#0f2f4b]">
                  Cómo se calcula
                </summary>
                <p className="mt-2 leading-relaxed text-slate-600">
                  <strong>Fiscal (40%)</strong>: primario/PBI, intereses/ingresos,
                  deuda/PBI, vencimientos 12m, mix pesos/indexada. <br />
                  <strong>Financiamiento (30%)</strong>: rollover, caja Tesoro,
                  demanda privada. <br />
                  <strong>Macro (20%)</strong>: inflación actual y esperada, brecha,
                  reservas netas, tasa real. <br />
                  <strong>Político (10%)</strong>: riesgo cualitativo. <br />
                  Score → PD: función logística calibrada a 12m; 24/36m por
                  acumulación con factores de suavizado.
                </p>
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  ⚠️ Uso educativo/estimativo. No reemplaza un análisis formal de
                  sustentabilidad de deuda ni la lectura de curvas de mercado
                  (bonos hard-dollar, CDS, riesgo país, etc.).
                </p>
              </details>
            </div>
          </div>
        </div>

        {/* 3) Sub-scores */}
        <div className="mt-6 border border-slate-100 rounded-2xl bg-slate-50/60 px-4 py-4 md:px-5 md:py-5">
          <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-3">
            3) Desglose de sub-scores
          </h2>
          <div className="space-y-3">
            {Object.entries(subs).map(([k, v]) => {
              const val = isNaN(v) ? 0 : v;
              const barColor =
                val >= 60
                  ? '#A7F3D0'
                  : val >= 45
                  ? '#FDE68A'
                  : '#FCA5A5';
              return (
                <div
                  key={k}
                  className="flex items-center gap-3 text-[0.7rem] md:text-xs"
                >
                  <div className="min-w-[160px]">
                    <div className="font-semibold text-slate-800">{k}</div>
                    <div className="text-[0.65rem] text-slate-500">
                      sub-score: {isNaN(v) ? '—' : v.toFixed(1)}
                    </div>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${val}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
