// src/components/BuscarResolucionAccidente.jsx
import React, { useEffect, useState } from "react";

const AZUL = "#0f2f4b";

// ===== Config: Google Sheets (hoja "Accidente") =====
const SHEET_ID = "1ht4HGOwtgY19IA2Si40v6Kx1LGlv4jG6inFqOMZALNQ";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Accidente`;

// =====================
// Helpers CSV simples
// =====================
function splitCsvLine(line) {
  const res = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // "" -> "
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      res.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });

  // Filtramos filas totalmente vacías
  const filteredRows = rows.filter((row) =>
    Object.values(row).some((v) => String(v).trim() !== "")
  );

  return { headers, rows: filteredRows };
}

// ===== Utilidades de fecha =====
function parseDMYToDate(strDMY) {
  if (!strDMY) return null;
  const [dd, mm, yyyy] = String(strDMY).split("/");
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0);
  return isNaN(d) ? null : d;
}

// Parse YYYY-MM-DD del <input type="date"> a fecha local (no UTC)
function parseISOToLocalDate(iso) {
  if (!iso) return null;
  const [yyyy, mm, dd] = iso.split("-").map(Number);
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0);
  return isNaN(d) ? null : d;
}

// Formato DD/MM/AAAA
function formatDateDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Helper: ubica encabezados de forma flexible
function findHeader(headers, ...candidatos) {
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/\s+/g, " ")
      .trim();

  const H = headers.map((h) => ({ raw: h, key: norm(h) }));

  for (const cand of candidatos) {
    const c = norm(cand);
    const hit = H.find((h) => h.key === c || h.key.includes(c));
    if (hit) return hit.raw;
  }
  return null;
}

function enlaceResolucion(entry) {
  if (entry.url) {
    return (
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition"
      >
        {entry.res}
      </a>
    );
  }
  return <span>{entry.res}</span>;
}

export default function BuscarResolucionAccidente() {
  const [resoluciones, setResoluciones] = useState([]); // [{desde, hasta, res, url}]
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [fecha, setFecha] = useState("2025-03-01");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mensajeResultado, setMensajeResultado] = useState("");

  // ===== Cargar CSV de Google Sheets =====
  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        setLoading(true);
        setErrorCarga("");

        const resp = await fetch(CSV_URL);
        if (!resp.ok) throw new Error("No se pudo descargar el CSV");

        const csvText = await resp.text();
        const { headers, rows } = parseCsv(csvText);

        const desdeHdr = findHeader(headers, "Desde");
        const hastaHdr = findHeader(headers, "Hasta");
        const resHdr = findHeader(
          headers,
          "Resolución / Nota",
          "Resolucion / Nota",
          "Resolución",
          "Resolucion",
          "Nota"
        );
        const linkHdr = findHeader(headers, "Link", "URL");

        if (!desdeHdr || !hastaHdr || !resHdr) {
          console.error("Encabezados detectados:", {
            headers,
            desdeHdr,
            hastaHdr,
            resHdr,
            linkHdr,
          });
          throw new Error(
            "No se pudieron detectar los encabezados requeridos (Desde, Hasta, Resolución / Nota)."
          );
        }

        const lista = rows
          .map((row) => {
            const desde = parseDMYToDate(String(row[desdeHdr] || "").trim());
            const hasta = parseDMYToDate(String(row[hastaHdr] || "").trim());
            const res = String(row[resHdr] || "").trim();
            const url = String(
              (linkHdr ? row[linkHdr] : "") || ""
            ).trim();
            return { desde, hasta, res, url };
          })
          .filter(
            (r) =>
              r.desde instanceof Date &&
              !isNaN(r.desde) &&
              r.hasta instanceof Date &&
              !isNaN(r.hasta) &&
              r.res
          )
          .sort((a, b) => a.hasta - b.hasta);

        if (!cancelado) {
          setResoluciones(lista);
          if (!lista.length) {
            setErrorCarga(
              "No se cargaron filas válidas. Verificá formato DD/MM/AAAA y encabezados."
            );
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelado) {
          setErrorCarga(
            "❌ Error al cargar la base desde Google Sheets. Verificá permisos de la hoja 'Accidente'."
          );
          setResoluciones([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  // ===== Buscar resolución para la fecha actual =====
  const ejecutarBusqueda = () => {
    if (!fecha) {
      setResultado(null);
      setMensajeResultado("⚠️ Seleccioná una fecha.");
      return;
    }
    if (!resoluciones.length) {
      setResultado(null);
      setMensajeResultado(
        errorCarga || "⚠️ No hay datos de resoluciones cargados."
      );
      return;
    }

    setBuscando(true);
    const d = parseISOToLocalDate(fecha);
    if (!d) {
      setResultado(null);
      setMensajeResultado("⚠️ Fecha inválida.");
      setBuscando(false);
      return;
    }

    const entry = resoluciones.find(
      (r) => d >= r.desde && d <= r.hasta
    );

    if (entry) {
      setResultado(entry);
      setMensajeResultado("");
    } else {
      setResultado(null);
      setMensajeResultado("⚠️ No hay resolución para esa fecha.");
    }
    setBuscando(false);
  };

  // Búsqueda inicial cuando ya tengo datos
  useEffect(() => {
    if (resoluciones.length) {
      ejecutarBusqueda();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resoluciones]);

  // Última actualización (última fila)
  const ultima = resoluciones.length
    ? resoluciones[resoluciones.length - 1]
    : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 text-sm">
      {/* Tarjeta 1: Última actualización */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h1
          className="text-xl font-bold text-center mb-4"
          style={{ color: AZUL }}
        >
          Última publicación 🔄
        </h1>

        <div className="flex justify-center">
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#0f2f4b] rounded-full animate-spin" />
          ) : errorCarga && !ultima ? (
            <p className="text-red-600 text-center">{errorCarga}</p>
          ) : ultima ? (
            <div className="bg-[#0f2f4b]/10 rounded-lg p-4 text-center space-y-2">
              <p className="text-base">
                <span className="font-semibold" style={{ color: AZUL }}>
                  Resolución:
                </span>{" "}
                {ultima.res}
              </p>
              <p className="text-base">
                <span className="font-semibold" style={{ color: AZUL }}>
                  Vigencia:
                </span>{" "}
                <span style={{ color: AZUL }}>
                  {formatDateDDMMYYYY(ultima.desde)}
                </span>{" "}
                a{" "}
                <span style={{ color: AZUL }}>
                  {formatDateDDMMYYYY(ultima.hasta)}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-center text-slate-500">—</p>
          )}
        </div>
      </div>

      {/* Tarjeta 2: Buscador de Resoluciones */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h1
          className="text-xl font-bold text-center mb-6"
          style={{ color: AZUL }}
        >
          Buscador de Resolución / Nota S.R.T.
        </h1>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="fechaResolucion"
              className="block text-gray-600 text-sm mb-2"
            >
              Fecha PMI o determinación de incapacidad
            </label>
            <input
              type="date"
              id="fechaResolucion"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-[#0f2f4b] focus:ring-1 focus:ring-[#0f2f4b] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={ejecutarBusqueda}
            className="w-full bg-[#0f2f4b] text-white text-sm py-2 rounded-lg font-semibold hover:bg-[#0c243b] transition flex items-center justify-center gap-2"
            disabled={loading}
          >
            {buscando && (
              <span className="w-4 h-4 border-2 border-slate-200 border-t-white rounded-full animate-spin" />
            )}
            Buscar Resolución
          </button>

          <div className="mt-4 bg-white p-4 rounded-lg shadow border border-blue-100">
            {buscando ? (
              <div className="flex justify-center">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-[#0f2f4b] rounded-full animate-spin" />
              </div>
            ) : resultado ? (
              <>
                <h3
                  className="font-semibold mb-2 text-sm"
                  style={{ color: AZUL }}
                >
                  📑 Resolución
                </h3>
                <p className="mb-4 text-sm">{enlaceResolucion(resultado)}</p>
                <hr className="border-gray-200 mb-4" />
                <h3
                  className="font-semibold mb-2 text-sm"
                  style={{ color: AZUL }}
                >
                  📅 Vigencia
                </h3>
                <p className="text-sm">
                  <span>{formatDateDDMMYYYY(resultado.desde)}</span> a{" "}
                  <span>{formatDateDDMMYYYY(resultado.hasta)}</span>
                </p>
              </>
            ) : mensajeResultado ? (
              <p className="text-sm text-slate-700">{mensajeResultado}</p>
            ) : (
              <p className="text-sm text-slate-500">
                Ingresá una fecha y presioná “Buscar Resolución”.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
