// src/components/BonosArgLetras.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FinancialData } from "@/entities/FinancialData";

// Cashflows por ticker (ej: TO26 con reinversión)
const CFS_BY_TICKER = {
  TO26: [
    ["2025-10-17", 7.75],
    ["2026-04-17", 7.75],
    ["2026-10-19", 107.75],
  ],
};

/* ===================== Helpers ===================== */

const normalizeHeaderName = (s) =>
  s?.toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const findCol = (headers, target) => {
  const t = normalizeHeaderName(target);
  let idx = headers.findIndex(
    (h) => normalizeHeaderName(h) === t
  );
  if (idx !== -1) return idx;
  return headers.findIndex((h) =>
    normalizeHeaderName(h).includes(t)
  );
};

function toNumberAR(s) {
  if (s == null) return NaN;
  return Number(String(s).replace(/\./g, "").replace(",", "."));
}

function yearFracACT365(d0, d1) {
  return (d1 - d0) / (1000 * 60 * 60 * 24 * 365);
}

function ytmAct365(price, hoy, cfs, guess = 0.3) {
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
  return y; // TEA
}

function teaToTnaSimple(tea) {
  const rDay = Math.pow(1 + tea, 1 / 365) - 1;
  return 365 * rDay;
}

function fvReinvertidoACT365(hoy, cfs, tea) {
  const maturity = new Date(cfs[cfs.length - 1][0]);
  let fv = 0;
  for (const [dateStr, amt] of cfs) {
    const d = new Date(dateStr);
    if (d <= hoy) continue;
    const t = yearFracACT365(d, maturity);
    fv += amt * Math.pow(1 + tea, t);
  }
  return fv;
}

function parseDMYParts(dmy) {
  const [dd, mm, yy] = String(dmy)
    .replaceAll("-", "/")
    .split("/")
    .map(Number);
  return { d: dd, m: mm, y: yy };
}

function formatDMY(dt) {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
}


async function fetchRowsFromFinancialData() {
  const records = await FinancialData.filter(
    { category: "letras_y_bonos_del_tesoro", isActive: true },
    "-lastSync",
    1
  );

  if (!records?.length) return [];

  const fd = records[0];
  const headers = fd.headers || [];
  const rows = fd.data || [];

  const idxTipo = findCol(headers, "Tipo");
  const idxTicker = findCol(headers, "Ticker");
  const idxVto = findCol(headers, "Vto");
  const idxPago = findCol(headers, "Pago");

  const hoy = new Date();

  const mapped = rows
    .map((row) => {
      const tipo = row[idxTipo] ?? "";
      const ticker = row[idxTicker] ?? "";
      const vto = row[idxVto] ?? "";
      const pago = row[idxPago] ?? "";

      if (!ticker) return null;

      return {
        tipo: String(tipo).trim(),
        ticker: String(ticker).trim(),
        vto: String(vto).trim(),        // dd/mm/yyyy
        pago: toNumberAR(pago),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const [da, ma, ya] = a.vto.split("/").map(Number);
      const [db, mb, yb] = b.vto.split("/").map(Number);
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });

  // Filtrar futuros + deduplicar + ajustar cashflows igual que antes
  const future = mapped.filter((r) => {
    const [d, m, y] = r.vto.split("/").map(Number);
    return new Date(y, m - 1, d) > hoy;
  });

  const seen = new Set();
  const deduped = [];

  for (const r of future) {
    if (seen.has(r.ticker)) continue;
    seen.add(r.ticker);

    if (CFS_BY_TICKER[r.ticker]) {
      const cfs = CFS_BY_TICKER[r.ticker];
      const last = new Date(cfs[cfs.length - 1][0]);
      r.vto = formatDMY(last);
    }

    deduped.push(r);
  }

  return deduped;
}

/* ===================== Componente React ===================== */

export default function BonosArgLetras() {
  const [priceMode, setPriceMode] = useState("ask"); // 'ask' | 'last'
  const [rows, setRows] = useState([]);
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);

  const nfARS = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const nfPerc = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
const baseRows = await fetchRowsFromFinancialData();
setRows(baseRows);
        // Cotizaciones
        try {
          const [resNotas, resBonos] = await Promise.all([
            fetch("https://data912.com/live/arg_notes", { mode: "cors" }),
            fetch("https://data912.com/live/arg_bonds", { mode: "cors" }),
          ]);
          const dataNotas = await resNotas.json();
          const dataBonos = await resBonos.json();
          setApiData([...dataNotas, ...dataBonos]);
        } catch (e) {
          console.warn("No se pudieron cargar cotizaciones:", e);
          setApiData([]);
        }
      } catch (e) {
        console.warn("No se pudo leer Google Sheets:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const derivedRows = useMemo(() => {
    if (!rows.length) return [];
    const hoy = new Date();

    return rows
      .map((row) => {
        const { tipo, ticker } = row;
        let vtoStr = row.vto;
        const pagoBase = parseFloat(row.pago);

        const info = apiData.find((b) => b.symbol === ticker);
        let precio = NaN;

        if (info) {
          const ask = parseFloat(info.px_ask);
          const last = parseFloat(info.c);
          const primary = priceMode === "ask" ? ask : last;
          const secondary = priceMode === "ask" ? last : ask;
          if (Number.isFinite(primary) && primary > 0) precio = primary;
          else if (Number.isFinite(secondary) && secondary > 0) precio = secondary;
        }

        if (!isFinite(precio) || precio <= 0) return null;

        const cfData = CFS_BY_TICKER[ticker];

        // si hay cashflows, usar última fecha para vto de cálculo
        if (cfData && cfData.length) {
          const lastDate = new Date(cfData[cfData.length - 1][0]);
          vtoStr = formatDMY(lastDate);
        }

        const { d, m, y } = parseDMYParts(vtoStr);
        const vtoDate = new Date(y, m - 1, d);
        const dias = Math.ceil((vtoDate - hoy) / (1000 * 60 * 60 * 24));
        if (!(dias > 0)) return null;

        let tna = NaN;
        let tea = NaN;
        let tem = NaN;

        if (isFinite(precio) && dias > 0) {
          if (cfData && cfData.length) {
            tea = ytmAct365(precio, hoy, cfData, 0.3);
            tna = teaToTnaSimple(tea) * 100;
            tem = Math.pow(1 + tea, 1 / 12) - 1;
          } else if (isFinite(pagoBase)) {
            const tnaDec = (pagoBase / precio - 1) * (365 / dias);
            tna = tnaDec * 100;
            tea = Math.pow(1 + tnaDec / 365, 365) - 1;
            tem = Math.pow(1 + tea, 1 / 12) - 1;
          }
        }

        let pagoFinalMostrar = isFinite(pagoBase) ? pagoBase : NaN;
        if (cfData && cfData.length && isFinite(precio)) {
          pagoFinalMostrar = isFinite(tea)
            ? fvReinvertidoACT365(hoy, cfData, tea)
            : cfData
                .filter(([ds]) => new Date(ds) > hoy)
                .reduce((acc, [, amt]) => acc + amt, 0);
        }

        let bexMens = NaN;
        let bexAnual = NaN;
        if (isFinite(precio) && precio > 0 && isFinite(pagoFinalMostrar) && dias > 0) {
          const G = pagoFinalMostrar / precio;
          bexMens = Math.pow(G, 30 / dias) - 1;
          bexAnual = Math.pow(1 + bexMens, 12) - 1;
        }

        return {
          tipo,
          ticker,
          vto: vtoStr,
          dias,
          pagoFinal: isFinite(pagoFinalMostrar) ? pagoFinalMostrar : null,
          precio,
          tna,
          tem,
          tea,
          bexMens,
          bexAnual,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const { d: da, m: ma, y: ya } = parseDMYParts(a.vto);
        const { d: db, m: mb, y: yb } = parseDMYParts(b.vto);
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
      });
  }, [rows, apiData, priceMode]);

  const precioHeader =
    priceMode === "ask" ? "Precio (ask)" : "Precio (último)";

  return (
    <div style={{ fontFamily: "Montserrat, sans-serif", background: "#FFF" }}>
      {/* Estilos del toggle FINFOCUS (puedes moverlos a tu CSS global) */}
<style>{`
  :root{ --azul:#0f2f4b; --cel:#5EA6D7; --borde:#e5e7eb; }

  /* 🟦 HERO FINFOCUS */
  .ff-hero{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    max-width:980px;
    margin:0 auto 16px auto;
    padding:16px 20px;
    border-radius:24px;
    position:relative;
    overflow:hidden;
    color:#f9fafb;
    background:
      radial-gradient(circle at 0% 0%, rgba(255,255,255,0.16), transparent 60%),
      linear-gradient(90deg,#0f2f4b,#173d5f,#0f2f4b);
    box-shadow:0 18px 40px rgba(15,47,75,0.55);
  }

  .ff-hero::after{
    content:'';
    position:absolute;
    right:-40px;
    bottom:-40px;
    width:160px;
    height:160px;
    border-radius:999px;
    background:radial-gradient(circle,rgba(148,163,184,0.35),transparent 65%);
    opacity:0.7;
    pointer-events:none;
  }

  .ff-left{
    display:flex;
    flex-direction:column;
    gap:6px;
    position:relative;
    z-index:1;
  }

  .ff-title{
    margin:0;
    font-weight:700;
    font-size:1.05rem;
    letter-spacing:0.01em;
    color:#ffffff;
  }

  .ff-sub{
    margin:0;
    font-size:.80rem;
    color:rgba(226,232,240,0.9);
  }

  .ff-mode-badge{
    display:inline-flex;
    align-items:center;
    gap:6px;
    font-size:.72rem;
    color:#e5e7eb;
    background:rgba(15,23,42,0.35);
    padding:4px 10px;
    border-radius:999px;
    border:1px solid rgba(148,163,184,0.5);
    margin-top:4px;
  }

  .ff-dot{
    width:7px;
    height:7px;
    border-radius:999px;
    background:#22c55e;
    box-shadow:0 0 0 4px rgba(34,197,94,0.25);
  }

  .ff-right{
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:4px;
    position:relative;
    z-index:1;
  }

  .ff-toggle{
    position:relative;
    width:78px;
    height:34px;
    border-radius:999px;
    background: #ffffff;
    box-shadow:0 4px 14px rgba(15,23,42,0.35);
    cursor:pointer;
    transition:background .25s ease;
    border:1px solid rgba(255,255,255,0.35);
  }
  .ff-toggle input{display:none}
  .ff-toggle .knob{
    position:absolute;
    top:3px;
    left:3px;
    width:28px;
    height:28px;
    border-radius:999px;
    background:#5EA6D7;
    box-shadow:0 4px 14px rgba(0,0,0,.25);
    transition:transform .25s ease;
  }
  .ff-toggle .labels{
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 8px;
    font-size:.70rem;
    font-weight:700;
    color:#0f2f4b;
    user-select:none;
  }
  .ff-toggle[data-mode="last"]{background:#ffffff}
  .ff-toggle[data-mode="last"] .knob{transform:translateX(44px)}

  .ff-help{
    font-size:.75rem;
    color:rgba(226,232,240,0.9);
  }
`}</style>


{/* 🟦 HERO FINFOCUS – Bonos ARG Letras */}
<div className="ff-hero">
  {/* Lado izquierdo: título + subtítulo + badge */}
  <div className="ff-left">
    <div>
      <h1 className="ff-title">Bonos argentinos en pesos a tasa fija.</h1>
      <p className="ff-sub">
        Rendimientos en pesos, TNA, TEM, TEA y breakeven inflación con precio{" "}
        {priceMode === "ask" ? "ask" : "último"}.
      </p>
    </div>
    <span id="ff-badge" className="ff-mode-badge">
      <span className="ff-dot" />
      Modo precio: {priceMode === "ask" ? "Ask" : "Último"}
    </span>
  </div>

  {/* Lado derecho: toggle FINFOCUS */}
  <div className="ff-right">
    <div
      id="ff-toggle"
      className="ff-toggle"
      data-mode={priceMode === "last" ? "last" : "ask"}
      role="switch"
      aria-checked={priceMode === "last"}
      aria-label="Cambiar modo de precio"
      onClick={() =>
        setPriceMode((prev) => (prev === "ask" ? "last" : "ask"))
      }
    >
      <input
        type="checkbox"
        checked={priceMode === "last"}
        readOnly
      />
      <div className="labels">
        <span>Ask</span>
        <span>Último</span>
      </div>
      <div className="knob" />
    </div>
    <div className="ff-help">
      Alterna el origen de precio para la tabla
    </div>
  </div>
</div>

      <div className="container mx-auto overflow-auto px-4">
        {loading ? (
          <div className="text-center py-6 text-gray-600 text-sm">
            Cargando bonos...
          </div>
        ) : derivedRows.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-sm">
            No se encontraron bonos para mostrar.
          </div>
        ) : (
          <table className="min-w-full bg-white shadow rounded text-[0.60rem]">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Ticker</th>
                <th className="px-4 py-2 text-center">Vto</th>
                <th className="px-4 py-2 text-right">Días</th>
                <th className="px-4 py-2 text-right">Pago Final</th>
                <th className="px-4 py-2 text-right">{precioHeader}</th>
                <th className="px-4 py-2 text-right">TNA %</th>
                <th className="px-4 py-2 text-right">TEM %</th>
                <th className="px-4 py-2 text-right">TEA %</th>
                <th className="px-4 py-2 text-right">Breakeven mensual</th>
                <th className="px-4 py-2 text-right">Breakeven anualizado</th>
              </tr>
            </thead>
            <tbody>
              {derivedRows.map((r) => (
                <tr key={r.ticker} className="border-t">
                  <td className="px-4 py-2">{r.tipo}</td>
                  <td className="px-4 py-2">{r.ticker}</td>
                  <td className="px-4 py-2 text-center">{r.vto}</td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.dias) ? r.dias : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.pagoFinal != null ? nfARS.format(r.pagoFinal) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.precio) ? r.precio.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.tna)
                      ? nfPerc.format(r.tna / 100)
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.tem) ? nfPerc.format(r.tem) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.tea) ? nfPerc.format(r.tea) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.bexMens)
                      ? nfPerc.format(r.bexMens)
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {Number.isFinite(r.bexAnual)
                      ? nfPerc.format(r.bexAnual)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
