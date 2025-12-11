// src/components/AccidenteActualizacion.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FinancialData } from '@/entities/FinancialData';

const AZUL = '#0f2f4b';
const CELESTE = '#5EA6D7';

// ======================
// Helpers generales
// ======================
function toNumberLocale(strOrNum) {
  if (typeof strOrNum === 'number') return strOrNum;
  if (!strOrNum) return NaN;
  const s = String(strOrNum).trim();
  const sinMiles = s.replace(/\./g, '');
  return parseFloat(sinMiles.replace(',', '.'));
}

// Parseo tipo "jul-25", "ago-25", "sept-25", etc.
function parseFechaIPC(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();

  // ISO directo
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // mes-yy
  const meses = {
    ene: 0,
    feb: 1,
    mar: 2,
    abr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    sep: 8,
    set: 8,
    sept: 8, // 👈 clave para "sept-25"
    oct: 9,
    nov: 10,
    dic: 11,
  };

  const [mTxt, yy] = s.split('-');
  if (!mTxt || !yy) return null;

  const mesIdx = meses[mTxt];
  if (mesIdx == null) return null;

  const yyNum = parseInt(yy, 10);
  if (Number.isNaN(yyNum)) return null;

  const yearFull = yyNum > 50 ? 1900 + yyNum : 2000 + yyNum;
  return `${yearFull}-${String(mesIdx + 1).padStart(2, '0')}-01`;
}

// Helpers de fechas / claves
// Devuelve un número comparable sin usar Date (evita problemas de UTC)
function claveOrderValue(clave) {
  if (!clave) return -999999;

  // yyyy-mm
  if (/^\d{4}-\d{2}$/.test(clave)) {
    const [y, m] = clave.split('-').map(Number);
    return y * 100 + m;
  }

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
    const [y, m] = clave.split('-').map(Number);
    return y * 100 + m;
  }

  // mes-yy (ene-25, ago-25, sept-25…)
  const iso = parseFechaIPC(clave);
  if (!iso) return -999999;
  const [y, m] = iso.split('-').map(Number);
  return y * 100 + m;
}

function sortedKeys(obj) {
return Object.keys(obj || {}).sort(
  (a, b) => claveOrderValue(a) - claveOrderValue(b)
);
}

function lastKey(obj) {
  const ks = sortedKeys(obj);
  return ks[ks.length - 1];
}

function keyOnOrBefore(obj, targetDate) {
  const targetVal = claveOrderValue(targetDate);
  const ks = sortedKeys(obj);
  let res = null;

  for (const k of ks) {
    if (claveOrderValue(k) <= targetVal) res = k;
    else break;
  }
  return res;
}

function formatearISO(fechaISO) {
  const [año, mes, dia] = fechaISO.split('-');
  return `${dia}-${mes}-${año}`;
}

const nf = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function etiquetaVentana(meses) {
  const map = {
    6: 'Últimos 6 meses',
    12: 'Último año',
    24: 'Últimos 2 años',
    36: 'Últimos 3 años',
    60: 'Últimos 5 años',
  };
  return map[meses] || `${meses} meses`;
}

function variacionAcumuladaRIPTE(obj, mesesVentana) {
  if (!obj || !Object.keys(obj).length) return null;

  const endK = lastKey(obj);
  if (!endK) return null;

  // Tomamos año y mes de la última clave
  let y, m;
  if (/^\d{4}-\d{2}$/.test(endK) || /^\d{4}-\d{2}-\d{2}$/.test(endK)) {
    const partes = endK.split('-');
    y = parseInt(partes[0], 10);
    m = parseInt(partes[1], 10); // 1-12
  } else {
    // Por si alguna vez viniera "sep-25", "sept-25", etc.
    const iso = parseFechaIPC(endK);
    if (!iso) return null;
    const [yy, mm] = iso.split('-');
    y = parseInt(yy, 10);
    m = parseInt(mm, 10);
  }

  // Restamos mesesVentana meses
  const totalMeses = y * 12 + (m - 1); // 0 = enero año 0
  const refTotal = totalMeses - mesesVentana;
  if (refTotal < 0) return null;

  const refY = Math.floor(refTotal / 12);
  const refM = (refTotal % 12) + 1;
  const targetClave = `${refY}-${String(refM).padStart(2, '0')}`; // "YYYY-MM"

  // Buscamos la clave real más cercana <= targetClave
  const refK = keyOnOrBefore(obj, targetClave);
  if (!refK) return null;

  const vEnd = Number(obj[endK]?.valor ?? NaN);
  const vRef = Number(obj[refK]?.valor ?? NaN);
  if (Number.isNaN(vEnd) || Number.isNaN(vRef) || vRef === 0) return null;

  return ((vEnd / vRef) - 1) * 100;
}

// ======================
// Componente principal
// ======================
export default function AccidenteActualizacion() {
  const [ripte, setRipte] = useState(null);     // { "2025-07": 172674.88, ... }
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ventana, setVentana] = useState(24);   // por defecto "Últimos 2 años"

  // Carga solo RIPTE desde FinancialData
  useEffect(() => {
    let cancelled = false;

    async function loadRipte() {
      try {
        setLoading(true);
        setErrorMsg('');

        const all = await FinancialData.list('-lastSync');
        const ripteObj = {};

        for (const fd of all || []) {
          if (!fd) continue;

          const cat = (fd.category || '').toLowerCase();
          if (cat !== 'ripte') continue; // 👈 sólo RIPTE

          for (const fila of fd.data || []) {
            if (!fila || fila.length < 2) continue;

            const claveRaw = fila[0]; // "jul-25", "sept-25", etc.
            const valorRaw = fila[1];

            const iso = parseFechaIPC(claveRaw);
            if (!iso) continue;

            const d = new Date(iso);
            const keyYM = `${d.getFullYear()}-${String(
              d.getMonth() + 1
            ).padStart(2, '0')}`; // "2025-09"

            const valor = toNumberLocale(valorRaw);
            if (!Number.isNaN(valor)) {
            ripteObj[keyYM] = {
            valor,
            raw: claveRaw   // 👈 guardamos "sept-25"
};
            }
          }
        }

        if (!cancelled) {
          if (Object.keys(ripteObj).length === 0) {
            setRipte(null);
            setErrorMsg('Sin datos de RIPTE.');
          } else {
            setRipte(ripteObj);
          }
        }
      } catch (e) {
        console.error('Error cargando RIPTE', e);
        if (!cancelled) {
          setRipte(null);
          setErrorMsg('Error al cargar RIPTE.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRipte();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preparamos valores para la UI
const { lastClave, lastFechaDisplay, lastValor, varAcum } = useMemo(() => {
  if (!ripte || !Object.keys(ripte).length) {
    return {
      lastClave: null,
      lastFechaDisplay: null,
      lastValor: null,
      varAcum: null,
    };
  }

  const lastK = lastKey(ripte);
  const entry = ripte[lastK] || {};
  const valor = entry.valor ?? null;
  const raw = entry.raw ?? null;

  // ==========================
  // FECHA DISPLAY PRIORIDAD
  // 1) raw (sept-25)
  // 2) ISO (yyyy-mm-dd)
  // 3) yyyy-mm  → mm/yyyy
  // 4) fallback
  // ==========================
  let fechaDisplay;

  if (raw) {
    fechaDisplay = String(raw);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(lastK)) {
    fechaDisplay = formatearISO(lastK);
  } else if (/^\d{4}-\d{2}$/.test(lastK)) {
    const [y, m] = lastK.split("-");
    fechaDisplay = `${m}/${y}`;
  } else {
    fechaDisplay = lastK;
  }

  // Variación
  const va = variacionAcumuladaRIPTE(ripte, ventana);

  return {
    lastClave: lastK,
    lastFechaDisplay: fechaDisplay,
    lastValor: valor,
    varAcum: va,
  };
}, [ripte, ventana]);

  const varDisplay =
    varAcum == null ? '—' : `${nf.format(varAcum)}%`;

  const noDatos = !loading && (!ripte || !lastClave);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* Título */}
      <h1
        className="text-2xl font-bold text-center mb-1 flex items-center justify-center gap-2"
        style={{ color: AZUL }}
      >
        Última actualización
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-xs"
          style={{ backgroundColor: CELESTE }}
        >
          ⟳
        </span>
      </h1>

      {/* Selector de ventana */}
      <div className="mt-2 flex justify-center">
        <label className="text-sm text-gray-600 flex items-center gap-2">
          <span>Ventana:</span>
          <select
            className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
            value={ventana}
            onChange={(e) => setVentana(parseInt(e.target.value, 10))}
          >
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último año</option>
            <option value={24}>Últimos 2 años</option>
            <option value={36}>Últimos 3 años</option>
            <option value={60}>Últimos 5 años</option>
          </select>
        </label>
      </div>

      {/* Contenido */}
      <div className="overflow-x-auto mt-4">
        {loading && (
          <p className="text-center text-sm text-slate-500">
            Cargando RIPTE…
          </p>
        )}

        {!loading && errorMsg && noDatos && (
          <p className="text-center text-sm text-slate-500">
            {errorMsg}
          </p>
        )}

        {!loading && !noDatos && (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-[#d9ecf8]">
              <tr>
                <th className="px-4 py-2 text-center font-medium text-[#0f2f4b]">
                  Índice
                </th>
                <th className="px-4 py-2 text-center font-medium text-[#0f2f4b]">
                  Fecha última actualización
                </th>
                <th className="px-4 py-2 text-center font-medium text-[#0f2f4b]">
                  Valor
                </th>
                <th className="px-4 py-2 text-center font-medium text-[#0f2f4b]">
                  Variación acumulada · {etiquetaVentana(ventana)}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-center text-gray-700">
                  RIPTE
                </td>
                <td className="px-4 py-2 text-center text-gray-700">
                  {lastFechaDisplay}
                </td>
                <td className="px-4 py-2 text-center text-gray-700">
                  {lastValor != null ? nf.format(lastValor) : '—'}
                </td>
                <td
                  className={`px-4 py-2 text-center ${
                    varAcum != null && varAcum < 0
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  {varDisplay}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
