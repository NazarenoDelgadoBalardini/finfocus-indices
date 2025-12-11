import React, { useEffect, useMemo, useState } from "react";
import { FinancialData } from "@/entities/FinancialData";

const HERO_AZUL = "#0f2f4b";

/* ===================== Helpers generales ===================== */

const fmtYMD = (d) =>
  d
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate())
        .toISOString()
        .slice(0, 10)
    : "";

function parseDMY(s) {
  if (!s) return null;
  s = String(s).trim();
  // ISO directo
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00");
  // dd/mm/yyyy o dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = +m[1];
    const mm = +m[2] - 1;
    const yyyy = +String(m[3]).padStart(4, "20");
    return new Date(yyyy, mm, dd);
  }
  const d = new Date(s);
  if (isNaN(d)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const parseISO = (s) => (s ? new Date(s + "T00:00:00") : null);

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

function rangeDays(d1, d2) {
  const a = [];
  const one = 1000 * 3600 * 24;
  const start = new Date(d1);
  const end = new Date(d2);
  for (let t = start.getTime(); t <= end.getTime(); t += one) {
    a.push(new Date(t));
  }
  return a;
}

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/* ===================== Componente principal ===================== */

export default function CerPorRango() {
  const [feriados, setFeriados] = useState(new Set());
  const [cerJson, setCerJson] = useState({}); // { "YYYY-MM-DD": number }

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [offset, setOffset] = useState(10);

  const [rows, setRows] = useState([]); // {fecha, ajustada, cer, used}
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

  const [status, setStatus] = useState("—");

  /* ========== carga inicial desde FinancialData ========== */

  useEffect(() => {
    async function init() {
      try {
        setStatus("Cargando feriados y CER…");

        const allFD = await FinancialData.list("-lastSync");

        const norm = (s) =>
          (s || "")
            .toString()
            .trim()
            .toLowerCase();

        const getSeries = (name) => {
          const target = norm(name);
          return (allFD || []).find((f) => {
            const key = norm(f.key);
            const nm = norm(f.name);
            const cat = norm(f.category);
            return key === target || nm === target || cat === target;
          });
        };

        const fdInhab = getSeries("inhabiles_financieros");
        const fdCer = getSeries("cer");

        // --- inhabiles_financieros: ["31/12/2015"] ---
        const ferSet = new Set();
        if (fdInhab) {
          let headers =
            fdInhab.headers && fdInhab.headers.length ? fdInhab.headers : [];
          let dataRows = fdInhab.data || [];

          if (!headers.length && dataRows.length) {
            headers = dataRows[0];
            dataRows = dataRows.slice(1);
          }

          dataRows.forEach((row) => {
            if (!row || !row.length) return;
            const d = parseDMY(row[0]);
            if (d) ferSet.add(fmtYMD(d));
          });
        }

        // --- cer: ["Fecha","Índice"] / ["2002-02-02","1,0000"] ---
        const cerMap = {};
        if (fdCer) {
          let headers =
            fdCer.headers && fdCer.headers.length ? fdCer.headers : [];
          let dataRows = fdCer.data || [];

          if (!headers.length && dataRows.length) {
            headers = dataRows[0];
            dataRows = dataRows.slice(1);
          }

          dataRows.forEach((row) => {
            if (!row || row.length < 2) return;
            const dateStr = (row[0] || "").trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

            const raw = (row[1] || "").toString().trim();
            const normVal = raw.replace(/\./g, "").replace(",", ".");
            const val = parseFloat(normVal);
            if (Number.isFinite(val)) {
              cerMap[dateStr] = val;
            }
          });
        }

        if (!Object.keys(cerMap).length) {
          throw new Error("No se encontraron datos en la serie 'cer'.");
        }

        setFeriados(ferSet);
        setCerJson(cerMap);

        // presets de fechas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const dDesde = addDays(hoy, -30);
        setDesde(fmtYMD(dDesde));
        setHasta(fmtYMD(hoy));
        setRangeStart(dDesde);
        setRangeEnd(hoy);

        setStatus("");
      } catch (err) {
        console.error(err);
        setStatus("Error de carga");
        alert("No se pudo cargar Inhábiles o CER: " + err.message);
      }
    }

    init();
  }, []);

  /* ========== lógica de negocio ========== */

  const isHabil = (d) => {
    const esFinde = isWeekend(d);
    const esFeriado = feriados.has(fmtYMD(d));
    return !esFinde && !esFeriado;
  };

  const minusBusiness = (date, n = 10) => {
    let d = new Date(date);
    let count = 0;
    while (count < n) {
      d = addDays(d, -1);
      if (isHabil(d)) count++;
    }
    return d;
  };

  const cerAt = (date) => {
    // si falta exacto, retrocede hasta 370 días máx
    let d = new Date(date);
    for (let i = 0; i < 370; i++) {
      const key = fmtYMD(d);
      if (cerJson && cerJson[key] != null)
        return { value: +cerJson[key], used: key };
      d = addDays(d, -1);
    }
    return { value: null, used: null };
  };

  const handleCalc = () => {
    if (!desde || !hasta) {
      alert("Completá las fechas.");
      return;
    }
    const d1 = parseISO(desde);
    const d2 = parseISO(hasta);
    if (!d1 || !d2) {
      alert("Fechas inválidas.");
      return;
    }
    if (d2 < d1) {
      alert("El rango es inválido (Hasta < Desde).");
      return;
    }
    if (!cerJson || !Object.keys(cerJson).length) {
      alert("CER no cargado aún.");
      return;
    }

    const off = Math.max(0, parseInt(offset || "10", 10) || 0);
    const days = rangeDays(d1, d2);

    const out = days.map((fecha) => {
      const ajustada = minusBusiness(fecha, off);
      const { value, used } = cerAt(ajustada);
      return { fecha, ajustada, cer: value, used };
    });

    setRows(out);
    setRangeStart(d1);
    setRangeEnd(d2);
  };

  const handleExportCSV = () => {
    if (!rows.length) {
      alert("Primero generá resultados.");
      return;
    }
    const head = ["idx", "fecha", "fecha_ajustada", "cer", "nota"];
    const lines = [head.join(",")];
    rows.forEach((r, i) => {
      const nota =
        r.used !== fmtYMD(r.ajustada) && r.used
          ? `Usado CER de ${r.used}`
          : "";
      lines.push([
        i + 1,
        fmtYMD(r.fecha),
        fmtYMD(r.ajustada),
        r.cer ?? "",
        nota,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = "cer_rango.csv";
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ========== resumen (KPI) ========== */

  const resumen = useMemo(() => {
    const nf = (n, dec = 2) =>
      n == null || !isFinite(n)
        ? "—"
        : n.toLocaleString("es-AR", {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec,
          });

    const firstValid = rows.find((r) => r.cer != null) || null;
    let lastValid = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].cer != null) {
        lastValid = rows[i];
        break;
      }
    }

    const cerIni = firstValid?.cer ?? null;
    const cerFin = lastValid?.cer ?? null;

    const factor =
      cerIni != null && cerFin != null ? cerFin / cerIni : null;
    const varAcum = factor != null ? factor - 1 : null;

    return {
      faIni: firstValid ? firstValid.used || fmtYMD(firstValid.ajustada) : "—",
      cerIni: nf(cerIni, 3),
      faFin: lastValid ? lastValid.used || fmtYMD(lastValid.ajustada) : "—",
      cerFin: nf(cerFin, 3),
      factor: factor != null ? nf(factor, 6) : "—",
      varAcum:
        varAcum != null
          ? (varAcum * 100).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + "%"
          : "—",
    };
  }, [rows]);

  /* ========== calendario (JSX) ========== */

  const calendarMonths = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];

    const usedSet = new Set(
      (rows || [])
        .map((r) => r.used || (r.ajustada ? fmtYMD(r.ajustada) : null))
        .filter(Boolean)
    );

    const rangeSet = new Set(
      rangeDays(rangeStart, rangeEnd).map((d) => fmtYMD(d))
    );

    const months = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = fmtYMD(today);

    let mStart = startOfMonth(rangeStart);
    let mEnd = endOfMonth(rangeEnd);

    for (
      let y = mStart.getFullYear(), m = mStart.getMonth();
      y < mEnd.getFullYear() ||
      (y === mEnd.getFullYear() && m <= mEnd.getMonth());
      m++
    ) {
      const first = new Date(y, m, 1);
      const last = endOfMonth(first);

      const daysJsx = [];

      const firstDow = first.getDay() === 0 ? 7 : first.getDay(); // 1..7 (lun..dom)
      for (let i = 1; i < firstDow; i++) {
        daysJsx.push(
          <div key={`e-${y}-${m}-${i}`} className="day muted"></div>
        );
      }

      for (let d = 1; d <= last.getDate(); d++) {
        const cur = new Date(y, m, d);
        const key = fmtYMD(cur);
        const dow = cur.getDay(); // 0 dom .. 6 sáb
        const cls = ["day"];
        if (dow === 0 || dow === 6) cls.push("wk");
        if (feriados.has(key)) cls.push("feriado");
        if (rangeSet.has(key)) cls.push("inrange");
        if (usedSet.has(key)) cls.push("ajustada");
        if (key === todayKey) cls.push("today");

        daysJsx.push(
          <div
            key={key}
            className={cls.join(" ")}
            title={key}
          >
            {d}
          </div>
        );
      }

      const headLabel = first.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      });

      months.push(
        <div key={`${y}-${m}`} className="cal">
          <div className="cal-head">
            {headLabel.charAt(0).toUpperCase() + headLabel.slice(1)}
          </div>
          <div className="grid">
            <div className="dow">L</div>
            <div className="dow">M</div>
            <div className="dow">M</div>
            <div className="dow">J</div>
            <div className="dow">V</div>
            <div className="dow">S</div>
            <div className="dow">D</div>
          </div>
          <div className="grid">{daysJsx}</div>
        </div>
      );

      if (m === 11) {
        y++;
        m = -1;
      }
    }

    return months;
  }, [rangeStart, rangeEnd, rows, feriados]);

  /* ========== render JSX ========== */

  return (
    <>
      {/* CSS embebido (igual al HTML original, adaptado) */}
<style>{`
  .cer-rango-root *{
    box-sizing:border-box;
    font-family:'Montserrat',ui-sans-serif,system-ui;
  }
  .cer-rango-root{
    max-width:980px;
    margin:14px auto;
    padding:0 14px;
    background:#fff;
    color:#111827;
  }

  .cer-rango-root .card{
    border:1px solid #e5e7eb;
    border-radius:12px;
    box-shadow:0 6px 18px rgba(0,0,0,.05);
    margin:10px 0;
    background:#fff;
  }
  .cer-rango-root .card header{
    padding:12px 14px;
    border-bottom:1px solid #e5e7eb;
  }
  .cer-rango-root .card .body{
    padding:14px;
  }

  .cer-rango-root .grid{
    display:grid;
    grid-template-columns:repeat(12,1fr);
    gap:10px;
  }
  .cer-rango-root .g-4{grid-column:span 4}
  .cer-rango-root .g-3{grid-column:span 3}
  .cer-rango-root .g-12{grid-column:span 12}
  @media(max-width:900px){
    .cer-rango-root .g-4,
    .cer-rango-root .g-3{
      grid-column:span 12;
    }
  }

  .cer-rango-root label{
    font-size:.85rem;
    color:#374151;
    margin-bottom:4px;
    display:block;
  }
  .cer-rango-root input[type="date"],
  .cer-rango-root input[type="number"]{
    width:100%;
    padding:8px 10px;
    border:1px solid #e5e7eb;
    border-radius:10px;
  }

  .cer-rango-root button{
    padding:9px 12px;
    border-radius:10px;
    border:1px solid ${HERO_AZUL};
    background:${HERO_AZUL};
    color:#fff;
    font-weight:600;
    cursor:pointer;
  }
  .cer-rango-root button.ghost{
    background:#fff;
    color:${HERO_AZUL};
  }

  .cer-rango-root table{
    width:100%;
    border-collapse:collapse;
  }
  .cer-rango-root th,
  .cer-rango-root td{
    padding:8px;
    border-bottom:1px solid #eef2f7;
    text-align:center;
    font-size:.92rem;
  }
  .cer-rango-root th{
    position:sticky;
    top:0;
    background:#f9fafb;
    color:#374151;
  }

  .cer-rango-root .muted{color:#6b7280;}
  .cer-rango-root .note{
    font-size:.9rem;
    color:#374151;
    background:#f3f6fb;
    border-left:4px solid #5EA6D7;
    padding:10px;
    border-radius:8px;
  }
  .cer-rango-root .row{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    align-items:flex-end;
  }

  .cer-rango-root .kpi{
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    margin:8px 0;
  }
  .cer-rango-root .kpi .item{
    flex:1 1 180px;
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-radius:10px;
    padding:8px 10px;
  }
  .cer-rango-root .kpi .item h4{
    margin:.1rem 0 .25rem 0;
    font-size:.82rem;
    color:#374151;
  }
  .cer-rango-root .kpi .item p{
    margin:0;
    font-weight:700;
    color:${HERO_AZUL};
  }

  .cer-rango-root details{
    border:1px solid #e5e7eb;
    border-radius:10px;
    margin-top:10px;
  }
  .cer-rango-root details>summary{
    cursor:pointer;
    padding:10px 12px;
    font-weight:600;
    background:#f9fafb;
    border-radius:10px;
  }
  .cer-rango-root details[open]>summary{
    border-bottom:1px solid #e5e7eb;
    border-bottom-left-radius:0;
    border-bottom-right-radius:0;
  }

  /* ===== Calendario ===== */
  .cer-rango-root .cal-wrap{
    display:grid;
    grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
    gap:12px;
  }
  .cer-rango-root .cal{
    border:1px solid #e5e7eb;
    border-radius:10px;
    overflow:hidden;
    background:#fff;
  }
  .cer-rango-root .cal .cal-head{
    background:#f9fafb;
    padding:8px 10px;
    font-weight:700;
    color:${HERO_AZUL};
    text-align:center;
  }
  .cer-rango-root .cal .grid{
    display:grid;
    grid-template-columns:repeat(7,1fr);
  }
  .cer-rango-root .cal .dow,
  .cer-rango-root .cal .day{
    text-align:center;
    padding:6px 4px;
    font-size:.9rem;
    border-bottom:1px solid #f1f5f9;
  }
  .cer-rango-root .cal .dow{
    background:#f9fafb;
    color:#374151;
    font-weight:600;
  }
  .cer-rango-root .cal .day{
    min-height:36px;
    border-right:1px solid #f1f5f9;
  }
  .cer-rango-root .cal .day:nth-child(7n){
    border-right:none;
  }

  .cer-rango-root .cal .muted{color:#9ca3af;}
  .cer-rango-root .cal .wk{
    color:#6b7280;
    background:#fafafa;
  }
  .cer-rango-root .cal .feriado{
    color:#b91c1c;
    background:#fee2e2;
  }
  .cer-rango-root .cal .inrange{
    outline:2px solid #0f2f4b22;
    outline-offset:-2px;
  }
  .cer-rango-root .cal .ajustada{
    box-shadow: inset 0 0 0 2px #2563eb;
  }
  .cer-rango-root .cal .today{
    border-bottom:2px solid ${HERO_AZUL};
  }

  .cer-rango-root .legend{
    font-size:.85rem;
    color:#374151;
    display:flex;
    gap:10px;
    margin-top:6px;
    flex-wrap:wrap;
  }
  .cer-rango-root .legend .dot{
    width:12px;
    height:12px;
    border-radius:3px;
    display:inline-block;
    background:#e5e7eb;
  }
  .cer-rango-root .legend .dot.fer{
    background:#fee2e2;
    border:1px solid #fecaca;
  }
  .cer-rango-root .legend .dot.wk{
    background:#f3f4f6;
    border:1px solid #e5e7eb;
  }
  .cer-rango-root .legend .dot.rg{
    background:#0f2f4b22;
    border:1px solid #93c5fd;
  }
  .cer-rango-root .legend .dot.aj{
    background:#eff6ff;
    border:2px solid #2563eb;
  }
`}</style>

      <div className="cer-rango-root">
        {/* Parámetros */}
        <div className="card">
          <header>
            <strong>Parámetros</strong>
          </header>
          <div className="body">
            <div className="grid">
              <div className="g-4">
                <label>Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="g-4">
                <label>Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
              <div className="g-3">
                <label>Días hábiles antes (X)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                />
              </div>
              <div className="g-12 row">
                <button onClick={handleCalc}>Calcular</button>
                <button className="ghost" onClick={handleExportCSV}>
                  Exportar CSV
                </button>
                <span className="muted" style={{ marginLeft: "auto" }}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen / KPI */}
        <div className="body">
          <div id="resumen" className="kpi">
            <div className="item">
              <h4>Fecha inicial ajustada</h4>
              <p>{resumen.faIni}</p>
            </div>
            <div className="item">
              <h4>CER inicial</h4>
              <p>{resumen.cerIni}</p>
            </div>
            <div className="item">
              <h4>Fecha final ajustada</h4>
              <p>{resumen.faFin}</p>
            </div>
            <div className="item">
              <h4>CER final</h4>
              <p>{resumen.cerFin}</p>
            </div>
            <div className="item">
              <h4>Factor acumulado</h4>
              <p>{resumen.factor}</p>
            </div>
            <div className="item">
              <h4>Variación acumulada</h4>
              <p>{resumen.varAcum}</p>
            </div>
          </div>

          {/* Calendario */}
          <details className="card" open>
            <summary>
              <strong>Calendario</strong>
            </summary>
            <div className="body">
              <div id="calendario" className="cal-wrap">
                {calendarMonths}
              </div>
              <div className="legend">
                <span>
                  <i className="dot fer" /> Feriado
                </span>
                <span>
                  <i className="dot wk" /> Fines de semana
                </span>
                <span>
                  <i className="dot rg" /> Rango seleccionado
                </span>
                <span>
                  <i className="dot aj" /> Fechas efectivas usadas (ajustadas)
                </span>
              </div>
            </div>
          </details>

          {/* Detalle diario */}
          <details id="detalle">
            <summary>Ver detalle diario</summary>
            <div style={{ overflow: "auto", maxHeight: "60vh" }}>
              <table id="tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Fecha ajustada (–X háb.)</th>
                    <th>CER(fecha ajustada)</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const nota =
                      r.used && r.ajustada && r.used !== fmtYMD(r.ajustada)
                        ? `Usado CER de ${r.used}`
                        : "";
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{fmtYMD(r.fecha)}</td>
                        <td>{fmtYMD(r.ajustada)}</td>
                        <td>
                          {r.cer != null
                            ? r.cer.toLocaleString("es-AR", {
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </td>
                        <td className="muted">{nota}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Sin datos aún. Elegí un rango y presioná “Calcular”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>

          <p className="note" style={{ marginTop: 8 }}>
            Si no existiera el CER exacto de la fecha ajustada, se retrocede
            día a día hasta hallar el último disponible.
          </p>
        </div>
      </div>
    </>
  );
}
