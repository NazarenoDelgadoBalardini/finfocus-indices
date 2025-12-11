import React, { useState, useMemo } from 'react';
import * as Recharts from 'recharts';

// ========= Utilidades numéricas =========
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const seg = (x, a, b, ya, yb) => {
  if (x <= a) return ya;
  if (x >= b) return yb;
  return ya + (yb - ya) * ((x - a) / (b - a));
};
const sigmoid = (t) => 1 / (1 + Math.exp(-t));

// ========= Scoring por ratio =========
function scoreLiquidity(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 5;
  if (x <= 1.5) return seg(x, 0, 1.5, 10, 70);
  if (x <= 2.5) return seg(x, 1.5, 2.5, 70, 90);
  return clamp(90 + Math.log10(x / 2.5) * 10, 90, 100);
}
function scoreQuick(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 5;
  if (x <= 1.2) return seg(x, 0, 1.2, 10, 70);
  if (x <= 2.0) return seg(x, 1.2, 2.0, 70, 88);
  return clamp(88 + Math.log10(x / 2.0) * 8, 88, 100);
}
function scoreNDebitda(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 100;
  if (x <= 2) return seg(x, 0, 2, 100, 85);
  if (x <= 4) return seg(x, 2, 4, 85, 60);
  if (x <= 6) return seg(x, 4, 6, 60, 35);
  return clamp(35 - (x - 6) * 5, 15, 35);
}
function scoreIntCover(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 5;
  if (x <= 1) return seg(x, 0, 1, 5, 10);
  if (x <= 2) return seg(x, 1, 2, 10, 40);
  if (x <= 4) return seg(x, 2, 4, 40, 70);
  if (x <= 8) return seg(x, 4, 8, 70, 90);
  return clamp(90 + Math.log10(x / 8) * 5, 90, 96);
}
function scoreFcfInt(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 5;
  if (x <= 0.5) return seg(x, 0, 0.5, 5, 35);
  if (x <= 1.5) return seg(x, 0.5, 1.5, 35, 75);
  if (x <= 3.0) return seg(x, 1.5, 3.0, 75, 90);
  return clamp(90 + Math.log10(x / 3) * 6, 90, 97);
}
function scoreCashST(x) {
  if (x == null || isNaN(x)) return null;
  if (x <= 0) return 5;
  if (x <= 0.5) return seg(x, 0, 0.5, 5, 35);
  if (x <= 1.0) return seg(x, 0.5, 1.0, 35, 70);
  if (x <= 2.0) return seg(x, 1.0, 2.0, 70, 88);
  return clamp(88 + Math.log10(x / 2) * 8, 88, 99);
}
function scoreAltmanZ(x) {
  if (x == null || isNaN(x)) return null;
  if (x < 1.8) return seg(x, 0.5, 1.8, 20, 35);
  if (x <= 3.0) return seg(x, 1.8, 3.0, 35, 75);
  if (x <= 5.0) return seg(x, 3.0, 5.0, 75, 92);
  return clamp(92 + Math.log10(x / 5) * 6, 92, 98);
}

// ========= Altman Z =========
function calcAltmanZ(values, variant) {
  const {
    ca,
    cl,
    ta,
    tl,
    re,
    ebit,
    sales,
    bvEquity,
    mvEquity,
  } = values;
  if (!(ta > 0) || !(tl > 0)) {
    throw new Error('TA y TL deben ser mayores a 0');
  }
  const wc = (ca || 0) - (cl || 0);
  const X1 = wc / ta;
  const X2 = (re || 0) / ta;
  const X3 = (ebit || 0) / ta;
  const X4 = variant === 'Z' ? (mvEquity || 0) / tl : (bvEquity || 0) / tl;
  const X5 = (sales || 0) / ta;

  let Z;
  let coeffs;
  let usesX5;
  if (variant === 'Z') {
    coeffs = { a1: 1.2, a2: 1.4, a3: 3.3, a4: 0.6, a5: 1.0 };
    usesX5 = true;
    Z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 1.0 * X5;
  } else if (variant === "Z'") {
    coeffs = { a1: 0.717, a2: 0.847, a3: 3.107, a4: 0.420, a5: 0.998 };
    usesX5 = true;
    Z = 0.717 * X1 + 0.847 * X2 + 3.107 * X3 + 0.420 * X4 + 0.998 * X5;
  } else {
    coeffs = { a1: 6.56, a2: 3.26, a3: 6.72, a4: 1.05 };
    usesX5 = false;
    Z = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4;
  }

  return { Z, X1, X2, X3, X4, X5, coeffs, usesX5, wc };
}

function zoneFromZ(z) {
  if (isNaN(z)) return { txt: '—', cls: '' };
  if (z > 3.0) return { txt: 'Zona segura (>3.0)', cls: 'good' };
  if (z >= 1.8) return { txt: 'Zona gris (1.8–3.0)', cls: 'mid' };
  return { txt: 'Zona de peligro (<1.8)', cls: 'bad' };
}

// ========= Config campos =========
const fieldsConfig = {
  curRatio: { scorer: scoreLiquidity, label: 'Liquidez corriente' },
  quickRatio: { scorer: scoreQuick, label: 'Prueba ácida' },
  ndEbitda: { scorer: scoreNDebitda, label: 'Deuda Neta/EBITDA' },
  intCover: { scorer: scoreIntCover, label: 'Cobertura de intereses' },
  fcfInt: { scorer: scoreFcfInt, label: 'FCF/Intereses' },
  cashStdebt: { scorer: scoreCashST, label: 'Efectivo/Pasivo CP' },
  altmanZ: { scorer: scoreAltmanZ, label: 'Altman Z-Score' },
};

const fieldOrder = [
  'curRatio',
  'quickRatio',
  'ndEbitda',
  'intCover',
  'fcfInt',
  'cashStdebt',
  'altmanZ',
];

const weightKeyByField = {
  curRatio: 'wCur',
  quickRatio: 'wQuick',
  ndEbitda: 'wND',
  intCover: 'wIC',
  fcfInt: 'wFCF',
  cashStdebt: 'wCash',
  altmanZ: 'wZ',
};

const defaultWeights = {
  wCur: 12,
  wQuick: 10,
  wND: 20,
  wIC: 18,
  wFCF: 14,
  wCash: 12,
  wZ: 14,
};

function bandFromScore(S) {
  if (S == null || isNaN(S)) return { k: '—', cls: '', ranges: null };
  if (S >= 80)
    return {
      k: 'Muy bajo',
      cls: 'good',
      ranges: {
        short: '0.5–1.5%',
        mid: '2–5%',
        long: '5–12%',
      },
    };
  if (S >= 65)
    return {
      k: 'Bajo',
      cls: 'good',
      ranges: {
        short: '1.5–3.5%',
        mid: '5–12%',
        long: '12–25%',
      },
    };
  if (S >= 50)
    return {
      k: 'Medio',
      cls: 'mid',
      ranges: {
        short: '3.5–8%',
        mid: '12–25%',
        long: '25–45%',
      },
    };
  if (S >= 35)
    return {
      k: 'Alto',
      cls: 'bad',
      ranges: {
        short: '8–15%',
        mid: '25–45%',
        long: '45–70%',
      },
    };
  return {
    k: 'Muy alto',
    cls: 'bad',
    ranges: {
      short: '15–35%',
      mid: '45–70%',
      long: '70–90%+',
    },
  };
}

function pdPointFromScore(S) {
  if (S == null || isNaN(S)) return { pd1: NaN, pd3: NaN, pd5: NaN };
  const pd1 =
    100 * (0.003 + (0.4 - 0.003) * (1 - sigmoid((S - 60) / 7)));
  const pd3 = 100 * (1 - Math.pow(1 - pd1 / 100, 3 * 0.85));
  const pd5 = 100 * (1 - Math.pow(1 - pd1 / 100, 5 * 0.9));
  return { pd1, pd3, pd5 };
}

export default function CalculadoraPD() {
  // Ratios
  const [ratios, setRatios] = useState({
    curRatio: '',
    quickRatio: '',
    ndEbitda: '',
    intCover: '',
    fcfInt: '',
    cashStdebt: '',
    altmanZ: '',
  });

  // Pesos
  const [weights, setWeights] = useState(defaultWeights);

  // Altman Z inputs
  const [zVariant, setZVariant] = useState('Z');
  const [zInputs, setZInputs] = useState({
    ca: '',
    cl: '',
    ta: '',
    tl: '',
    re: '',
    ebit: '',
    sales: '',
    bvEquity: '',
    mvEquity: '',
  });
  const [zInfo, setZInfo] = useState(null);

  // Preset JSON
  const [presetJson, setPresetJson] = useState('');

  // Para mostrar el gráfico recién cuando calculo
  const [hasCalculated, setHasCalculated] = useState(false);

  // Handlers
  const handleRatioChange = (field) => (e) => {
    setRatios((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleWeightChange = (key) => (e) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Number(e.target.value) || 0,
    }));
  };

  const handleZInputChange = (field) => (e) => {
    setZInputs((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // Cálculo de score + sub-scores
  const { score, subs } = useMemo(() => {
    let total = 0;
    const subscores = {};
    const weightValues = Object.values(weights);
    const sumWeights =
      weightValues.reduce((acc, v) => acc + (v || 0), 0) || 1;

    fieldOrder.forEach((fieldId) => {
      const val = parseFloat(ratios[fieldId]);
      const scorer = fieldsConfig[fieldId].scorer;
      const subScore = scorer(val);
      subscores[fieldId] =
        subScore == null || isNaN(subScore) ? null : subScore;
      const wKey = weightKeyByField[fieldId];
      const w = weights[wKey] || 0;
      if (subScore != null) {
        total += subScore * (w / sumWeights);
      }
    });

    const finalScore =
      isNaN(total) || !isFinite(total)
        ? NaN
        : Math.round(total * 10) / 10;

    return { score: finalScore, subs: subscores };
  }, [ratios, weights]);

  const band = useMemo(() => bandFromScore(score), [score]);
  const { pd1, pd3, pd5 } = useMemo(
    () => pdPointFromScore(score),
    [score]
  );

  const pdRows = useMemo(
    () => [
      { label: 'Corto (≤12m)', value: pd1 },
      { label: 'Mediano (1–3a)', value: pd3 },
      { label: 'Largo (3–5a+)', value: pd5 },
    ],
    [pd1, pd3, pd5]
  );

  const chartData = useMemo(
    () =>
      pdRows.map((r) => ({
        horizonte: r.label.split(' ')[0],
        pd: isNaN(r.value) ? 0 : Math.round(r.value * 10) / 10,
      })),
    [pdRows]
  );

  const handleCalcular = () => {
    setHasCalculated(true);
  };

  const handleDemo = () => {
    setRatios({
      curRatio: '1.6',
      quickRatio: '1.3',
      ndEbitda: '2.1',
      intCover: '4.2',
      fcfInt: '1.4',
      cashStdebt: '0.9',
      altmanZ: '2.8',
    });
    setHasCalculated(true);
  };

  const handleResetWeights = () => {
    setWeights(defaultWeights);
    setHasCalculated(true);
  };

  const handleExportPreset = () => {
    const preset = {
      weights,
      values: ratios,
    };
    setPresetJson(JSON.stringify(preset, null, 2));
  };

  const handleImportPreset = () => {
    try {
      const obj = JSON.parse(presetJson || '{}');
      if (obj.weights) {
        setWeights((prev) => ({ ...prev, ...obj.weights }));
      }
      if (obj.values) {
        setRatios((prev) => ({ ...prev, ...obj.values }));
      }
      setHasCalculated(true);
    } catch (e) {
      alert('Preset inválido');
    }
  };

  const handleCalcZ = () => {
    const parsed = Object.fromEntries(
      Object.entries(zInputs).map(([k, v]) => [k, parseFloat(v)])
    );
    try {
      const res = calcAltmanZ(parsed, zVariant);
      const z = Math.round(res.Z * 100) / 100;
      setRatios((prev) => ({ ...prev, altmanZ: String(z) }));
      const zone = zoneFromZ(z);
      setZInfo({
        z,
        zone,
        ...res,
        variant: zVariant,
      });
      setHasCalculated(true);
    } catch (e) {
      alert(e.message || 'Datos insuficientes');
    }
  };

  const scoreBarColor = (() => {
    if (isNaN(score)) return '#e5e7eb';
    if (score >= 65) return '#A7F3D0';
    if (score >= 50) return '#FDE68A';
    return '#FCA5A5';
  })();

  const bandBadgeClasses = (() => {
    if (band.cls === 'good') return 'bg-emerald-50 text-emerald-700';
    if (band.cls === 'mid') return 'bg-amber-50 text-amber-700';
    if (band.cls === 'bad') return 'bg-rose-50 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  })();

  return (
    <>
      {/* HERO tipo SMVM */}
      <div className="max-w-5xl mx-auto mb-6 rounded-2xl bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white px-6 py-4 md:py-5 shadow-md flex items-center gap-4 md:gap-5">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/95 flex items-center justify-center shadow-md">
            <img
              src="https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765224116377-784fbb45/riesgo_soberano_o_corporativo.png"
              alt="Riesgo corporativo FINFOCUS"
              className="w-12 h-12 md:w-14 md:h-14 object-contain"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-base md:text-xl font-extrabold tracking-tight">
            Riesgo corporativo – Calculadora de Probabilidad de Default (PD)
          </h1>
          <p className="text-xs md:text-sm leading-snug opacity-90 max-w-2xl">
            Ingresá los ratios clave de liquidez, endeudamiento y cobertura, y obtené
            una estimación heurística de la PD a corto, mediano y largo plazo.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {['Liquidez y apalancamiento', 'Altman Z-Score', 'PD 1 / 3 / 5 años', 'Modelo FINFOCUS'].map((chip) => (
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
          Uso educativo y de screening inicial. No sustituye un rating formal ni un
          análisis integral de vencimientos, garantías, sector y riesgo país.
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {/* 1) Ratios */}
          <div className="border border-slate-100 rounded-2xl bg-slate-50/60 px-4 py-4 md:px-5 md:py-5">
            <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-2">
              1) Ratios
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Liquidez corriente (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 1.5</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.2"
                  value={ratios.curRatio}
                  onChange={handleRatioChange('curRatio')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Prueba ácida (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 1.2</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.0"
                  value={ratios.quickRatio}
                  onChange={handleRatioChange('quickRatio')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Deuda Neta / EBITDA (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≤ 2.0</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2.5"
                  value={ratios.ndEbitda}
                  onChange={handleRatioChange('ndEbitda')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Cobertura de intereses (EBIT/Int) (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 4.0</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="3.0"
                  value={ratios.intCover}
                  onChange={handleRatioChange('intCover')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  FCF / Intereses (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 1.5</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.1"
                  value={ratios.fcfInt}
                  onChange={handleRatioChange('fcfInt')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Efectivo / Pasivo CP (x){' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 1.0</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.6"
                  value={ratios.cashStdebt}
                  onChange={handleRatioChange('cashStdebt')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800">
                  Altman Z-Score{' '}
                  <span className="text-[0.7rem] text-slate-500">Bueno ≥ 3.0</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2.2"
                  value={ratios.altmanZ}
                  onChange={handleRatioChange('altmanZ')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#5EA6D7] focus:border-[#0f2f4b]"
                />
              </div>
            </div>

            {/* Altman Z automático */}
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer font-semibold text-[#0f2f4b]">
                Calcular Altman Z automáticamente
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold text-slate-700">
                    Variante
                  </label>
                  <select
                    value={zVariant}
                    onChange={(e) => setZVariant(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                  >
                    <option value="Z">Z (pública/manufactura)</option>
                    <option value="Z'">Z' (privada/manufactura)</option>
                    <option value="Z''">Z'' (no manufactura / EM)</option>
                  </select>
                </div>

                {[
                  ['ca', 'Activos corrientes'],
                  ['cl', 'Pasivos corrientes'],
                  ['ta', 'Activos totales (TA)'],
                  ['tl', 'Pasivo total (TL)'],
                  ['re', 'Utilidades retenidas'],
                  ['ebit', 'EBIT'],
                  ['sales', 'Ventas (Sales)'],
                  ['bvEquity', 'Patrimonio neto (valor libro)'],
                  ['mvEquity', 'Valor de mercado del patrimonio'],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[0.7rem] font-semibold text-slate-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={zInputs[key]}
                      onChange={handleZInputChange(key)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCalcZ}
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-[#0f2f4b] text-white text-[0.7rem] font-semibold"
                >
                  Calcular Z e insertar
                </button>
                <div className="text-[0.7rem] text-slate-500">
                  Completá TA y TL &gt; 0. Z usa MV Patrimonio, Z&apos; y Z&apos;&apos; usan
                  valor libro.
                </div>
              </div>

              {zInfo && (
                <div className="mt-3 text-[0.7rem] text-slate-600 space-y-1">
                  <div
                    className={`inline-flex items-center px-2 py-1 rounded-full text-[0.7rem] font-semibold ${
                      zInfo.zone.cls === 'good'
                        ? 'bg-emerald-50 text-emerald-700'
                        : zInfo.zone.cls === 'mid'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {zInfo.zone.txt}
                  </div>
                  <div>
                    WC/TA={(zInfo.X1 * 100).toFixed(1)}%, RE/TA=
                    {(zInfo.X2 * 100).toFixed(1)}%, EBIT/TA=
                    {(zInfo.X3 * 100).toFixed(1)}%,{' '}
                    {(zInfo.variant === 'Z' ? 'MV' : 'BV')}/TL=
                    {(zInfo.X4 * 100).toFixed(1)}%
                    {zInfo.usesX5
                      ? `, Ventas/TA=${(zInfo.X5 * 100).toFixed(1)}%`
                      : ''}
                  </div>
                  <div className="text-[0.65rem] text-slate-500">
                    Fórmula {zInfo.variant}: coeficientes{' '}
                    {Object.values(zInfo.coeffs).join(', ')}. Z = {zInfo.z}
                  </div>
                </div>
              )}
            </details>

            {/* Pesos */}
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-semibold text-[#0f2f4b]">
                Avanzado: pesos del modelo
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ['wCur', 'Peso Liquidez'],
                  ['wQuick', 'Peso Prueba ácida'],
                  ['wND', 'Peso ND/EBITDA'],
                  ['wIC', 'Peso Cobertura int.'],
                  ['wFCF', 'Peso FCF/Int'],
                  ['wCash', 'Peso Cash/ST Debt'],
                  ['wZ', 'Peso Altman Z'],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[0.7rem] font-semibold text-slate-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={weights[key]}
                      onChange={handleWeightChange(key)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetWeights}
                  className="px-3 py-1.5 rounded-full border border-[#0f2f4b] text-[#0f2f4b] text-[0.7rem] font-semibold bg-white hover:bg-[#0f2f4b] hover:text-white transition"
                >
                  Restablecer pesos
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
                Demo
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
              {/* Score + banda */}
              <div className="space-y-2">
                <div className="text-[0.7rem] text-slate-500">
                  Score crediticio (0–100)
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-[#0f2f4b]">
                  {isNaN(score) ? '—' : score.toFixed(1)}
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: isNaN(score) ? '0%' : `${clamp(score, 0, 100)}%`,
                      background: scoreBarColor,
                    }}
                  />
                </div>
                <div
                  className={`inline-flex items-center mt-1 px-2 py-1 rounded-full text-[0.7rem] font-semibold ${bandBadgeClasses}`}
                >
                  {band.k}
                </div>
              </div>

              {/* Gráfico PD */}
              <div className="h-40 md:h-48">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                  <Recharts.BarChart data={hasCalculated ? chartData : []}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} />
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

              {/* Tabla de horizontes */}
              <div className="mt-2">
                <table className="w-full text-[0.7rem] md:text-xs border-separate border-spacing-y-1">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="text-left px-2 py-1">Horizonte</th>
                      <th className="text-left px-2 py-1">PD puntual</th>
                      <th className="text-left px-2 py-1">Rango orientativo</th>
                      <th className="text-left px-2 py-1">Sensibilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdRows.map((r) => {
                      const bandRanges = band.ranges
                        ? r.label.startsWith('Corto')
                          ? band.ranges.short
                          : r.label.startsWith('Mediano')
                          ? band.ranges.mid
                          : band.ranges.long
                        : '—';
                      const sens =
                        score >= 50
                          ? '-1 pt en score ≈ -0.4% PD (corto)'
                          : '-1 pt ≈ -0.7% PD (corto)';
                      return (
                        <tr
                          key={r.label}
                          className="bg-slate-50 rounded-xl shadow-sm"
                        >
                          <td className="px-2 py-1 rounded-l-xl">{r.label}</td>
                          <td className="px-2 py-1">
                            <strong>
                              {isNaN(r.value) ? '—' : `${r.value.toFixed(1)}%`}
                            </strong>
                          </td>
                          <td className="px-2 py-1">{bandRanges}</td>
                          <td className="px-2 py-1 rounded-r-xl text-slate-500">
                            {sens}
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
                  Este modelo heurístico transforma cada ratio en un{' '}
                  <em>sub-score</em> (0–100), los pondera por pesos configurables y
                  obtiene un <strong>score</strong> total (0–100). Luego lo mapea a
                  probabilidades de default (PD) por horizonte usando una función
                  logística suavizada y bandas según el nivel de riesgo.
                </p>
                <pre className="mt-2 rounded-xl bg-slate-900 text-slate-50 text-[0.65rem] p-3 overflow-auto">
{`// Ejemplos de normalización
// Liquidez (x): 0–1.5 → 0–70, 1.5–2.5 → 70–90, >2.5 → 90–100
// ND/EBITDA (x): ≤0 → 100; 0–2 → 100–85; 2–4 → 85–60; 4–6 → 60–35; >6 → 15–35
// Altman Z: <1.8 → 20–35; 1.8–3 → 35–75; >3 → 75–98

// Map a PD (punto):
// pd1y = L(sigmoid((score-60)/7)) con piso 0.3% y techo 40%
// pd3y, pd5y escalan desde pd1y con factores crecientes.

// Bandas por score:
// ≥80: corto 0.5–1.5%, med 2–5%, largo 5–12%
// 65–79: corto 1.5–3.5%, med 5–12%, largo 12–25%
// 50–64: corto 3.5–8%,  med 12–25%, largo 25–45%
// 35–49: corto 8–15%,   med 25–45%, largo 45–70%
// <35:  corto 15–35%,   med 45–70%, largo 70–90%+`}
                </pre>
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  ⚠️ Uso educativo/estimativo. No reemplaza un rating formal ni un
                  análisis integral (covenants, liquidez de mercado, vencimientos,
                  garantías, sector, país, etc.).
                </p>
              </details>
            </div>
          </div>
        </div>

        {/* 3) Desglose sub-scores */}
        <div className="mt-6 border border-slate-100 rounded-2xl bg-slate-50/60 px-4 py-4 md:px-5 md:py-5">
          <h2 className="text-sm md:text-base font-bold text-[#0f2f4b] mb-3">
            3) Desglose de sub-scores
          </h2>
          <div className="space-y-3">
            {fieldOrder.map((id) => {
              const label = fieldsConfig[id].label;
              const s = subs[id];
              const wKey = weightKeyByField[id];
              const weight = weights[wKey] || 0;
              const barWidth = s == null ? 0 : s;
              const barColor =
                s == null
                  ? '#e5e7eb'
                  : s >= 70
                  ? '#A7F3D0'
                  : s >= 50
                  ? '#FDE68A'
                  : '#FCA5A5';
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 text-[0.7rem] md:text-xs"
                >
                  <div className="min-w-[160px]">
                    <div className="font-semibold text-slate-800">{label}</div>
                    <div className="text-[0.65rem] text-slate-500">
                      sub-score: {s == null ? '—' : s.toFixed(1)}
                    </div>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${barWidth}%`, background: barColor }}
                    />
                  </div>
                  <div className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[0.65rem] font-semibold text-slate-700">
                    w={weight}
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
