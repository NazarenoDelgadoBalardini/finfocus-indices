import React, { useState, useEffect } from 'react';

const styles = `
  :root{ --azul:#0f2f4b; --gris:#F3F4F6; --borde:#e5e7eb; }
  html, body, * { font-family:'Montserrat',sans-serif !important; box-sizing:border-box; }
  body{ background:#FFF; margin:0; padding:16px; color:#333; }
  .wrap{ max-width:1100px; margin:0 auto; }
  h1{ margin:0 0 12px; color:var(--azul); font-size:1.25rem; font-weight:700; text-align:center; }
  .card{ background:#fff; border-radius:16px; box-shadow:0 6px 20px rgba(15,47,75,.08); padding:16px; margin-bottom:16px; }
  .grid{ display:grid; grid-template-columns: repeat(12, 1fr); gap:12px; }
  label{ display:block; font-weight:600; color:#111; font-size:.9rem; margin-bottom:6px; }
  input, select{ width:100%; padding:10px 12px; border:1px solid #d1d5db; border-radius:10px; font-size:.9rem; }
  .hint{ font-size:.8rem; color:#555; margin-top:4px; }
  .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; border-radius:10px; background:var(--azul); color:#fff; font-weight:700; border:none; cursor:pointer; transition: transform .15s ease, box-shadow .2s ease, background-color .2s ease; box-shadow: 0 4px 14px rgba(15,47,75,.18); }
  .btn:hover{ transform:translateY(-1px); box-shadow:0 8px 22px rgba(15,47,75,.25); background:#006bb3; }
  .btn:active{ transform:translateY(0); box-shadow:0 4px 12px rgba(15,47,75,.18); background:#005a94; }
  .btn.alt{ background:#6b7280; }
  .btn.alt:hover{ background:#4b5563; }
  table{ width:100%; border-collapse:collapse; font-size:.85rem; }
  th, td{ border:1px solid var(--borde); padding:8px; text-align:center; }
  th{ background:var(--azul); color:#fff; position:sticky; top:0; z-index:1; }
  tbody tr:nth-child(odd){ background:#fafafa; }
  .right{ text-align:right; }
  .flex{ display:flex; gap:8px; flex-wrap:wrap; }
  .pill{ font-size:.75rem; padding:4px 8px; background:#eef2f7; border-radius:999px; }
  .res{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
  .metric{ background:#fff; border:1px solid var(--borde); border-radius:12px; padding:12px; }
  .metric h3{ margin:0 0 6px; font-size:.85rem; color:#111; }
  .metric p{ margin:0; font-size:1rem; font-weight:700; color:var(--azul); }
  .foot{ color:#555; font-size:.8rem; }
  .danger{ color:#b91c1c; font-weight:600; }
  .ok{ color:#065f46; font-weight:600; }
  @media (max-width: 760px){ .grid{ grid-template-columns: repeat(6,1fr); } .res{ grid-template-columns: 1fr; } }
  .badge{ display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:.75rem; }
  .green{ background:#d1fae5; color:#065f46; }
  .yellow{ background:#fef9c3; color:#92400e; }
  .red{ background:#fee2e2; color:#991b1b; }
  .gainPos{ background:#e8f5e9; }
  .gainMid{ background:#fff7e6; }
  .gainNeg{ background:#fdecea; }
`;

function toDate(v) {
  return new Date(v + 'T00:00:00');
}

function days360(d1, d2) {
  const D1 = new Date(d1), D2 = new Date(d2);
  const d1d = Math.min(30, D1.getDate());
  const d2d = (D1.getDate() === 31 && D2.getDate() === 31) ? 30 : Math.min(30, D2.getDate());
  const months = (D2.getFullYear() - D1.getFullYear()) * 12 + (D2.getMonth() - D1.getMonth());
  return months * 30 + (d2d - d1d);
}

function yearFrac(d0, d1, basis) {
  if (basis === '30360') return days360(d0, d1) / 360;
  const t0 = toDate(d0).getTime(), t1 = toDate(d1).getTime();
  const days = (t1 - t0) / 86400000;
  return basis === 'act360' ? days / 360 : days / 365;
}

function readNumber(val) {
  if (typeof val === 'number') return val;
  if (val == null) return NaN;
  const s = String(val).trim().replace(',', '.');
  const x = Number(s);
  return Number.isFinite(x) ? x : NaN;
}

const priceToCash = (price, mode, vn) =>
  mode === 'pct' ? (price / 100) * vn : price;

const fmtPctEA = x =>
  Number.isFinite(x)
    ? (x * 100).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + '%'
    : '–';

const fmtCur = x =>
  Number.isFinite(x)
    ? x.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    : '–';

const toNominal = (rEA, m) => m * (Math.pow(1 + rEA, 1 / m) - 1);

function npvFromFlows(rEA, settle, flows, basis) {
  let pv = 0;
  for (const fl of flows) {
    const yf = yearFrac(settle, fl.date, basis);
    pv += fl.amount / Math.pow(1 + rEA, yf);
  }
  return pv;
}

function dNPV(rEA, settle, flows, basis) {
  let d = 0;
  for (const fl of flows) {
    const yf = yearFrac(settle, fl.date, basis);
    d += -yf * fl.amount / Math.pow(1 + rEA, yf + 1);
  }
  return d;
}

function solveIRR(targetPV, settle, flows, basis) {
  if (flows.length === 0) return NaN;
  let r = 0.2;
  for (let k = 0; k < 30; k++) {
    const f = npvFromFlows(r, settle, flows, basis) - targetPV;
    const df = dNPV(r, settle, flows, basis);
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const step = f / df;
    r = r - step;
    if (r <= -0.95) r = -0.95;
    if (Math.abs(step) < 1e-12) return r;
  }
  let low = -0.9, high = 5.0;
  let fLow = npvFromFlows(low, settle, flows, basis) - targetPV;
  let fHigh = npvFromFlows(high, settle, flows, basis) - targetPV;
  if (fLow * fHigh > 0) return r;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    const fMid = npvFromFlows(mid, settle, flows, basis) - targetPV;
    if (Math.abs(fMid) < 1e-12) return mid;
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

function addMonths(dateStr, n) {
  const dt = toDate(dateStr);
  dt.setMonth(dt.getMonth() + n);
  return dt.toISOString().split('T')[0];
}

function colorClass(pct) {
  if (pct >= 10) return 'gainPos';
  if (pct >= 2) return 'gainMid';
  if (pct > -2) return '';
  return 'gainNeg';
}

export default function FairValueFija() {
  const [vn, setVn] = useState('100');
  const [cupon, setCupon] = useState('');
  const [freq, setFreq] = useState('2');
  const [venc, setVenc] = useState('');
  const [settle, setSettle] = useState('');
  const [basis, setBasis] = useState('act365');
  const [price, setPrice] = useState('');
  const [priceMode, setPriceMode] = useState('pct');
  const [ytmEA, setYtmEA] = useState('');
  const [targetEA, setTargetEA] = useState('');
  const [simFrom, setSimFrom] = useState('');
  const [simTo, setSimTo] = useState('');
  const [simStep, setSimStep] = useState('');
  const [flows, setFlows] = useState([]);
  const [tirEARes, setTirEARes] = useState(null);
  const [tirNARes, setTirNARes] = useState(null);
  const [npvOrPriceRes, setNpvOrPriceRes] = useState('–');
  const [msgNode, setMsgNode] = useState(null);
  const [simRows, setSimRows] = useState([]);
  const [simVisible, setSimVisible] = useState(false);

  // Demo inicial mínima
  useEffect(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setSettle(todayStr);

    const d1 = todayStr;
    const d2 = `${y}-${m}-${String(parseInt(d, 10) + 30).padStart(2, '0')}`;
    const d3 = `${y}-${m}-${String(parseInt(d, 10) + 60).padStart(2, '0')}`;

    setFlows([
      { id: 1, date: d1, amount: '5' },
      { id: 2, date: d2, amount: '5' },
      { id: 3, date: d3, amount: '105' },
    ]);
  }, []);

  function parseFlowsForSettle(settleDate) {
    const list = [];
    let ignored = 0;
    for (const fl of flows) {
      const fecha = fl.date;
      const monto = readNumber(fl.amount);
      if (!fecha || !Number.isFinite(monto)) {
        ignored++;
        continue;
      }
      if (toDate(fecha) >= toDate(settleDate)) {
        list.push({ date: fecha, amount: monto });
      } else {
        ignored++;
      }
    }
    list.sort((a, b) => toDate(a.date) - toDate(b.date));
    return { flows: list, ignored };
  }

  const handleAddRow = () => {
    setFlows(prev => [
      ...prev,
      { id: Date.now() + Math.random(), date: '', amount: '' },
    ]);
  };

  const handleRemoveRow = id => {
    setFlows(prev => prev.filter(f => f.id !== id));
  };

  const handleFlowChange = (id, field, value) => {
    setFlows(prev =>
      prev.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleAutogen = () => {
    const vnNum = readNumber(vn) || 0;
    const cup = (readNumber(cupon) || 0) / 100;
    const freqNum = parseInt(freq || '2', 10) || 2;
    const vencStr = venc;
    if (!vencStr || !vnNum || !cup) {
      setMsgNode(
        <span className="danger">Completá VN, cupón y vencimiento.</span>
      );
      return;
    }
    const settleStr =
      settle || new Date().toISOString().split('T')[0];
    const perMonths = 12 / freqNum;
    const fechas = [];
    let f = vencStr;
    while (toDate(f) >= toDate(settleStr)) {
      fechas.push(f);
      f = addMonths(f, -perMonths);
    }
    if (fechas.length === 0) fechas.push(vencStr);
    fechas.sort((a, b) => toDate(a) - toDate(b));
    const newFlows = [];
    for (let i = 0; i < fechas.length; i++) {
      const cuponPago = (vnNum * cup) / freqNum;
      let monto = cuponPago;
      if (i === fechas.length - 1) monto = cuponPago + vnNum;
      newFlows.push({
        id: i + 1,
        date: fechas[i],
        amount: Number(monto.toFixed(6)).toString(),
      });
    }
    setFlows(newFlows);
    setMsgNode(null);
  };

  // 1) Calcular TIR desde precio de mercado
  const handleCalcYTM = () => {
    setMsgNode(null);
    const settleStr = settle;
    const priceNum = readNumber(price);
    const mode = priceMode;
    const vnNum = readNumber(vn) || 0;
    const basisStr = basis;
    const freqNum = parseInt(freq || '2', 10) || 2;

    if (!settleStr || !Number.isFinite(priceNum)) {
      setMsgNode(
        <span className="danger">
          Completá liquidación y precio válido.
        </span>
      );
      return;
    }
    const { flows: validFlows, ignored } = parseFlowsForSettle(settleStr);
    if (ignored) {
      setMsgNode(
        <>
          <span className="yellow badge">Ojo</span>{' '}
          {ignored} flujo(s) ignorado(s) por estar vacíos o ≤
          liquidación.
        </>
      );
    }
    if (validFlows.length === 0) {
      setMsgNode(
        <span className="danger">
          Agregá al menos un flujo posterior a la liquidación.
        </span>
      );
      return;
    }
    const targetPV = priceToCash(priceNum, mode, vnNum);
    const rEA = solveIRR(targetPV, settleStr, validFlows, basisStr);
    const npvAt = npvFromFlows(rEA, settleStr, validFlows, basisStr);

    setTirEARes(rEA);
    setTirNARes(toNominal(rEA, freqNum));
    setNpvOrPriceRes(fmtCur(npvAt));

    if (!Number.isFinite(rEA)) {
      setMsgNode(
        <span className="danger">
          No se pudo converger. Revisá flujos, fechas, precio y base.
        </span>
      );
    }
  };

  // 2) Precio desde TIR
  const handleCalcPriceFromYTM = () => {
    setMsgNode(null);
    const settleStr = settle;
    const basisStr = basis;
    const vnNum = readNumber(vn) || 0;
    const rPct = readNumber(ytmEA);
    if (!settleStr || !Number.isFinite(rPct)) {
      setMsgNode(
        <span className="danger">
          Ingresá liquidación y TIR (EA) válida.
        </span>
      );
      return;
    }
    const rEA = rPct / 100;
    const { flows: validFlows, ignored } = parseFlowsForSettle(settleStr);
    if (ignored) {
      setMsgNode(
        <>
          <span className="yellow badge">Ojo</span>{' '}
          {ignored} flujo(s) ignorado(s) por estar vacíos o ≤
          liquidación.
        </>
      );
    }
    if (validFlows.length === 0) {
      setMsgNode(
        <span className="danger">
          Agregá al menos un flujo posterior a la liquidación.
        </span>
      );
      return;
    }
    const fair = npvFromFlows(rEA, settleStr, validFlows, basisStr);
    setTirEARes(rEA);
    setTirNARes(null);

    const mkt = readNumber(price);
    const mode = priceMode;
    let extra = '';
    if (Number.isFinite(mkt)) {
      const mktAbs = priceToCash(mkt, mode, vnNum);
      const diff$ = fair - mktAbs;
      const diffPct = (fair / mktAbs - 1) * 100;
      extra = ` | Mercado: ${fmtCur(mktAbs)} | Δ: ${fmtCur(
        diff$
      )} (${diffPct.toFixed(2)}%)`;
    }
    const baseText = `${fmtCur(fair)}  (${(
      (fair / vnNum) *
      100
    ).toFixed(2)}% del VN)${extra}`;
    setNpvOrPriceRes(baseText);
    setMsgNode(
      <span className="ok">
        Precio teórico calculado desde TIR efectiva anual.
      </span>
    );
  };

  // 3) TIR objetivo (fair value)
  const handleCalcTarget = () => {
    setMsgNode(null);
    const settleStr = settle;
    const basisStr = basis;
    const vnNum = readNumber(vn) || 0;
    const rPct = readNumber(targetEA);
    const mkt = readNumber(price);
    const mode = priceMode;

    if (!settleStr || !Number.isFinite(rPct)) {
      setMsgNode(
        <span className="danger">
          Ingresá liquidación y TIR objetivo (EA) válida.
        </span>
      );
      return;
    }
    if (!Number.isFinite(mkt)) {
      setMsgNode(
        <span className="danger">
          Ingresá precio de mercado para comparar.
        </span>
      );
      return;
    }
    const rEA = rPct / 100;
    const { flows: validFlows, ignored } = parseFlowsForSettle(settleStr);
    if (ignored) {
      setMsgNode(
        <>
          <span className="yellow badge">Ojo</span>{' '}
          {ignored} flujo(s) ignorado(s) por estar vacíos o ≤
          liquidación.
        </>
      );
    }
    if (validFlows.length === 0) {
      setMsgNode(
        <span className="danger">
          Agregá al menos un flujo posterior a la liquidación.
        </span>
      );
      return;
    }
    const fair = npvFromFlows(rEA, settleStr, validFlows, basisStr);
    const mktAbs = priceToCash(mkt, mode, vnNum);
    const diff$ = fair - mktAbs;
    const diffPct = (fair / mktAbs - 1) * 100;

    setTirEARes(rEA);
    setTirNARes(null);
    setNpvOrPriceRes(
      `Fair: ${fmtCur(fair)} | Mercado: ${fmtCur(
        mktAbs
      )} | Δ: ${fmtCur(diff$)} (${diffPct.toFixed(2)}%)`
    );

    let badgeClass = 'yellow';
    let badgeText = 'Valor justo';
    if (fair > mktAbs * 1.02) {
      badgeClass = 'green';
      badgeText = 'Subvaluado';
    } else if (fair < mktAbs * 0.98) {
      badgeClass = 'red';
      badgeText = 'Sobrevaluado';
    }
    setMsgNode(
      <>
        <span className={`badge ${badgeClass}`}>{badgeText}</span> · Fair
        value a TIR objetivo.
      </>
    );
  };

  // 4) Simulación de rango de TIRes
  const handleSimular = () => {
    const settleStr = settle;
    const basisStr = basis;
    const vnNum = readNumber(vn) || 0;
    const mkt = readNumber(price);
    const mode = priceMode;

    if (!settleStr) {
      setMsgNode(
        <span className="danger">Ingresá fecha de liquidación.</span>
      );
      return;
    }
    if (!Number.isFinite(mkt)) {
      setMsgNode(
        <span className="danger">
          Ingresá precio de mercado para simular.
        </span>
      );
      return;
    }
    const { flows: validFlows, ignored } = parseFlowsForSettle(settleStr);
    if (ignored) {
      setMsgNode(
        <>
          <span className="yellow badge">Ojo</span>{' '}
          {ignored} flujo(s) ignorado(s) por estar vacíos o ≤
          liquidación.
        </>
      );
    }
    if (validFlows.length === 0) {
      setMsgNode(
        <span className="danger">
          Agregá al menos un flujo posterior a la liquidación.
        </span>
      );
      return;
    }

    let from = readNumber(simFrom);
    let to = readNumber(simTo);
    let step = readNumber(simStep);
    const center = readNumber(targetEA) || 10;

    if (!Number.isFinite(from)) from = center - 5;
    if (!Number.isFinite(to)) to = center + 5;
    if (!Number.isFinite(step) || step <= 0) step = 1;

    if (to < from) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const maxRows = 2000;
    const nRows = Math.floor((to - from) / step) + 1;
    if (nRows > maxRows) {
      setMsgNode(
        <span className="danger">
          Rango demasiado fino: {nRows} filas. Subí el "Paso (%)" o
          acotá el rango.
        </span>
      );
      return;
    }

    const mktAbs = priceToCash(mkt, mode, vnNum);
    const rows = [];
    for (let y = from; y <= to + 1e-9; y += step) {
      const rEA = y / 100;
      const fair = npvFromFlows(rEA, settleStr, validFlows, basisStr);
      const d$ = fair - mktAbs;
      const dPct = (fair / mktAbs - 1) * 100;
      rows.push({
        y: y,
        fair,
        dAbs: d$,
        dPct,
      });
    }
    setSimRows(rows);
    setSimVisible(true);
    setMsgNode(null);
  };

  const handleLimpiar = () => {
    setFlows([]);
    setTirEARes(null);
    setTirNARes(null);
    setNpvOrPriceRes('–');
    setMsgNode(null);
    setSimRows([]);
    setSimVisible(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="wrap">
        <h1></h1>

        {/* Parámetros + autogeneración */}
        <div className="card">
          <div className="grid">
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="vn">Valor Nominal (VN)</label>
              <input
                id="vn"
                type="number"
                step="0.01"
                value={vn}
                onChange={e => setVn(e.target.value)}
              />
              <div className="hint">
                Usado para % del VN y autogenerar cupones
              </div>
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="cupon">Cupón anual (%)</label>
              <input
                id="cupon"
                type="number"
                step="0.01"
                placeholder="Ej: 12"
                value={cupon}
                onChange={e => setCupon(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="freq">Frecuencia de cupón</label>
              <select
                id="freq"
                value={freq}
                onChange={e => setFreq(e.target.value)}
              >
                <option value="1">Anual (1)</option>
                <option value="2">Semestral (2)</option>
                <option value="4">Trimestral (4)</option>
                <option value="12">Mensual (12)</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="venc">Fecha de vencimiento</label>
              <input
                id="venc"
                type="date"
                value={venc}
                onChange={e => setVenc(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="settle">Fecha de liquidación</label>
              <input
                id="settle"
                type="date"
                value={settle}
                onChange={e => setSettle(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="basis">Base de cálculo</label>
              <select
                id="basis"
                value={basis}
                onChange={e => setBasis(e.target.value)}
              >
                <option value="act365">Actual/365</option>
                <option value="act360">Actual/360</option>
                <option value="30360">30/360 (US)</option>
              </select>
            </div>

            {/* Precio mercado */}
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="price">Precio de mercado</label>
              <input
                id="price"
                type="number"
                step="0.0001"
                placeholder="Ej: 92.50"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="priceMode">Modo de precio</label>
              <select
                id="priceMode"
                value={priceMode}
                onChange={e => setPriceMode(e.target.value)}
              >
                <option value="pct">% del VN (clean)</option>
                <option value="abs">Precio absoluto</option>
              </select>
            </div>

            {/* Entradas de TIR (en % ENTEROS) */}
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="ytmEA">
                TIR (EA) para “Precio desde TIR” (%)
              </label>
              <input
                id="ytmEA"
                type="number"
                step="0.01"
                placeholder="Ej: 10"
                value={ytmEA}
                onChange={e => setYtmEA(e.target.value)}
              />
              <div className="hint">Ingresá 10 para 10%</div>
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="targetEA">TIR objetivo (EA) (%)</label>
              <input
                id="targetEA"
                type="number"
                step="0.01"
                placeholder="Ej: 9"
                value={targetEA}
                onChange={e => setTargetEA(e.target.value)}
              />
              <div className="hint">Ingresá 9 para 9%</div>
            </div>

            {/* Rango de simulación */}
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="simFrom">Simulación: Desde TIR (%)</label>
              <input
                id="simFrom"
                type="number"
                step="0.1"
                placeholder="6"
                value={simFrom}
                onChange={e => setSimFrom(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="simTo">Simulación: Hasta TIR (%)</label>
              <input
                id="simTo"
                type="number"
                step="0.1"
                placeholder="20"
                value={simTo}
                onChange={e => setSimTo(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 3', minWidth: 180 }}>
              <label htmlFor="simStep">Paso (%)</label>
              <input
                id="simStep"
                type="number"
                step="0.1"
                placeholder="1"
                value={simStep}
                onChange={e => setSimStep(e.target.value)}
              />
            </div>
          </div>

          <div className="flex" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={handleAutogen}>
              Autogenerar cupones
            </button>
            <button className="btn alt" type="button" onClick={handleAddRow}>
              Agregar flujo
            </button>
            <span className="pill">
              Cargá flujos manualmente o autogenerá por cupón
            </span>
          </div>
        </div>

        {/* Tabla de flujos */}
        <div className="card">
          <table id="tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Monto del flujo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tbody">
              {flows.map((fl, index) => (
                <tr key={fl.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="date"
                      value={fl.date}
                      onChange={e =>
                        handleFlowChange(fl.id, 'date', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.0001"
                      value={fl.amount}
                      onChange={e =>
                        handleFlowChange(fl.id, 'amount', e.target.value)
                      }
                      className="right"
                    />
                  </td>
                  <td>
                    <button
                      className="btn alt btn-sm"
                      type="button"
                      onClick={() => handleRemoveRow(fl.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="foot" style={{ marginTop: 8 }}>
            Los flujos previos a la liquidación se ignoran para el
            descuento.
          </div>
        </div>

        {/* Acciones y resultados */}
        <div className="card">
          <div
            className="flex"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div className="flex" style={{ gap: 12 }}>
              <button
                className="btn"
                type="button"
                onClick={handleCalcYTM}
              >
                Calcular TIR
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleCalcPriceFromYTM}
              >
                Precio desde TIR
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleCalcTarget}
              >
                TIR objetivo (Fair Value)
              </button>
              <button
                className="btn alt"
                type="button"
                onClick={handleSimular}
              >
                Simular rango de TIRes
              </button>
              <button
                className="btn alt"
                type="button"
                onClick={handleLimpiar}
              >
                Limpiar
              </button>
            </div>
            <div className="foot">
              TIR = tasa efectiva anual que iguala VP de flujos al precio.
            </div>
          </div>

          <div className="res" style={{ marginTop: 12 }}>
            <div className="metric">
              <h3>TIR efectiva anual</h3>
              <p id="tirEA">
                {tirEARes == null ? '–' : fmtPctEA(tirEARes)}
              </p>
            </div>
            <div className="metric">
              <h3>TIR nominal (según frecuencia)</h3>
              <p id="tirNA">
                {tirNARes == null ? '–' : fmtPctEA(tirNARes)}
              </p>
            </div>
            <div className="metric">
              <h3>NPV / Precio teórico</h3>
              <p id="npvOrPrice">{npvOrPriceRes}</p>
            </div>
          </div>
          <div className="foot" id="msg" style={{ marginTop: 8 }}>
            {msgNode}
          </div>
        </div>

        {/* Tabla de simulación */}
        {simVisible && (
          <div className="card" id="simCard">
            <h3 style={{ margin: '0 0 8px', color: '#0f2f4b' }}>
              Simulación de ganancia vs precio de mercado
            </h3>
            <div className="foot" style={{ marginBottom: 8 }}>
              La TIR se ingresa en % enteros (p. ej., 12 = 12%).
            </div>
            <table id="tblSim">
              <thead>
                <tr>
                  <th>TIR objetivo (EA)</th>
                  <th>Precio fair</th>
                  <th>Δ $ vs mercado</th>
                  <th>Δ % vs mercado</th>
                </tr>
              </thead>
              <tbody id="simBody">
                {simRows.map(row => (
                  <tr
                    key={row.y.toFixed(4)}
                    className={colorClass(row.dPct)}
                  >
                    <td>{row.y.toFixed(2)}%</td>
                    <td>{fmtCur(row.fair)}</td>
                    <td className="right">{fmtCur(row.dAbs)}</td>
                    <td className="right">
                      {row.dPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
