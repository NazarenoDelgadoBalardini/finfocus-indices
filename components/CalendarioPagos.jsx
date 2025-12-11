import React, { useEffect, useState } from "react";
import { FinancialData } from "@/entities/FinancialData";

// ========= CONFIG =========
const SHEET_ID = "1cWgD3_oU6FpMSwYSdqNHLAOYtYX30QAH";
const SHEET_NAME = "DATA";
const SHEET_NAME_LETRAS = "Letras";
const SHEET_NAME_INHABILES = "Inhábiles financieros";
const SHEET_NAME_CER = "CER";

const SHEET_CSV = (name) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    name
  )}`;

const COMPANY_LOGOS = {
  "AEROPUERTOS ARGENTINA 2000": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151069-3000e8f0/aeropuertos_edited.png ",
  "ARCOR S.A.I.C.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151265-dd733fca/arcor.png ",
  "EDENOR S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151108-c039e58a/edenor.png ",
  "GENERACIÓN MEDITERRÁNEA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151112-73a1980a/generacion.jpeg ",
  "IRSA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136159263-699d82be/IRSA.png",
  "CRESUD": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765135937433-ffb92a4c/cresud.png ",
  "LOMA NEGRA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136655572-e1c6b84f/loma.png",
  "MASTELLONE HERMANOS S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151269-18db4974/la_serenisima.jpg ",
  "MSU ENERGY": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151255-7bf8e535/msu.png",
  "PAN AMERICAN ENERGY": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151101-62446a11/pan_american_energy.png ",
  "PAMPA ENERGÍA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151257-b1927dd4/pampa_energia.png ",
  "PLUSPETROL": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151268-429b4639/pluspetrol.png ",
  "RIZOBACTER ARGENTINA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151266-a0142a54/rizobacter.png ",
  "TELECOM ARGENTINA S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136784249-ad6c5e57/telecom.jpg ",
  "VISTA ENERGY ARGENTINA S.A.U.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151072-0aec4c32/vista.png ",
  "YPF S.A.": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151084-6bdbf22a/ypf.png ",
  "YPF LUZ": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136151106-7fa036c9/ypf_luz.png ",
  "BCRA ARGENTINA": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png ",
  "S.A. SAN MIGUEL": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136911802-1c4247f3/san_miguel.png ",
  "PROVINCIA DE BUENOS AIRES": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png ",
  "ESTADO ARGENTINO": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765136962326-d2034aaa/argentina_logo.png ",
  "JOHN DEERE": "https://cdn.agentui.ai/cmi7fab3101lwqm1j2syzggje/1765137071078-9b711a8c/john_deere.png ",
};

// ========= HELPERS =========
function stripCell(v) {
  return v ? String(v).trim().replace(/^"(.*)"$/, "$1") : "";
}
function parseCSVLine(line) {
  const out = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseNumberCell(v) {
  if (!v) return 0;
  let s = String(v).trim().replace(/^"(.*)"$/, "$1");
  if (s === "" || s === "-") return 0;
  s = s.replace(/[^\d.,\-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function toDate(v) {
  if (!v) return null;
  let s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1]),
      mo = parseInt(m[2]) - 1,
      y = parseInt(m[3]) < 100 ? parseInt(m[3]) + 2000 : parseInt(m[3]);
    return new Date(y, mo, d);
  }
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDate(d) {
  return d
    ? d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
}

// ===============================================================
//                    COMPONENTE PRINCIPAL
// ===============================================================
export default function CalendarioPagos() {
  const [rows, setRows] = useState([]);
  const [inhabs, setInhabs] = useState(new Set());
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // CARGA DE DATOS
  useEffect(() => {
    loadSheet();
  }, []);

  async function loadSheet() {
    try {
      const allFD = await FinancialData.list("-lastSync");

const norm = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase();

const getSeries = (name) => {
  const target = norm(name);
  const s = (allFD || []).find((f) => {
    const key = norm(f.key);
    const nm  = norm(f.name);
    const cat = norm(f.category);
    return key === target || nm === target || cat === target;
  });
  console.log("Buscando serie:", name, "→", s);
  return s;
};

const fdData   = getSeries("data");
const fdCER    = getSeries("bonos_cer");
const fdLetras = getSeries("letras_y_bonos_del_tesoro");
const fdInhab  = getSeries("inhabiles_financieros");

      let all = [];
      let inh = new Set();

      // ================== DATA ==================
      if (fdData) {
        let headers =
          fdData.headers && fdData.headers.length ? fdData.headers : [];
        let dataRows = fdData.data || [];

        // Si los headers vienen en la primera fila de data
        if (!headers.length && dataRows.length) {
          headers = dataRows[0];
          dataRows = dataRows.slice(1);
        }

        dataRows.forEach((c) => {
          if (!c || !c.length) return;
          all.push({
            empresa: stripCell(c[0]),          // "AEROPUERTOS ARGENTINA 2000"
            tickerARS: stripCell(c[1]),        // "ARC1O"
            tickerUSD: stripCell(c[2]),        // "ARC1D"
            fecha: toDate(stripCell(c[3])),    // "01/11/2024"
            intereses: parseNumberCell(c[4]),  // " USD 2,13 "
            capital: parseNumberCell(c[6]),    // " USD 100,00 " (ajusto a la col 6)
            isCER: false,
            emision: null,
          });
        });
      }

      // ================== LETRAS / BONOS TESORO ==================
      if (fdLetras) {
        let headers =
          fdLetras.headers && fdLetras.headers.length ? fdLetras.headers : [];
        let dataRows = fdLetras.data || [];

        if (!headers.length && dataRows.length) {
          headers = dataRows[0];
          dataRows = dataRows.slice(1);
        }

        dataRows.forEach((c) => {
          if (!c || !c.length) return;
          // ["Tipo","Ticker","Vto","Pago"]
          all.push({
            empresa: "ESTADO ARGENTINO",
            tickerARS: stripCell(c[1]),       // Ticker
            tickerUSD: "",
            fecha: toDate(stripCell(c[2])),   // Vto / Pago
            intereses: 0,
            capital: parseNumberCell(c[3]),   // Pago
            isCER: false,
            emision: null,
          });
        });
      }

      // ================== INHÁBILES FINANCIEROS ==================
      if (fdInhab) {
        let headers =
          fdInhab.headers && fdInhab.headers.length ? fdInhab.headers : [];
        let dataRows = fdInhab.data || [];

        if (!headers.length && dataRows.length) {
          headers = dataRows[0];
          dataRows = dataRows.slice(1);
        }

        dataRows.forEach((c) => {
          if (!c || !c.length) return;
          const d = toDate(stripCell(c[0])); // ["31/12/2015"]
          if (d) inh.add(toYMD(d));
        });
      }

      // ================== BONOS CER ==================
      if (fdCER) {
        let headers =
          fdCER.headers && fdCER.headers.length ? fdCER.headers : [];
        let dataRows = fdCER.data || [];

        if (!headers.length && dataRows.length) {
          headers = dataRows[0];
          dataRows = dataRows.slice(1);
        }

        dataRows.forEach((c) => {
          if (!c || !c.length) return;
          // ["Tipo","Ticker","Emisión","Fecha pago","Interes (%)","Intereses ($)","Capital","Valor residual"]
          all.push({
            empresa: "ESTADO ARGENTINO",
            tickerARS: stripCell(c[1]),         // TZXO5
            tickerUSD: "",
            fecha: toDate(stripCell(c[3])),     // Fecha pago
            intereses: parseNumberCell(c[5]),   // Intereses ($)
            capital: parseNumberCell(c[6]),     // Capital
            isCER: true,
            emision: toDate(stripCell(c[2])),   // Emisión
          });
        });
      }

      setRows(all.filter((r) => r.empresa && r.fecha));
      setInhabs(inh);
      setSelectedDate(new Date());
    } catch (err) {
      console.error("Error cargando FinancialData en CalendarioPagos", err);
      setRows([]);
      setInhabs(new Set());
    }
  }

  function pagosDelDia(d) {
    return rows.filter(
      (r) => r.fecha && r.fecha.toDateString() === d.toDateString()
    );
  }

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthTitle = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  })
    .format(calDate)
    .replace(/^./, (c) => c.toUpperCase());

  // Construir grilla
  const celdas = [];

  // encabezados
  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].forEach((d) =>
    celdas.push(
      <div key={"h" + d} style={{ fontWeight: 700, textAlign: "center" }}>
        {d}
      </div>
    )
  );

// espacios en blanco
for (let i = 0; i < firstDay; i++) {
  celdas.push(<div key={"e" + i}></div>);
}

// días del mes
for (let d = 1; d <= daysInMonth; d++) {
  const date = new Date(year, month, d);
  const pagos = pagosDelDia(date);

  const isSelected =
    selectedDate && selectedDate.toDateString() === date.toDateString();
  const isWeekend = [0, 6].includes(date.getDay());
  const isInhabil = inhabs.has(toYMD(date));

  celdas.push(
    <div
      key={d}
      onClick={() => setSelectedDate(date)}
      style={{
        background: isSelected
          ? "#CDE7F6"
          : isInhabil
          ? "#FFE7E7"
          : isWeekend
          ? "#E5E7EB"
          : "#fff",
        border:
          "1px solid " +
          (isSelected ? "#0f2f4b" : isInhabil ? "#ef4444" : "#ddd"),
        borderRadius: 8,
        padding: 4,
        minHeight: 80,
        cursor: "pointer",
        transition: "0.2s",
      }}
    >
      <div style={{ fontWeight: 600 }}>{d}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {pagos.map((p, idx) => (
          <div
            key={idx}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={COMPANY_LOGOS[p.empresa] || ""}
              alt={p.empresa}
              style={{
                maxWidth: "80%",
                maxHeight: "80%",
                objectFit: "contain",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const pagosHoy = selectedDate ? pagosDelDia(selectedDate) : [];

  return (
    <div style={{ fontFamily: "Montserrat, sans-serif", padding: 20 }}>
      {/* estilos internos */}
      <style>{`
        .card{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:16px;
          box-shadow:0 6px 18px rgba(0,0,0,.06);
          padding:16px;
          margin-bottom:20px;
        }
      `}</style>

      {/* HEADER CALENDARIO */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <button
            onClick={() =>
              setCalDate(new Date(year, month - 1, 1))
            }
            style={{
              background: "#0f2f4b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            ⟵
          </button>

          <h2  style={{    fontWeight: 700,    fontSize: "1.4rem",    color: "#0f2f4b",    margin: 0,  }}>  {monthTitle}</h2>

          <button
            onClick={() =>
              setCalDate(new Date(year, month + 1, 1))
            }
            style={{
              background: "#0f2f4b",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            ⟶
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 4,
          }}
        >
          {celdas}
        </div>
      </div>

      {/* DETALLE */}
      <div className="card">
        <h3 style={{ color: "#0f2f4b", marginBottom: 10 }}>
          {selectedDate
            ? `Pagos del ${selectedDate.toLocaleDateString("es-AR")}`
            : "Detalle de pagos"}
        </h3>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Empresa</th>
              <th style={th}>Ticker</th>
              <th style={th}>Interés</th>
              <th style={th}>Capital</th>
            </tr>
          </thead>
          <tbody>
            {pagosHoy.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: 10 }}>
                  Sin pagos programados
                </td>
              </tr>
            ) : (
              pagosHoy.map((p, i) => (
                <tr key={i}>
<td style={td}>
  <div
    style={{
      width: 26,
      height: 26,
      borderRadius: 6,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginRight: 4,
      verticalAlign: "middle",
    }}
  >
    <img
      src={COMPANY_LOGOS[p.empresa] || ""}
      alt=""
      style={{
        maxWidth: "80%",
        maxHeight: "80%",
        objectFit: "contain",
      }}
    />
  </div>
  {p.empresa}
</td>
                  <td style={td}>{p.tickerARS || p.tickerUSD}</td>
                  <td style={td}>
                    {p.intereses.toFixed(2)}
                    {p.isCER && (
                      <div style={{ fontSize: 12, marginTop: 4, color: "#0f2f4b" }}>
                        Ajustar por CER
                        <br />
                        desde {fmtDate(p.emision)} hasta {fmtDate(p.fecha)}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    {p.capital.toFixed(2)}
                    {p.isCER && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <a
                          href="https://finfocus.agentui.app/finfocus?tab=finfocus"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Calculadora CER
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// estilos tabla
const th = {
  border: "1px solid #ddd",
  padding: 6,
  background: "#f5f5f5",
};

const td = {
  border: "1px solid #ddd",
  padding: 6,
  textAlign: "center",
};
