// src/components/AccidentePasoTres.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAccidenteContext } from '@/components/AccidenteContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

const AZUL = '#0f2f4b';

const fmtARS = (n) =>
  (n ?? 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* =======================  Helpers generales  ======================= */

const formatDMY = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

// "2025-11-30" -> "30/11/2025"
function fmtDateISOtoAR(fechaISO) {
  if (!fechaISO) return '';
  const p = fechaISO.split('-');
  if (p.length !== 3) return fechaISO;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function parseCapital(valor) {
  const limpio = (valor || '')
    .replace(/\./g, '')
    .replace(',', ' .')
    .replace(/[^\d.-]/g, '')
    .replace(' ', '');
  return parseFloat(limpio) || 0;
}

function formatPeso(valor) {
  try {
    return valor.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    });
  } catch (e) {
    return '$ ' + Number(valor).toFixed(2);
  }
}

function formatearMoneda(input) {
  const valor = (input.value || '').replace(/\D/g, '');
  const numero = parseFloat(valor) / 100;
  if (!isNaN(numero)) {
    input.value = numero.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
  } else {
    input.value = '';
  }
}

function obtenerValorNumerico(v) {
  if (!v) return 0;
  return parseFloat(
    v.replace(/[$.]/g, '').replace(',', '.').trim()
  ) || 0;
}

function formatoMonto(m) {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(m);
  } catch (e) {
    return '$ ' + Number(m).toFixed(2);
  }
}

function calcularEdad(fn, fa) {
  const n = new Date(fn);
  const a = new Date(fa);
  let edad = a.getFullYear() - n.getFullYear();
  const mes = a.getMonth() - n.getMonth();
  if (mes < 0 || (mes === 0 && a.getDate() < n.getDate())) edad--;
  return edad;
}

// Normaliza encabezados y busca por nombre flexible
function findHeader(headers, ...candidatos) {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const H = (headers || []).map((h) => ({ raw: h, key: norm(h) }));
  for (const cand of candidatos) {
    const c = norm(cand);
    const hit = H.find((h) => h.key === c || h.key.includes(c));
    if (hit) return hit.raw;
  }
  return null;
}

// "DD/MM/AAAA" -> Date
function parseDMYToDate(strDMY) {
  if (!strDMY) return null;
  const [dd, mm, yyyy] = String(strDMY).split('/');
  const d = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(d) ? null : d;
}

// "YYYY-MM-DD" -> Date
function parseISOToLocal(strISO) {
  if (!strISO) return null;
  const [yyyy, mm, dd] = String(strISO).split('-');
  const d = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(d) ? null : d;
}

// Formatea en vivo como "XX,XX%"
function formatearPorcentajeShift(input) {
  let valor = (input.value || '').replace(/\D/g, '');
  if (valor === '') {
    input.value = '';
    return;
  }
  const numero = parseFloat(valor) / 100;
  input.value =
    numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '%';
}

// Parser para recuperar el valor numérico desde "12,34%" o "12,34"
function parsePorcentaje(str) {
  if (!str) return NaN;
  return parseFloat(
    (str + '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
}

/* =======================  Orden de eventos  ======================= */

const PRIORITY = { pago: 1, capitalizacion: 2, fin: 3 };

function ordenarEventos(evts) {
  return [...(evts || [])].sort((a, b) => {
    const d = new Date(a.fecha) - new Date(b.fecha);
    return d || (PRIORITY[a.tipo] - PRIORITY[b.tipo]);
  });
}

/* =======================  Render detalle cálculo ======================= */

function renderDetalleCalculo(resultado, fechaFinalISO, mountEl, titulo) {
  const fmt = (v) =>
    v.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    });
  const fArg = (iso) => (iso || '').split('-').reverse().join('-');
  const totalFinal =
    resultado.capitalActual +
    resultado.interesesDevengados +
    resultado.interesesAdeudados;

  function tramoDe(it) {
    const tramos = resultado.tramos || [];
    const tol = 0.01;
    return (
      tramos.find(
        (t) =>
          t.hasta === it.fecha &&
          ((typeof it.monto === 'number' &&
            Math.abs((t.interes || 0) - (it.monto || 0)) < tol) ||
            (typeof it.capital === 'number' &&
              Math.abs((t.base || 0) - (it.capital || 0)) < tol))
      ) ||
      tramos.find((t) => t.hasta === it.fecha)
    );
  }

  let html = `
  <details class="ff-detalle">
    <summary class="ff-detalle__title cursor-pointer">
      ${titulo || 'Detalle del cálculo'}
    </summary>
    <div class="ff-timeline">`;

  (resultado.historial || []).forEach((it) => {
    let chip;
    if (it.tipo === 'interes-devengado') {
      const tr = tramoDe(it);
      chip = tr
        ? `🔹 Interés devengado desde ${fArg(tr.desde)} hasta ${fArg(
            tr.hasta
          )}`
        : '🔹 Interés devengado';
    } else {
      chip =
        {
          'capitalizacion-intereses-adeudados': '🟪 Capitalización (adeudados)',
          'capitalizacion-intereses-devengados':
            '🟪 Capitalización (devengados)',
          'pago-intereses-adeudados': '🟢 Pago a intereses adeudados',
          'pago-intereses-devengados': '🟢 Pago a intereses devengados',
          'pago-capital': '🔴 Pago a capital',
          'pago-sobrante': '🟠 Pago sobrante',
          'incorporacion-capital': '🔵 Incorporación capital histórico',
        }[it.tipo] || 'Evento';
    }

    const lineaInteres =
      it.tipo === 'interes-devengado'
        ? `<div class="ff-row"><span>Tasa de interés</span><b>${(
            it.tasa ?? 0
          ).toFixed(
            2
          )}%</b></div><div class="ff-row"><span>Capital que devenga interés</span><b>${fmt(
            it.capital ?? 0
          )}</b></div>`
        : '';

    const etiquetaMonto =
      it.tipo === 'interes-devengado' ? 'Interés devengado' : 'Monto';

    html += `
      <div class="ff-item">
        <div class="ff-item__head">
          <span class="ff-chip">${chip}</span>
          <span class="ff-date">${fArg(it.fecha)}</span>
        </div>
        <div class="ff-item__body">
          ${it.descripcion ? `<div class="ff-desc">${it.descripcion}</div>` : ''}
          ${lineaInteres}
          <div class="ff-row"><span>${etiquetaMonto}</span><b>${fmt(
      it.monto || 0
    )}</b></div>
          ${
            Number.isFinite(it.restante)
              ? `<div class="ff-row"><span>Restante del pago</span><b>${fmt(
                  it.restante
                )}</b></div>`
              : ''
          }
        </div>
      </div>`;
  });

  html += `</div>
    <div class="ff-resumen">
      <h4>Resumen al ${fArg(fechaFinalISO)}</h4>
      <div class="ff-row"><span>Capital final</span><b>${fmt(
        resultado.capitalActual
      )}</b></div>
      <div class="ff-row"><span>Intereses devengados no capitalizados</span><b>${fmt(
        resultado.interesesDevengados
      )}</b></div>
      ${
        resultado.interesesAdeudados > 0
          ? `<div class="ff-row"><span>Intereses adeudados no capitalizados</span><b>${fmt(
              resultado.interesesAdeudados
            )}</b></div>`
          : ''
      }
      <div class="ff-total"><span>Total final</span><b>${fmt(
        totalFinal
      )}</b></div>
    </div>
  </details>`;

  mountEl.innerHTML = html;
}

/* =======================  Índices / hojas de cálculo  ======================= */

let indicesActiva = {},
  indicesPasiva = {},
  indicesRIPTE = {},
  indicesRIPTE1 = {},
  indicesRIPTE2 = {},
  indicesSMVM = {},
  indicesInflacion = {},
  indicesCER = {};
let __ripteFuente = 'original';

// Sheets
const SHEET_ID = '1ht4HGOwtgY19IA2Si40v6Kx1LGlv4jG6inFqOMZALNQ';
const SHEET_ACTIVA = 'Tasa activa BNA';
const SHEET_PASIVA = 'Tasa Pasiva BCRA';
const SHEET_RIPTE = 'RIPTE';
const SHEET_RIPTE1 = 'RIPTE1';
const SHEET_RIPTE2 = 'RIPTE2';
const SHEET_CER = 'CER';
const SHEET_IPC = 'IPC Nivel General';
const SHEET_SMVM = 'SMVM';
const SHEET_ACCIDENTE = 'Accidente';

// CSV de la hoja Accidente (mínimos LRT)
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
  SHEET_ACCIDENTE
)}`;

// Query para gviz JSON (solo A,B con datos)
const TQ = 'select A,B where A is not null and B is not null';

// "1.234,56" → 1234.56  |  "107,9475" → 107.9475
function toNumberLocale(strOrNum) {
  if (typeof strOrNum === 'number') return strOrNum;
  if (strOrNum == null) return NaN;
  const s = String(strOrNum).trim();
  const sinMiles = s.replace(/\./g, '');
  return parseFloat(sinMiles.replace(',', '.'));
}

// Convierte claves gviz "date(YYYY,MM,DD)" → "YYYY-MM-DD"; deja "jul-94" tal cual (minúsculas)
function normalizeKeyFromGviz(kRaw) {
  if (kRaw == null) return '';
  let s = String(kRaw).trim();
  const m = s.match(/^date\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (m) {
    const y = +m[1];
    const mm = (+m[2] + 1).toString().padStart(2, '0');
    const dd = (+m[3]).toString().padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return s.toLowerCase();
}

// Descarga una hoja A/B via gviz JSON
async function cargarHoja(sheetName) {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?` +
    `sheet=${encodeURIComponent(sheetName)}&tqx=out:json&tq=${encodeURIComponent(
      TQ
    )}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} al leer ${sheetName}`);

  const text = await res.text();
  if (!text.includes('google.visualization.Query.setResponse')) {
    throw new Error(`Respuesta no gviz (permisos?) en hoja: ${sheetName}`);
  }
  const json = JSON.parse(
    text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
  );
  const rows = json.table?.rows || [];

  const out = {};
  for (const r of rows) {
    if (!r || !r.c) continue;
    const kRaw = r.c[0]?.v;
    const vRaw = r.c[1]?.v;
    const key = normalizeKeyFromGviz(kRaw);
    if (!key) continue;
    const num = toNumberLocale(vRaw);
    if (!isNaN(num)) out[key] = num;
  }
  return out;
}

// Alias "sept-" → "sep-"
function addSeptAlias(obj) {
  if (!obj) return obj;
  for (const k of Object.keys(obj)) {
    if (k.startsWith('sept-')) obj[k.replace(/^sept-/, 'sep-')] = obj[k];
  }
  return obj;
}

// Cargar TODOS los índices
async function cargarTodosIndices() {
  const [activa, pasiva, ripte, ripte1, ripte2, smvm, inflacion, cer] =
    await Promise.all([
      cargarHoja(SHEET_ACTIVA),
      cargarHoja(SHEET_PASIVA),
      cargarHoja(SHEET_RIPTE),
      cargarHoja(SHEET_RIPTE1),
      cargarHoja(SHEET_RIPTE2),
      cargarHoja(SHEET_SMVM),
      cargarHoja(SHEET_IPC),
      cargarHoja(SHEET_CER),
    ]);

  indicesActiva = activa;
  indicesPasiva = pasiva;
  indicesRIPTE = addSeptAlias(ripte);
  indicesRIPTE1 = addSeptAlias(ripte1);
  indicesRIPTE2 = addSeptAlias(ripte2);
  indicesSMVM = addSeptAlias(smvm);
  indicesInflacion = addSeptAlias(inflacion);
  indicesCER = cer;

  console.info(
    '[Sheets] filas:',
    'Activa',
    Object.keys(indicesActiva).length,
    '| Pasiva',
    Object.keys(indicesPasiva).length,
    '| RIPTE',
    Object.keys(indicesRIPTE).length,
    '| RIPTE1',
    Object.keys(indicesRIPTE1).length,
    '| RIPTE2',
    Object.keys(indicesRIPTE2).length,
    '| SMVM',
    Object.keys(indicesSMVM).length,
    '| IPC',
    Object.keys(indicesInflacion).length,
    '| CER',
    Object.keys(indicesCER).length
  );

  const btn = document.getElementById('btnCalcular');
  if (btn) btn.removeAttribute('disabled');
}

/* =======================  Resoluciones (mínimos) ======================= */

// [{desde, hasta, res, url, m11A, m11B, m11C, m14A, m14B, m15, m3, ...}]
let periodos = [];

const TQ_ACCIDENTE = 'select * where A is not null';

// Intenta interpretar fechas de celdas de Google Sheets
function parseFechaCeldaAcc(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();

  // Caso gviz: "date(2024,0,31)" o "Date(2024,0,31)"
  const m = s.match(/^date\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (m) {
    const y = +m[1];
    const mm = +m[2];
    const dd = +m[3];
    const d = new Date(y, mm, dd);
    return isNaN(d) ? null : d;
  }

  // Caso texto tipo "31/01/2024"
  if (s.includes('/')) {
    return parseDMYToDate(raw);
  }

  // Caso ISO "2024-01-31"
  if (s.includes('-')) {
    return parseISOToLocal(raw);
  }

  return null;
}

async function cargarResolucionesDesdeSheet() {
  // Leemos la hoja "Accidente" con gviz JSON en lugar de CSV
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?` +
    `sheet=${encodeURIComponent(SHEET_ACCIDENTE)}&tqx=out:json&tq=${encodeURIComponent(
      TQ_ACCIDENTE
    )}`;

  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`No se pudo leer la hoja Accidente (HTTP ${resp.status})`);
  }

  const text = await resp.text();
  if (!text.includes('google.visualization.Query.setResponse')) {
    throw new Error('Respuesta no es gviz JSON (permisos?) en hoja Accidente');
  }

  const json = JSON.parse(
    text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
  );
  const table = json.table || {};
  const cols = table.cols || [];
  const rows = table.rows || [];

  // Encabezados tal como vienen de la hoja
  const headers = cols.map((c) => (c.label || c.id || '').toString());

  // Creamos "filas" como objetos { encabezado: valor }
  const data = rows.map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      const c = r.c?.[i];
      // Usamos .f (formateado) si existe, sino .v
      obj[h] = c ? c.f ?? c.v : null;
    });
    return obj;
  });

  // Usamos el mismo finder flexible que ya tenías
  const desdeHdr = findHeader(headers, 'Desde');
  const hastaHdr = findHeader(headers, 'Hasta');
  const resHdr = findHeader(
    headers,
    'Resolución / Nota',
    'Resolucion / Nota',
    'Resolución',
    'Resolucion',
    'Nota'
  );
  const linkHdr = findHeader(headers, 'Link', 'URL');

  const h11A = findHeader(headers, 'Art. 11.A', '11A', '11 A', '11.A');
  const h11B = findHeader(headers, 'Art. 11.B', '11B', '11 B', '11.B');
  const h11C = findHeader(headers, 'Art. 11.C', '11C', '11 C', '11.C');
  const h14A = findHeader(
    headers,
    'Art. 14.2.A',
    '14.2A',
    '14A',
    '14 2 A',
    '14.2 A'
  );
  const h14B = findHeader(
    headers,
    'Art. 14.2.B',
    '14.2B',
    '14B',
    '14 2 B',
    '14.2 B'
  );
  const h15 = findHeader(headers, 'Art. 15.2', '15');
  const h3 = findHeader(
    headers,
    'Art. 3 Ley 26.773',
    'Art.3 Ley 26.773',
    'Art. 3',
    'Art.3',
    'Articulo 3',
    'Artículo 3',
    '3'
  );

  const toNumber = (x) => {
    if (typeof x === 'number') return x;
    const s = String(x || '').trim();
    if (!s) return NaN;
    const sinMiles = s
      .replace(/\s+/g, '')
      .replace(/\$/g, '')
      .replace(/\./g, '');
    return parseFloat(sinMiles.replace(',', '.'));
  };

  periodos = data
    .map((row) => {
      const desde = parseFechaCeldaAcc(desdeHdr ? row[desdeHdr] : null);
      const hasta = parseFechaCeldaAcc(hastaHdr ? row[hastaHdr] : null);
      const res = String(resHdr ? row[resHdr] : '' || '').trim();
      const url = String((linkHdr ? row[linkHdr] : '') || '').trim();

      const m11A = h11A ? toNumber(row[h11A]) : NaN;
      const m11B = h11B ? toNumber(row[h11B]) : NaN;
      const m11C = h11C ? toNumber(row[h11C]) : NaN;
      const m14A = h14A ? toNumber(row[h14A]) : NaN;
      const m14B = h14B ? toNumber(row[h14B]) : NaN;
      const m15 = h15 ? toNumber(row[h15]) : NaN;
      const m3 = h3 ? toNumber(row[h3]) : NaN;

      return { desde, hasta, res, url, m11A, m11B, m11C, m14A, m14B, m15, m3 };
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

  // Guardamos también copias en ISO para búsquedas internas
  periodos = periodos.map((p) => ({
    ...p,
    desdeISO: p.desde.toISOString().slice(0, 10),
    hastaISO: p.hasta.toISOString().slice(0, 10),
    art3: p.m3,
  }));
}

function obtenerEnlaceRes(resNombre) {
  const p = periodos.find((x) => x.res === resNombre && x.url);
  return p && p.url
    ? `<a href="${p.url}" target="_blank" class="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded hover:bg-blue-200 transition">${resNombre}</a>`
    : resNombre;
}

function buscarMonto(art, fecha) {
  const key = (art || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace('11.A', '11A')
    .replace('11.B', '11B')
    .replace('11.C', '11C')
    .replace('14.2A', '14A')
    .replace('14.2B', '14B');

  const f = fecha instanceof Date ? fecha : new Date(fecha);
  const p = periodos.find((r) => f >= r.desde && f <= r.hasta);
  if (!p) return null;

  const monto =
    {
      '11A': p.m11A,
      '11B': p.m11B,
      '11C': p.m11C,
      '14A': p.m14A,
      '14B': p.m14B,
      '15': p.m15,
      '3': p.m3,
    }[key];

  if (monto == null || isNaN(monto)) return null;
  return {
    res: p.res,
    desde: p.desde,
    hasta: p.hasta,
    monto,
    url: p.url,
  };
}

/* =======================  Tasas (Activa / Pasiva / RIPTE / etc.) ======================= */

const mesesCortos = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function mesClaveAAAAMM(fechaISO) {
  const p = fechaISO.split('-');
  const a = p[0];
  const m = parseInt(p[1], 10);
  return mesesCortos[m - 1] + '-' + a.slice(2);
}

function calcularRiptePonderado(fi, ff) {
  if (!fi || !ff) return null;
  if (fi > ff) return null;

  function keyOf(fe) {
    const ymd = fe.split('-').map(Number);
    const d = new Date(ymd[0], ymd[1] - 1, ymd[2]);
    return (
      mesesCortos[d.getMonth()] + '-' + String(ymd[0]).slice(-2)
    );
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  let data = indicesRIPTE;
  const kI = keyOf(fi);
  const kF = keyOf(ff);
  __ripteFuente = 'original';

  if (!(kI in indicesRIPTE) || !(kF in indicesRIPTE)) {
    if (kI in indicesRIPTE1 && kF in indicesRIPTE1) {
      data = indicesRIPTE1;
      __ripteFuente = 't+1';
    } else if (kI in indicesRIPTE2 && kF in indicesRIPTE2) {
      data = indicesRIPTE2;
      __ripteFuente = 't+2';
    } else return null;
  }

  const yI = +fi.slice(0, 4),
    mI = +fi.slice(5, 7),
    dI = +fi.slice(8, 10);
  const yF = +ff.slice(0, 4),
    mF = +ff.slice(5, 7),
    dF = +ff.slice(8, 10);

  const kPrevI = keyOf(new Date(yI, mI - 2, 1).toISOString().slice(0, 10));
  const kPrevF = keyOf(new Date(yF, mF - 2, 1).toISOString().slice(0, 10));
  if (!(kPrevI in data) || !(kPrevF in data)) return null;

  let suma = 0;

  const varI = ((data[kI] / data[kPrevI]) - 1) * 100;
  const pesoI =
    (daysInMonth(yI, mI) - dI + 1) / daysInMonth(yI, mI);
  suma += varI * pesoI;

  const cur = new Date(yI, mI, 1);
  while (cur < new Date(yF, mF - 1, 1)) {
    const kCur = keyOf(cur.toISOString().slice(0, 10));
    const kPrev = keyOf(
      new Date(cur.getFullYear(), cur.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10)
    );
    if (!(kCur in data) || !(kPrev in data)) return null;
    suma += ((data[kCur] / data[kPrev]) - 1) * 100;
    cur.setMonth(cur.getMonth() + 1);
  }

  const varF = ((data[kF] / data[kPrevF]) - 1) * 100;
  const pesoF = dF / daysInMonth(yF, mF);
  suma += varF * pesoF;
  return suma;
}

function getTasaPorTipo(tipo, fi, ff) {
  if (!fi || !ff) return null;

  if (tipo === 'activa' && indicesActiva[fi] != null && indicesActiva[ff] != null) {
    return indicesActiva[ff] - indicesActiva[fi];
  }

  if (tipo === 'pasiva' && indicesPasiva[fi] != null && indicesPasiva[ff] != null) {
    const i1 = indicesPasiva[fi];
    const i2 = indicesPasiva[ff];
    return (((100 + i2) / (100 + i1)) - 1) * 100;
  }

  if (
    tipo === 'ripte' &&
    indicesRIPTE[mesClaveAAAAMM(fi)] != null &&
    indicesRIPTE[mesClaveAAAAMM(ff)] != null
  ) {
    const r1 = indicesRIPTE[mesClaveAAAAMM(fi)];
    const r2 = indicesRIPTE[mesClaveAAAAMM(ff)];
    return ((r2 / r1) - 1) * 100;
  }

  if (tipo === 'RIPTE Res. 332/23') {
    return calcularRiptePonderado(fi, ff);
  }

  if (
    tipo === 'smvm' &&
    indicesSMVM[mesClaveAAAAMM(fi)] != null &&
    indicesSMVM[mesClaveAAAAMM(ff)] != null
  ) {
    const s1 = indicesSMVM[mesClaveAAAAMM(fi)];
    const s2 = indicesSMVM[mesClaveAAAAMM(ff)];
    return ((s2 / s1) - 1) * 100;
  }

  if (
    tipo === 'inflacion' &&
    indicesInflacion[mesClaveAAAAMM(fi)] != null &&
    indicesInflacion[mesClaveAAAAMM(ff)] != null
  ) {
    const a1 = indicesInflacion[mesClaveAAAAMM(fi)];
    const a2 = indicesInflacion[mesClaveAAAAMM(ff)];
    return ((a2 / a1) - 1) * 100;
  }

  if (tipo === 'cer' && indicesCER[fi] != null && indicesCER[ff] != null) {
    const c1 = indicesCER[fi];
    const c2 = indicesCER[ff];
    return ((c2 / c1) - 1) * 100;
  }

  return null;
}

/* =======================  Mínimos actualizados (panel tasas) ======================= */

function calcularMinimoActualizado(minimoBase, scope /* '11' | '14_15' */) {
  const fd = document.getElementById('fechaDeclaracion')?.value || '';
  const fi = document.getElementById('fechaIBM')?.value || '';
  const panelAplica = fd && fi && fd < fi;

  const selEl =
    document.getElementById(`tasaMinimo${scope}`) ||
    document.getElementById('tasaMinimo');
  const noEl =
    document.getElementById(`noActMinimo${scope}`) ||
    document.getElementById('noActMinimo');
  const capEl =
    document.getElementById(`capMinimo${scope}`) ||
    document.getElementById('capMinimo');

  const noAct = !!(noEl && noEl.checked);

  if (!panelAplica || noAct) {
    return {
      valorComparacion: minimoBase,
      baseParaRubros: minimoBase,
      interesesNoCapitalizados: 0,
      tasa: null,
      actualizoConTasa: false,
      sinActualizacion: true,
    };
  }

  const sel = selEl?.value || 'activa';
  const t = getTasaPorTipo(sel, fd, fi);
  if (t === null) {
    return {
      valorComparacion: minimoBase,
      baseParaRubros: minimoBase,
      interesesNoCapitalizados: 0,
      tasa: null,
      actualizoConTasa: false,
      sinActualizacion: true,
    };
  }

  const intereses = minimoBase * (t / 100);
  const capitalizar = !!(capEl && capEl.checked);

  return {
    valorComparacion: minimoBase + intereses,
    baseParaRubros: capitalizar ? minimoBase + intereses : minimoBase,
    interesesNoCapitalizados: capitalizar ? 0 : intereses,
    tasa: t,
    actualizoConTasa: true,
    sinActualizacion: false,
  };
}

/* =======================  Motor de evolución de capitales ======================= */

function calcularEvolucionCapitales(capitalesHistoricos, tipoTasa, eventos) {
  const r = {
    tramos: [],
    capitalActual: 0,
    interesesAdeudados: 0,
    interesesDevengados: 0,
    historial: [],
    capitales: [],
  };

  capitalesHistoricos.forEach((cap) => {
    r.capitales.push({ ...cap, activo: false, interesesDevengados: 0 });
  });

  let fechaAnterior = capitalesHistoricos[0].fechaInicio;
  r.capitalActual = capitalesHistoricos[0].capital;
  r.interesesAdeudados = capitalesHistoricos[0].intereses || 0;
  r.capitales[0].activo = true;

  for (let i = 0; i < eventos.length; i++) {
    const evento = eventos[i];

    const nuevos = capitalesHistoricos.filter(
      (cap) =>
        !r.capitales.find((c) => c.index === cap.index).activo &&
        new Date(cap.fechaInicio) <= new Date(evento.fecha)
    );
    nuevos.forEach((nuevoCap) => {
      const capIndex = r.capitales.findIndex(
        (c) => c.index === nuevoCap.index
      );
      if (capIndex >= 0 && !r.capitales[capIndex].activo) {
        if (fechaAnterior < nuevoCap.fechaInicio) {
          const tasa = getTasaPorTipo(
            tipoTasa,
            fechaAnterior,
            nuevoCap.fechaInicio
          );
          if (tasa !== null) {
            const interes = r.capitalActual * (tasa / 100);
            r.interesesDevengados += interes;
            r.historial.push({
              fecha: nuevoCap.fechaInicio,
              tipo: 'interes-devengado',
              monto: interes,
              tasa,
              capital: r.capitalActual,
            });
            r.tramos.push({
              desde: fechaAnterior,
              hasta: nuevoCap.fechaInicio,
              tasa,
              base: r.capitalActual,
              interes,
            });
          }
        }
        r.capitalActual += nuevoCap.capital;
        r.interesesAdeudados += nuevoCap.intereses || 0;
        r.capitales[capIndex].activo = true;
        r.historial.push({
          fecha: nuevoCap.fechaInicio,
          tipo: 'incorporacion-capital',
          monto: nuevoCap.capital,
          intereses: nuevoCap.intereses || 0,
        });
        fechaAnterior = nuevoCap.fechaInicio;
      }
    });

    if (evento.fecha > fechaAnterior) {
      const tasa2 = getTasaPorTipo(tipoTasa, fechaAnterior, evento.fecha);
      if (tasa2 !== null) {
        const interes2 = r.capitalActual * (tasa2 / 100);
        r.interesesDevengados += interes2;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'interes-devengado',
          monto: interes2,
          tasa: tasa2,
          capital: r.capitalActual,
        });
        r.tramos.push({
          desde: fechaAnterior,
          hasta: evento.fecha,
          tasa: tasa2,
          base: r.capitalActual,
          interes: interes2,
        });
      }
    }

    if (evento.tipo === 'capitalizacion') {
      if (r.interesesAdeudados > 0) {
        r.capitalActual += r.interesesAdeudados;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'capitalizacion-intereses-adeudados',
          monto: r.interesesAdeudados,
        });
        r.interesesAdeudados = 0;
      }
      if (r.interesesDevengados > 0) {
        r.capitalActual += r.interesesDevengados;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'capitalizacion-intereses-devengados',
          monto: r.interesesDevengados,
        });
        r.interesesDevengados = 0;
      }
    } else if (evento.tipo === 'pago') {
      let resto = evento.monto;
      if (r.interesesAdeudados > 0 && resto > 0) {
        const p1 = Math.min(resto, r.interesesAdeudados);
        r.interesesAdeudados -= p1;
        resto -= p1;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'pago-intereses-adeudados',
          monto: p1,
          restante: resto,
        });
      }
      if (r.interesesDevengados > 0 && resto > 0) {
        const p2 = Math.min(resto, r.interesesDevengados);
        r.interesesDevengados -= p2;
        resto -= p2;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'pago-intereses-devengados',
          monto: p2,
          restante: resto,
        });
      }
      if (resto > 0 && r.capitalActual > 0) {
        const p3 = Math.min(resto, r.capitalActual);
        r.capitalActual -= p3;
        resto -= p3;
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'pago-capital',
          monto: p3,
          restante: resto,
        });
      }
      if (resto > 0) {
        r.historial.push({
          fecha: evento.fecha,
          tipo: 'pago-sobrante',
          monto: resto,
        });
      }
    }

    fechaAnterior = evento.fecha;
  }

  return r;
}

/* =======================  UI rubros (render + helpers DOM) ======================= */

function renderRubroAjuste(key, nombre, base, fechaInicioISO, interesesIni) {
  const intIni = interesesIni || 0;
  return (
    '' +
    '<div class="p-3 border rounded-md" id="box-' +
    key +
    '" data-base="' +
    base +
    '" data-int="' +
    intIni +
    '">' +
    '<div class="flex flex-wrap gap-2 items-center justify-between">' +
    '<div class="text-sm font-semibold text-gray-800">' +
    nombre +
    '</div>' +
    '<div class="text-sm">Base: <strong>' +
    formatPeso(base) +
    '</strong>' +
    (intIni > 0
      ? ' - Intereses iniciales no capitalizados: <strong>' +
        formatPeso(intIni) +
        '</strong>'
      : '') +
    '</div>' +
    '</div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">' +
    '<div><label class="block text-xs text-gray-600 mb-1">Fecha de inicio</label>' +
    '<input type="date" class="w-full border rounded px-2 py-2" id="ini-' +
    key +
    '" value="' +
    (fechaInicioISO || '') +
    '"></div>' +
    '<div><label class="block text-xs text-gray-600 mb-1">Fecha final</label>' +
    '<input type="date" class="w-full border rounded px-2 py-2" id="fin-' +
    key +
    '"></div>' +
    '<div><label class="block text-xs text-gray-600 mb-1">Tipo de tasa</label>' +
    '<select class="w-full border rounded px-2 py-2" id="tasa-' +
    key +
    '">' +
    '<option value="activa">Tasa activa BNA</option>' +
    '<option value="pasiva">Tasa pasiva BCRA</option>' +
    '<option value="ripte">RIPTE</option>' +
    '<option value="RIPTE Res. 332/23">RIPTE (Res. 332/23)</option>' +
    '<option value="smvm">SMVM</option>' +
    '<option value="inflacion">IPC Nivel General</option>' +
    '<option value="cer">CER</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div class="mt-2">' +
    '<div class="flex items-center justify-between">' +
    '<div class="text-xs font-semibold text-gray-600">Capitalizacion (art. 11 Ley 27.348)</div>' +
    '<button type="button" class="text-blue-600 text-xs underline" onclick="agregarCapRubro(\'' +
    key +
    '\')">+ Agregar</button>' +
    '</div>' +
    '<div id="caps-' +
    key +
    '" class="space-y-1 mt-1"></div>' +
    '</div>' +
    '<div class="mt-2">' +
    '<div class="flex items-center justify-between">' +
    '<div class="text-xs font-semibold text-gray-600">Pagos</div>' +
    '<button type="button" class="text-blue-600 text-xs underline" onclick="agregarPagoRubro(\'' +
    key +
    '\')">+ Agregar</button>' +
    '</div>' +
    '<div id="pagos-' +
    key +
    '" class="space-y-1 mt-1"></div>' +
    '</div>' +
    '<div class="mt-3 flex flex-wrap gap-2 items-start">' +
    '<button type="button" class="px-3 py-2 bg-[#0f2f4b] text-white rounded" onclick="calcularAjusteRubro(\'' +
    key +
    '\')">Calcular ajuste</button>' +
    '<div id="res-' +
    key +
    '" class="text-sm w-full"></div>' +
    '<div id="det-' +
    key +
    '" class="w-full"></div>' +
    '</div>' +
    '</div>'
  );
}

window.agregarCapRubro = function (key) {
  const wrap = document.getElementById('caps-' + key);
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.innerHTML =
    '<input type="date" class="border rounded px-2 py-1 flex-1" name="cap-' +
    key +
    '">' +
    '<button type="button" class="text-red-600 text-xs underline" onclick="this.parentNode.remove()">Eliminar</button>';
  wrap.appendChild(row);
};

window.agregarPagoRubro = function (key) {
  const wrap = document.getElementById('pagos-' + key);
  if (!wrap) return;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.innerHTML =
    '<input type="date" class="border rounded px-2 py-1 flex-1" name="pago-fecha-' +
    key +
    '">' +
    '<input type="text" placeholder="$ 0,00" class="border rounded px-2 py-1 flex-1" name="pago-monto-' +
    key +
    '">' +
    '<button type="button" class="text-red-600 text-xs underline" onclick="this.parentNode.remove()">Eliminar</button>';
  wrap.appendChild(row);
};

window.calcularAjusteRubro = function (key) {
  const box = document.getElementById('box-' + key);
  const base = parseFloat(box?.getAttribute('data-base') || '0');
  const interesesIni = parseFloat(box?.getAttribute('data-int') || '0');

  const ini = document.getElementById('ini-' + key).value;
  const fin = document.getElementById('fin-' + key).value;
  const tasa = document.getElementById('tasa-' + key).value;
  const out = document.getElementById('res-' + key);

  if (!ini) {
    out.textContent = 'Ingresa fecha de inicio';
    return;
  }
  if (!fin) {
    out.textContent = 'Ingresa fecha final';
    return;
  }

  const capsHistoricos = [
    {
      capital: base,
      intereses: interesesIni || 0,
      fechaInicio: ini,
      index: 0,
    },
  ];
  let eventos = [];

  document
    .querySelectorAll('input[name="cap-' + key + '"]')
    .forEach((i) => {
      if (i.value) eventos.push({ tipo: 'capitalizacion', fecha: i.value });
    });

  const fechasPagos = document.querySelectorAll(
    'input[name="pago-fecha-' + key + '"]'
  );
  const montosPagos = document.querySelectorAll(
    'input[name="pago-monto-' + key + '"]'
  );
  for (let j = 0; j < fechasPagos.length; j++) {
    const f = fechasPagos[j].value;
    const m = parseCapital(montosPagos[j].value || '');
    if (f && m > 0) eventos.push({ tipo: 'pago', fecha: f, monto: m });
  }

  eventos.push({ tipo: 'fin', fecha: fin });
  eventos = ordenarEventos(eventos);

  const test = getTasaPorTipo(tasa, ini, fin);
  if (test === null) {
    out.innerHTML =
      '<div class="mt-2 text-sm text-red-700">No hay datos para esa fecha final. Verifica el rango o proba otra tasa (p. ej., RIPTE t+1/t+2).</div>';
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const r = calcularEvolucionCapitales(capsHistoricos, tasa, eventos);
  const totalRubro =
    r.capitalActual + r.interesesDevengados + r.interesesAdeudados;
  const nombreTasa =
    tasa === 'RIPTE Res. 332/23' ? 'RIPTE (Res. 332/23)' : tasa.toUpperCase();
  const fuenteRipte =
    tasa === 'RIPTE Res. 332/23' &&
    (__ripteFuente === 't+1' || __ripteFuente === 't+2')
      ? `<div class="text-xs text-blue-800 mt-1">Fuente: RIPTE - ${__ripteFuente}</div>`
      : '';

  const html =
    '<div class="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-md shadow-sm">' +
    '<div class="text-blue-900 font-semibold">Final por tasa ' +
    nombreTasa +
    ': ' +
    formatPeso(totalRubro) +
    '</div>' +
    fuenteRipte +
    '<div class="mt-1 text-gray-700 font-normal">(Cap: ' +
    formatPeso(r.capitalActual) +
    ' - Int dev: ' +
    formatPeso(r.interesesDevengados) +
    (r.interesesAdeudados > 0
      ? ' - Int adeud.: ' + formatPeso(r.interesesAdeudados)
      : '') +
    ')</div>' +
    '</div>';

  out.innerHTML = html;
  acumularTotalActualizado();

  const detMount = document.getElementById('det-' + key);
  if (detMount) {
    const nombreRubro =
      document.querySelector(
        '#box-' + key + ' .text-sm.font-semibold'
      )?.textContent || key.toUpperCase();
    renderDetalleCalculo(r, fin, detMount, 'Detalle — ' + nombreRubro);
  }
};

function acumularTotalActualizado() {
  let suma = 0;
  document.querySelectorAll('[id^="res-"]').forEach((div) => {
    if (div.id === 'res-total') return;
    const txt = div.textContent || '';
    const m = txt.match(/[$]?\s?([\d\.,]+)/g);
    if (m && m[0]) {
      const n = parseCapital(m[0]);
      if (!isNaN(n)) suma += n;
    }
  });
  const span = document.getElementById('totalActualizado');
  if (span) span.textContent = formatPeso(suma);
}

/* =======================  Panel preview tasas mínimos ======================= */

function renderPreviewMinimoScope(scope) {
  const fd = document.getElementById('fechaDeclaracion')?.value || '';
  const fi = document.getElementById('fechaIBM')?.value || '';
  const pv = document.getElementById(`previewMinimo${scope}`);
  const selEl = document.getElementById(`tasaMinimo${scope}`);
  const capEl = document.getElementById(`capMinimo${scope}`);
  const noEl = document.getElementById(`noActMinimo${scope}`);
  if (!pv || !fd || !fi) return;

  if (noEl?.checked) {
    selEl?.setAttribute('disabled', 'disabled');
    capEl?.setAttribute('disabled', 'disabled');
    pv.textContent = 'Sin actualización: se usa el mínimo puro.';
    return;
  } else {
    selEl?.removeAttribute('disabled');
    capEl?.removeAttribute('disabled');
  }

  const sel = selEl?.value || 'activa';
  const t = getTasaPorTipo(sel, fd, fi);
  pv.textContent =
    t === null
      ? 'No hay datos disponibles para esa tasa/fechas.'
      : `Actualización ${fmtDateISOtoAR(fd)} → ${fmtDateISOtoAR(
          fi
        )} con ${sel}: ${t.toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`;
}

function togglePanelActualizaMinimo() {
  const fd = document.getElementById('fechaDeclaracion')?.value || '';
  const fi = document.getElementById('fechaIBM')?.value || '';
  const panel = document.getElementById('panelActualizaMinimo');
  if (!panel) return;
  if (fd && fi && fd < fi) {
    panel.classList.remove('hidden');
    ['11', '14_15'].forEach(renderPreviewMinimoScope);
  } else {
    panel.classList.add('hidden');
    ['11', '14_15'].forEach((s) => {
      const pv = document.getElementById(`previewMinimo${s}`);
      if (pv) pv.textContent = '';
    });
  }
}

/* =======================  Textos detallados mínimos vs fórmula ======================= */

function lineaMinimoDetallada({
  minimoBase,
  minimoLegal,
  porc,
  fiISO,
  fdISO,
  tasa,
  actualizoMin,
  sinAct,
  etiqueta = 'Mínimo legal',
  comparacion = true,
}) {
  const fechaMostrarISO = sinAct || !actualizoMin ? fdISO : fiISO;
  const fechaFin = fmtDateISOtoAR(fechaMostrarISO || '');
  const totalMin =
    actualizoMin && Number.isFinite(tasa)
      ? minimoBase * (tasa / 100 + 1)
      : minimoBase;

  const rotulo = etiqueta + (comparacion ? ' (comparación)' : '');

  let detalle =
    `Detalle: ${formatoMonto(minimoLegal)} × ` +
    `${(porc ?? 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}% = ${formatoMonto(minimoBase)}`;

  if (actualizoMin && Number.isFinite(tasa)) {
    const interMonto = minimoBase * (tasa / 100);
    detalle +=
      ` + intereses (${tasa.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%): ${formatoMonto(interMonto)}`;
  }

  return (
    `${rotulo}: <strong>${formatoMonto(totalMin)}</strong> al ${fechaFin}` +
    `<br><span class="text-gray-700">${detalle}</span>`
  );
}

function lineaFormulaDetallada(montoFormula, fiISO) {
  const fechaFin = fmtDateISOtoAR(fiISO || '');
  return `Cálculo fórmula: <strong>${formatoMonto(
    montoFormula
  )}</strong> al ${fechaFin}`;
}

/* =======================  Cálculo principal de indemnización  ======================= */

function calcularIndemnizacion() {
  const resultadoDiv = document.getElementById('resultado');
  if (!resultadoDiv) return;
  resultadoDiv.innerHTML = '';

  const fechaNacimientoInput = document.getElementById('fechaNacimiento');
  const fechaAccidenteInput = document.getElementById('fecha');
  const fechaDeclaracionInput = document.getElementById('fechaDeclaracion');

  const fechaNacimiento = fechaNacimientoInput?.value || '';
  const fechaAccidente = fechaAccidenteInput?.value || '';
  const fechaDeclaracionValue = fechaDeclaracionInput?.value || '';

  if (!fechaDeclaracionValue) {
    resultadoDiv.innerHTML =
      'Atencion: ingrese la fecha de declaracion de incapacidad.';
    return;
  }

  if (!fechaNacimiento) {
    resultadoDiv.innerHTML = 'Atencion: ingrese la fecha de nacimiento.';
    return;
  }

  if (!fechaAccidente) {
    resultadoDiv.innerHTML =
      'Atencion: ingrese la fecha del accidente/PMI o la fecha declarativa de incapacidad.';
    return;
  }

  // ✅ NUEVO: leer porcentaje y checkboxes desde el DOM
  const incapInput = document.getElementById('incapacidad');
  const porcentajeIncapacidad = parsePorcentaje(incapInput?.value || '');

  const esMuerte =
    document.getElementById('muerte')?.checked || false;
  const esInItinere =
    document.getElementById('itinere')?.checked || false;

  // usar el string ISO directamente para buscar montos
  const fechaDeclaracion = fechaDeclaracionValue;

  if (
    isNaN(porcentajeIncapacidad) ||
    porcentajeIncapacidad < 0 ||
    porcentajeIncapacidad > 100
  ) {
    resultadoDiv.innerHTML =
      'Ingrese un porcentaje de incapacidad valido (0-100).';
    return;
  }


  const edad = calcularEdad(fechaNacimiento, fechaAccidente);

// Agregar un span oculto para que el modal pueda leerlo
let edadNode = document.getElementById('resultadoEdad');
if (!edadNode) {
  edadNode = document.createElement('span');
  edadNode.id = 'resultadoEdad';
  edadNode.style.display = 'none';
  document.body.appendChild(edadNode);
}
edadNode.textContent = edad;


  const ibm = obtenerValorNumerico(document.getElementById('ibm').value);
  const fiISO =
    document.getElementById('fechaIBM').value || fechaDeclaracionValue;
  const fdISO = fechaDeclaracionValue;

  const valorFormula14 =
    ibm > 0
      ? (ibm * 53 * 65) / edad * (porcentajeIncapacidad / 100)
      : null;
  const valorFormula14b = valorFormula14;
  const calc15 = ibm > 0 ? (ibm * 53 * 65) / edad : null;

  let total = 0;
  let detalle =
    '<div class="page-break bg-white p-4 rounded-lg shadow border border-blue-100 text-sm leading-relaxed animate-fade-in-up">';
  detalle +=
    '<h3 class="text-blue-800 font-semibold text-base mb-1">🧾 Datos iniciales</h3>' +
    '<ul class="list-disc pl-5 text-gray-800 space-y-1">' +
    `<li>Edad al momento del accidente: <strong>${edad} años</strong></li>` +
    `<li>Porcentaje de incapacidad: <strong>${porcentajeIncapacidad}%</strong></li>` +
    '</ul><hr class="my-4 border-gray-300" />';

  let valorArt11 = 0,
    valorArt14 = 0,
    valorArt15 = 0,
    adicional = 0;
  let interesesIniArt11 = 0,
    interesesIniArt14 = 0,
    interesesIniArt15 = 0;
  let articuloAplicado11 = null,
    articuloAplicado14 = null;

  if (esMuerte) articuloAplicado11 = '11.C';
  else if (porcentajeIncapacidad >= 66) articuloAplicado11 = '11.B';
  else if (porcentajeIncapacidad > 50) articuloAplicado11 = '11.A';

  // ----- Art. 11 -----
  if (articuloAplicado11) {
    const info11 = buscarMonto(articuloAplicado11, fechaDeclaracion);
    if (info11) {
      const enlace11 = obtenerEnlaceRes(info11.res);
      const m11 = calcularMinimoActualizado(info11.monto, '11');
      valorArt11 = m11.baseParaRubros;
      interesesIniArt11 = m11.interesesNoCapitalizados || 0;

      detalle +=
        `<h3 class="text-blue-800 font-semibold text-base mb-1">📌 Art. ${articuloAplicado11}</h3>` +
        `<p>${enlace11}</p>`;

      detalle +=
        '<p>🔹 ' +
        lineaMinimoDetallada({
          minimoBase: info11.monto,
          minimoLegal: info11.monto,
          porc: 100,
          fiISO: fiISO,
          fdISO: fdISO,
          tasa: m11.tasa,
          actualizoMin: !!m11.actualizoConTasa,
          sinAct: !!m11.sinActualizacion,
          interesesIni: interesesIniArt11,
          baseRubros: valorArt11,
          etiqueta: 'Monto de pago único',
          comparacion: false,
        }) +
        '</p>';

      if (m11.sinActualizacion) {
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt11) +
          '</span> (pago único sin actualización)</p>';
      } else if (m11.actualizoConTasa && interesesIniArt11 > 0) {
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt11) +
          '</span> + ' +
          formatoMonto(interesesIniArt11) +
          ' (pago único actualizado + intereses no capitalizados)</p>';
      } else if (m11.actualizoConTasa) {
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt11) +
          '</span> (pago único actualizado con intereses capitalizados)</p>';
      } else {
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt11) +
          '</span> (pago único)</p>';
      }

      detalle += '<hr class="my-4 border-gray-300" />';
    }
  }

  // ----- Art. 14.2.A (<=50%) -----
  if (!esMuerte && porcentajeIncapacidad <= 50) {
    articuloAplicado14 = '14.2.A';
    const info14A = buscarMonto('14A', fechaDeclaracion);
    if (info14A) {
      const enlace14A = obtenerEnlaceRes(info14A.res);
      const minimo14 = info14A.monto * (porcentajeIncapacidad / 100);
      const m14 = calcularMinimoActualizado(minimo14, '14_15');
      const actualizoMin = !!m14.actualizoConTasa;
      const sinAct = !!m14.sinActualizacion;
      const minComp14 = m14.valorComparacion;
      const baseRubros14 = m14.baseParaRubros;
      interesesIniArt14 = m14.interesesNoCapitalizados;

      detalle +=
        '<h3 class="text-blue-800 font-semibold text-base mb-1">📌 Art. 14.2.A</h3>' +
        `<p>${enlace14A}</p>`;

      detalle +=
        '<p>🔹 ' +
        lineaMinimoDetallada({
          minimoBase: info14A.monto * (porcentajeIncapacidad / 100),
          minimoLegal: info14A.monto,
          porc: porcentajeIncapacidad,
          fiISO: fiISO,
          fdISO: fdISO,
          tasa: m14.tasa,
          actualizoMin,
          sinAct,
          interesesIni: interesesIniArt14,
          baseRubros: baseRubros14,
        }) +
        '</p>';

      if (ibm > 0) {
        detalle +=
          '<p>🔹 ' + lineaFormulaDetallada(valorFormula14, fiISO) + '</p>';
      }

      if (valorFormula14 !== null && valorFormula14 >= minComp14) {
        valorArt14 = valorFormula14;
        interesesIniArt14 = 0;
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt14) +
          '</span> (gana fórmula)</p>';
      } else {
        valorArt14 = baseRubros14;
        if (sinAct) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo)</p>';
        } else if (actualizoMin && interesesIniArt14 > 0) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> + ' +
            formatoMonto(interesesIniArt14) +
            ' (gana mínimo + intereses no capitalizados)</p>';
        } else if (actualizoMin) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo + intereses capitalizados)</p>';
        } else {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo)</p>';
        }
      }

      detalle += '<hr class="my-4 border-gray-300" />';
    }
  } else if (!esMuerte && porcentajeIncapacidad > 50 && porcentajeIncapacidad < 66) {
    // ----- Art. 14.2.B (entre 50 y 66) -----
    articuloAplicado14 = '14.2.B';
    const info14B = buscarMonto('14B', fechaDeclaracion);
    if (info14B) {
      const enlace14B = obtenerEnlaceRes(info14B.res);
      const minimo14b = info14B.monto * (porcentajeIncapacidad / 100);
      const m14b = calcularMinimoActualizado(minimo14b, '14_15');
      const actualizoMin = !!m14b.actualizoConTasa;
      const sinAct = !!m14b.sinActualizacion;
      const minComp14b = m14b.valorComparacion;
      const baseRubros14b = m14b.baseParaRubros;
      interesesIniArt14 = m14b.interesesNoCapitalizados;

      detalle +=
        '<h3 class="text-blue-800 font-semibold text-base mb-1">📌 Art. 14.2.B</h3>' +
        `<p>${enlace14B}</p>`;

      detalle +=
        '<p>🔹 ' +
        lineaMinimoDetallada({
          minimoBase: info14B.monto * (porcentajeIncapacidad / 100),
          minimoLegal: info14B.monto,
          porc: porcentajeIncapacidad,
          fiISO: fiISO,
          fdISO: fdISO,
          tasa: m14b.tasa,
          actualizoMin,
          sinAct,
          interesesIni: interesesIniArt14,
          baseRubros: baseRubros14b,
        }) +
        '</p>';

      if (ibm > 0) {
        detalle +=
          '<p>🔹 ' + lineaFormulaDetallada(valorFormula14b, fiISO) + '</p>';
      }

      if (valorFormula14b !== null && valorFormula14b >= minComp14b) {
        valorArt14 = valorFormula14b;
        interesesIniArt14 = 0;
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt14) +
          '</span> (gana fórmula)</p>';
      } else {
        valorArt14 = baseRubros14b;
        if (sinAct) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo)</p>';
        } else if (actualizoMin && interesesIniArt14 > 0) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> + ' +
            formatoMonto(interesesIniArt14) +
            ' (gana mínimo + intereses no capitalizados)</p>';
        } else if (actualizoMin) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo + intereses capitalizados)</p>';
        } else {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt14) +
            '</span> (gana mínimo)</p>';
        }
      }

      detalle += '<hr class="my-4 border-gray-300" />';
    }
  }

  // ----- Art. 15.2 (muerte o >=66) -----
  if (esMuerte || porcentajeIncapacidad >= 66) {
    const info15 = buscarMonto('15', fechaDeclaracion);
    if (info15) {
      const enlace15 = obtenerEnlaceRes(info15.res);
      const minimo15 = info15.monto;
      const m15 = calcularMinimoActualizado(minimo15, '14_15');
      const actualizoMin = !!m15.actualizoConTasa;
      const sinAct = !!m15.sinActualizacion;
      const minComp15 = m15.valorComparacion;
      const baseRubros15 = m15.baseParaRubros;
      interesesIniArt15 = m15.interesesNoCapitalizados;

      detalle +=
        '<h3 class="text-blue-800 font-semibold text-base mb-1">📌 Art. 15.2</h3>' +
        `<p class="text-gray-700">${enlace15}</p>`;

      detalle +=
        '<p>🔹 ' +
        lineaMinimoDetallada({
          minimoBase: info15.monto,
          minimoLegal: info15.monto,
          porc: 100,
          fiISO: fiISO,
          fdISO: fdISO,
          tasa: m15.tasa,
          actualizoMin,
          sinAct,
          interesesIni: interesesIniArt15,
          baseRubros: baseRubros15,
        }) +
        '</p>';

      if (calc15 !== null) {
        detalle +=
          '<p>🔹 ' + lineaFormulaDetallada(calc15, fiISO) + '</p>';
      }

      if (calc15 !== null && calc15 >= minComp15) {
        valorArt15 = calc15;
        interesesIniArt15 = 0;
        detalle +=
          '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
          formatoMonto(valorArt15) +
          '</span> (gana fórmula)</p>';
      } else {
        valorArt15 = baseRubros15;
        if (sinAct) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt15) +
            '</span> (gana mínimo)</p>';
        } else if (actualizoMin && interesesIniArt15 > 0) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt15) +
            '</span> + ' +
            formatoMonto(interesesIniArt15) +
            ' (gana mínimo + intereses no capitalizados)</p>';
        } else if (actualizoMin) {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt15) +
            '</span> (gana mínimo + intereses capitalizados)</p>';
        } else {
          detalle +=
            '<p>📊 Se aplica: <span class="text-green-700 font-semibold">' +
            formatoMonto(valorArt15) +
            '</span> (gana mínimo)</p>';
        }
      }

      detalle += '<hr class="my-4 border-gray-300" />';
    }
  }

  // ----- Art. 3 Ley 26.773 -----
  if (!esInItinere && (esMuerte || porcentajeIncapacidad > 0)) {
    const info3 = buscarMonto('3', fechaDeclaracion);
    if (info3) {
      const enlace3 = obtenerEnlaceRes(info3.res);

      const base =
        esMuerte || porcentajeIncapacidad >= 66
          ? valorArt11 + valorArt15
          : valorArt11 + valorArt14;

      const veinte = base * 0.2;
      const aplicaMinimo = esMuerte || porcentajeIncapacidad >= 66;
      adicional = aplicaMinimo ? Math.max(veinte, info3.monto) : veinte;

      detalle += `
      <h3 class="text-blue-800 font-semibold text-base mb-1">✅ Art. 3 Ley 26.773</h3>
      <p class="text-gray-700">${
        esMuerte ? 'Fallecimiento' : 'Incapacidad ' + porcentajeIncapacidad + '%'
      }, no in itinere</p>
      <div>
        ⚖️ 20% de base =
        <span class="text-green-700 font-semibold">${formatoMonto(
          adicional
        )}</span>
        <div style="font-size:.85rem;color:#6b7280;margin-top:2px">
          Detalle: 20% × ${formatoMonto(base)} = ${formatoMonto(veinte)}
          ${
            aplicaMinimo
              ? `<br> Mínimo legal: ${formatoMonto(info3.monto)} ${
                  adicional > veinte ? '(se aplica mínimo)' : '(no aplica mínimo)'
                }`
              : ''
          }
        </div>
      </div>
      <hr class="my-4 border-gray-300" />
    `;
    }
  } else {
    detalle += `
    <p class="text-gray-500">
      No corresponde Art. 3 Ley 26.773 ${
        esInItinere
          ? '(accidente in itinere)'
          : '(no hay incapacidad ni fallecimiento)'
      }
    </p>
    <hr class="my-4 border-gray-300" />
  `;
  }

  const valorBase = valorArt15 > 0 ? valorArt15 : valorArt14;
  total = valorArt11 + valorBase + adicional;

  const fechaIBMText = fmtDateISOtoAR(
    document.getElementById('fechaIBM').value || fechaDeclaracionValue
  );

  detalle += `
  <p class="mt-4 text-lg font-bold text-blue-900">
    💰 Total indemnización al 
    <span style="
      background:#eef5fa;
      color:#0f2f4b;
      padding:4px 10px;
      border-radius:9999px;
      display:inline-flex;
      align-items:center;
      gap:6px;
      font-weight:600;
      font-size:0.95em;
      box-shadow:0 1px 3px rgba(0,0,0,0.08);
    ">
      📅 ${fechaIBMText}
    </span>: 
    <span id="resultadoMontoFinal">${formatoMonto(total)}</span>
  </p>
`;

  detalle += '</div>';

  // Rubros para el bloque de ajustes
  const rubros = [];
  if (valorArt11 > 0) {
    const nombre11 = articuloAplicado11
      ? 'Art. ' + articuloAplicado11
      : 'Art. 11';
    rubros.push({
      key: 'art11',
      nombre: nombre11,
      base: valorArt11,
      intereses: interesesIniArt11 || 0,
    });
  }
  if (valorArt14 > 0) {
    const nombre14 = articuloAplicado14
      ? 'Art. ' + articuloAplicado14
      : 'Art. 14.2';
    rubros.push({
      key: 'art14',
      nombre: nombre14,
      base: valorArt14,
      intereses: interesesIniArt14,
    });
  }
  if (valorArt15 > 0) {
    rubros.push({
      key: 'art15',
      nombre: 'Art. 15.2',
      base: valorArt15,
      intereses: interesesIniArt15,
    });
  }
  if (adicional > 0) {
    rubros.push({
      key: 'adicional',
      nombre: 'Adicional (Art. 3 Ley 26.773)',
      base: adicional,
      intereses: 0,
    });
  }

  const fechaInicioRubro =
    document.getElementById('fechaIBM').value ||
    document.getElementById('fechaDeclaracion').value ||
    '';
  const interesesNoCapTotal =
    (interesesIniArt11 || 0) +
    (interesesIniArt14 || 0) +
    (interesesIniArt15 || 0);

  const bloqueTotal =
    '<div id="bloque-ajuste-total" style="margin-top:24px;">' +
    '<h3 class="text-blue-800 font-semibold text-base mb-2">🧮 Ajuste sobre el total</h3>' +
    '<div id="ajuste-total-wrap">' +
    renderRubroAjuste(
      'total',
      '💰 Total indemnización (ajuste único)',
      total,
      fechaInicioRubro,
      interesesNoCapTotal
    ) +
    '</div>' +
    '<div class="mt-2 text-xs text-gray-600">*Este ajuste es independiente y no se suma al Total actualizado por rubros para evitar doble conteo.</div>' +
    '<div class="mt-2 flex justify-end">' +
    '<button id="btnCalcularTotalSolo" class="btn" style="width:auto;padding:8px 12px">Calcular ajuste TOTAL</button>' +
    '</div>' +
    '<hr class="my-4 border-gray-300" />' +
    '</div>';

  const bloqueRubros =
    '<div id="bloque-ajustes-rubros"><h3 class="text-blue-800 font-semibold text-base mb-2">⚙️ También podés ajustar rubro por rubro</h3><div id="rubros-ajustes" class="space-y-3">' +
    rubros
      .map((r) =>
        renderRubroAjuste(
          r.key,
          r.nombre,
          r.base,
          fechaInicioRubro,
          r.intereses
        )
      )
      .join('') +
    '</div>' +
    '<div class="mt-4 p-3 bg-blue-50 rounded-md">' +
    '<p class="font-bold">Total actualizado (suma de rubros ajustados): ' +
    '<span id="totalActualizado" class="text-blue-900">' +
    formatoMonto(0) +
    '</span>' +
    '</p>' +
    '</div>' +
    '<div class="mt-3 flex gap-2 justify-end">' +
    '<button id="btnCalcularTodos" class="btn" style="width:auto;padding:8px 12px">Calcular todos</button>' +
    '<button id="btnLimpiarResultados" class="btn" style="width:auto;padding:8px 12px;background:#6b7280">Limpiar</button>' +
    '</div>' +
    '</div>';

  detalle +=
    '<div class="page-break"></div>' +
    bloqueTotal +
    '<div class="page-break"></div>' +
    bloqueRubros;

  resultadoDiv.innerHTML = detalle;
}

/* =======================  Boot / listeners ======================= */

async function bootAccidentePaso3() {
  try {
    await cargarResolucionesDesdeSheet();
    await cargarTodosIndices();

    const ibmInput = document.getElementById('ibm');
    if (ibmInput) {
      ibmInput.addEventListener('input', (e) => formatearMoneda(e.target));
      if (ibmInput.value) formatearMoneda(ibmInput);
    }

    const incInput = document.getElementById('incapacidad');
    if (incInput) {
      incInput.addEventListener('input', (e) =>
        formatearPorcentajeShift(e.target)
      );
      if (incInput.value) formatearPorcentajeShift(incInput);
    }

    const fd = document.getElementById('fechaDeclaracion');
    const fi = document.getElementById('fechaIBM');
    fd && fd.addEventListener('change', togglePanelActualizaMinimo);
    fi && fi.addEventListener('change', togglePanelActualizaMinimo);
    togglePanelActualizaMinimo();

    [
      'tasaMinimo11',
      'capMinimo11',
      'noActMinimo11',
      'tasaMinimo14_15',
      'capMinimo14_15',
      'noActMinimo14_15',
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el)
        el.addEventListener('change', () => {
          const scope = id.endsWith('11') ? '11' : '14_15';
          renderPreviewMinimoScope(scope);
        });
    });

    const btn = document.getElementById('btnCalcular');
    if (btn) btn.addEventListener('click', calcularIndemnizacion);

    document.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || typeof t.getAttribute !== 'function') return;
      const nm = t.getAttribute('name') || '';
      if (nm.startsWith('pago-monto-')) formatearMoneda(t);
    });
  } catch (error) {
    console.error('Error en boot AccidentePaso3:', error);
  }
}

// Delegación para botones de ajuste total / todos
document.addEventListener('click', (ev) => {
  const t = ev.target;
  if (!t) return;
  if (t.id === 'btnCalcularTotalSolo') {
    const box = document.getElementById('box-total');
    if (box) window.calcularAjusteRubro('total');
  }
  if (t.id === 'btnCalcularTodos') {
    document
      .querySelectorAll('[id^="box-"]:not(#box-total)')
      .forEach((box) => {
        const key = box.id.replace('box-', '');
        window.calcularAjusteRubro(key);
      });
  }
  if (t.id === 'btnLimpiarResultados') {
    document
      .querySelectorAll('[id^="res-"]')
      .forEach((d) => (d.textContent = ''));
    const totalSpan = document.getElementById('totalActualizado');
    if (totalSpan) totalSpan.textContent = formatPeso(0);
  }
});

/* =======================  Componente React  ======================= */

const extraStyles = `
.has-tooltip{position:relative;}
.has-tooltip::after{
  content:attr(data-tip);
  position:absolute;
  left:50%;
  transform:translate(-50%,-110%);
  top:-8px;
  background:#0f2f4b;
  color:#fff;
  padding:8px 10px;
  border-radius:8px;
  box-shadow:0 6px 20px rgba(15,47,75,.18);
  font-size:.85rem;
  line-height:1.25;
  white-space:normal;
  width:min(360px,90vw);
  text-align:left;
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease,transform .15s ease;
  z-index:50;
}
.has-tooltip::before{
  content:"";
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  top:-12px;
  border:6px solid transparent;
  border-top-color:#0f2f4b;
  opacity:0;
  transition:opacity .15s ease;
  z-index:50;
}
.has-tooltip:hover::after,
.has-tooltip:focus-within::after,
.has-tooltip:hover::before,
.has-tooltip:focus-within::before{
  opacity:1;
}

.ff-detalle{margin-top:10px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
.ff-detalle__title{margin:0;padding:10px 14px;background:#E6F0F7;color:#0f2f4b;font-weight:700;border-radius:12px 12px 0 0}
.ff-timeline{padding:10px 14px}
.ff-item{border-left:3px solid #0f2f4b;padding:8px 10px;margin:10px 0;background:#f9fafb;border-radius:8px}
.ff-item__head{display:flex;justify-content:space-between;align-items:center}
.ff-chip{background:#0f2f4b;color:#fff;padding:2px 8px;border-radius:999px;font-size:.8rem}
.ff-date{color:#6b7280;font-size:.85rem}
.ff-item__body{margin-top:6px}
.ff-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e5e7eb;font-size:0.85rem;}
.ff-row:last-child{border-bottom:0}
.ff-desc{color:#374151;margin-bottom:6px}
.ff-resumen{padding:10px 14px;border-top:1px solid #e5e7eb;background:#F3F8FC;border-radius:0 0 12px 12px}
.ff-total{display:flex;justify-content:space-between;margin-top:8px;padding:8px 10px;background:#DCEBF7;border-radius:8px;font-weight:800;color:#0f2f4b}
@media(max-width:640px){.ff-row span{max-width:60%}}

.ff-detalle summary {
  list-style: none;
  cursor: pointer;
}
.ff-detalle summary::-webkit-details-marker {
  display: none;
}
.ff-detalle summary::after {
  content: " +";
  font-weight: 700;
  float: right;
}
.ff-detalle[open] summary::after {
  content: " −";
}
`;

export default function AccidentePasoTres({ toolId, toolName }) {
  const { state, updateState } = useAccidenteContext();

  const {
    fechaInicio,   // del Paso 2
    fechaFin,      // del Paso 2
    montoIBM,      // del Paso 2
    resultSimple,
    resultPond,
    resultActiva,
  } = state;

  // Opciones de IBM traídas del paso 2
  const ibmOptions = useMemo(() => {
    const opts = [];

    if (montoIBM && Number(montoIBM) > 0) {
      opts.push({
        id: 'base',
        label: `IBM base (sin actualizar) – ${fmtARS(montoIBM)}`,
        value: Number(montoIBM),
      });
    }

    if (resultSimple && !resultSimple.error && resultSimple.actualizado) {
      opts.push({
        id: 'simple',
        label: `IBM por RIPTE simple – ${fmtARS(resultSimple.actualizado)}`,
        value: Number(resultSimple.actualizado),
      });
    }

    if (resultPond && !resultPond.error && resultPond.actualizado) {
      opts.push({
        id: 'ponderado',
        label: `IBM por RIPTE ponderado – ${fmtARS(resultPond.actualizado)}`,
        value: Number(resultPond.actualizado),
      });
    }

    if (resultActiva && !resultActiva.error && resultActiva.total) {
      opts.push({
        id: 'activa',
        label: `IBM + intereses (Tasa activa BNA) – ${fmtARS(resultActiva.total)}`,
        value: Number(resultActiva.total),
      });
    }

    return opts;
  }, [montoIBM, resultSimple, resultPond, resultActiva]);

  const [selectedIbmId, setSelectedIbmId] = useState(
    ibmOptions[0]?.id ?? ''
  );

  // Boot original (carga resoluciones, índices, listeners, etc.)
  useEffect(() => {
    bootAccidentePaso3();
  }, []);

    // =========================
  // Guardar en juicio – Paso 3
  // =========================
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [availableCases, setAvailableCases] = React.useState([]);
  const [casesLoading, setCasesLoading] = React.useState(false);
  const [loadCasesError, setLoadCasesError] = React.useState(null);

  const [selectedCaseId, setSelectedCaseId] = React.useState('');
  const [saveTitle, setSaveTitle] = React.useState('');
  const [saveNotes, setSaveNotes] = React.useState('');
  const [savingResult, setSavingResult] = React.useState(false);

  // Cargar juicios cuando se abre el diálogo por primera vez
  useEffect(() => {
    if (!saveDialogOpen || casesLoading || availableCases.length > 0) return;

    const loadCases = async () => {
      try {
        setCasesLoading(true);
        setLoadCasesError(null);

        const user = await User.me();
        const cases = await Case.filter({ userId: user.id }, '-createdAt');
        setAvailableCases(cases || []);
      } catch (e) {
        console.error('Error cargando juicios para guardar Paso 3:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // Helper simple de fechas (YYYY-MM-DD -> dd/mm/aaaa)
  const fmtFechaAR = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  };

  // Abrir diálogo de guardado
  const handleOpenSaveDialog = () => {
    const resultadoDiv = document.getElementById('resultado');

    if (!resultadoDiv || !resultadoDiv.textContent.trim()) {
      alert('Primero calculá la indemnización en el Paso 3 para poder guardarla en un juicio.');
      return;
    }

    const fechaAccidente3 = document.getElementById('fecha')?.value || state.fechaAccidente || '';
    const fechaFinAjusteTotal = document.getElementById('fin-total')?.value || '';

    let tituloPorDefecto = 'Indemnización LRT – Paso 3';
    if (fechaAccidente3) {
      tituloPorDefecto += ` · Accidente ${fmtFechaAR(fechaAccidente3)}`;
    }
    if (fechaFinAjusteTotal) {
      tituloPorDefecto += ` · Resultado al ${fmtFechaAR(fechaFinAjusteTotal)}`;
    }

    setSaveTitle((prev) => prev || tituloPorDefecto);
    setSaveDialogOpen(true);
  };

  // Confirmar guardado en juicio
  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    const resultadoDiv = document.getElementById('resultado');
    if (!resultadoDiv || !resultadoDiv.textContent.trim()) {
      alert('No hay cálculo para guardar.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      // --- Datos de entrada que querés guardar ---

      const fechaNacimiento = (document.getElementById('fechaNacimiento')?.value || '').trim();
      const fechaAccidentePaso3 = (document.getElementById('fecha')?.value || '').trim();

      // Edad al momento del accidente (tomamos lo mostrado en el bloque)
      const edadText = document.getElementById('resultadoEdad')?.textContent || '';
      let edadAlAccidente = null;
      const mEdad = edadText.match(/(\d+)\s*años/);
      if (mEdad) {
        edadAlAccidente = parseInt(mEdad[1], 10);
      }

// % de incapacidad (ahora el input real es "incapacidad")
const incapStr =
  (document.getElementById('incapacidad')?.value ||
    document.getElementById('porcentajeIncapacidad')?.value ||
    document.getElementById('porcIncapacidad')?.value ||
    '').trim();

      let porcentajeIncapacidad = null;
      if (incapStr) {
        const clean = incapStr
          .replace(/[^0-9,.-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const num = parseFloat(clean);
        if (!Number.isNaN(num)) {
          porcentajeIncapacidad = num;
        }
      }

      // Resolución Mínimos aplicada (tomamos los textos resumen que ya mostrás)
      const prev11 = document.getElementById('previewMinimo11')?.textContent?.trim() || '';
      const prev14 = document.getElementById('previewMinimo14_15')?.textContent?.trim() || '';
      const resolucionMinimosAplicada = [prev11, prev14].filter(Boolean).join(' | ');

      // Rubros que prosperan: usamos el bloque de ajustes por rubro
      const rubroNodes = document.querySelectorAll(
        '#rubros-ajustes .text-sm.font-semibold'
      );
      const rubrosQueProsperan = Array.from(rubroNodes)
        .map((n) => n.textContent?.trim())
        .filter(Boolean);

// Nuevo: solo guardamos el dato real del total
const fechaResultado = document.getElementById('resultadoFechaFinal')?.textContent || '';
const montoResultado = document.getElementById('resultadoMontoFinal')?.textContent || '';

const resumenFinal = `Total indemnización ${fechaResultado}: ${montoResultado}`;
      const fechaFinAjusteTotal =
        (document.getElementById('fin-total')?.value || '').trim() || '';

      // Armamos el payload de datos que se guarda en el juicio
      const payload = {
        tipo: 'indemnizacion_lrt_paso_3',
        entrada: {
          fechaNacimiento,
          fechaAccidente: fechaAccidentePaso3,
          edadAlAccidente,
          porcentajeIncapacidad,
          resolucionMinimosAplicada,
          rubrosQueProsperan,
        },
        resultado: {
          fechaResultado: fechaResultado.trim() || null,
          resumenTexto: resumenFinal
        },
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Indemnización LRT – Paso 3',
        title:
          saveTitle ||
          toolName ||
          'Indemnización LRT – Paso 3 (cálculo de indemnización)',
        notes: saveNotes,
        data: payload,
      });

      alert('✅ Resultado del Paso 3 guardado en el juicio.');
      setSaveDialogOpen(false);
    } catch (e) {
      console.error('Error guardando Paso 3 en juicio:', e);
      alert('No se pudo guardar el resultado. Intenta nuevamente.');
    } finally {
      setSavingResult(false);
    }
  };

  // Cuando cambian las opciones o el seleccionado, vuelco el IBM y las fechas en los inputs del DOM
  useEffect(() => {
    const selected = ibmOptions.find((o) => o.id === selectedIbmId) ?? ibmOptions[0];

    const ibmInput = document.getElementById('ibm');
    if (ibmInput && selected) {
      ibmInput.value = fmtARS(selected.value);
      // si tenés formateo adicional, lo podés disparar acá:
      // formatearMoneda(ibmInput);
    }

    const fechaIBMInput = document.getElementById('fechaIBM');
    if (fechaIBMInput && fechaFin) {
      // fechaFin viene en formato ISO (YYYY-MM-DD), es justo lo que espera <input type="date">
      fechaIBMInput.value = fechaFin;
    }

    const fechaAccidenteInput = document.getElementById('fecha');
    if (fechaAccidenteInput && fechaInicio) {
      fechaAccidenteInput.value = fechaInicio;
    }
  }, [ibmOptions, selectedIbmId, fechaInicio, fechaFin]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <style>{extraStyles}</style>

      <div className="bg-white p-6 md:p-7 rounded-2xl shadow border-2 border-[#0f2f4b]">
        <h1
          className="text-xl md:text-2xl font-bold mb-4 text-center"
          style={{ color: AZUL }}
        >
          Paso 3️⃣: calcular indemnización. Mínimos vigentes a la fecha deseada
        </h1>

        {/* Panel IBM desde Paso 2 */}
        {ibmOptions.length > 0 && (
          <div className="mt-2 mb-4 border border-slate-200 rounded-xl p-3 bg-slate-50/70">
            <div className="text-xs text-slate-600 mb-1">
              IBM (opcional) – valores calculados en el Paso 2
            </div>
            <select
              className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={selectedIbmId}
              onChange={(e) => setSelectedIbmId(e.target.value)}
            >
              {ibmOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="mt-2 text-[0.7rem] text-slate-500 space-y-1">
              {fechaInicio && (
                <div>
                  📅 Fecha del accidente (Paso 2):{' '}
                  <strong>{fmtDateISOtoAR(fechaInicio)}</strong>
                </div>
              )}
              {fechaFin && (
                <div>
                  📆 Fecha de actualización IBM (Paso 2):{' '}
                  <strong>{fmtDateISOtoAR(fechaFin)}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IBM manual (se mantiene tu input original, pero ahora se autocompleta) */}
        <div className="relative mt-4">
          <label className="absolute -top-3 left-3 bg-white px-1 text-xs text-slate-700">
            IBM (opcional)
          </label>
          <input
            type="text"
            id="ibm"
            placeholder="$ 0,00"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
          />
        </div>

        {/* Fecha IBM (se autocompleta con fechaFin del Paso 2) */}
        <div className="relative mt-4">
          <label className="absolute -top-3 left-3 bg-white px-1 text-xs text-slate-700">
            Fecha actualización IBM (paso 2)
          </label>
          <input
            type="date"
            id="fechaIBM"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
          />
        </div>

        {/* Fecha de nacimiento */}
        <div className="relative mt-4">
          <label className="absolute -top-3 left-3 bg-white px-1 text-xs text-slate-700">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            id="fechaNacimiento"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
            />
        </div>

        {/* Fecha del accidente / PMI (se autocompleta con fechaInicio del Paso 2) */}
        <div className="relative mt-4">
          <label className="absolute -top-3 left-3 bg-white px-1 text-xs text-slate-700">
            Fecha del accidente o PMI
          </label>
          <input
            type="date"
            id="fecha"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
          />
        </div>

        {/* Fecha resolución mínimos */}
        <div
          className="mt-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-md has-tooltip"
          data-tip="Aplica la resolucion vigente a la fecha del accidente/PMI o a la fecha declarativa de incapacidad."
        >
          <label
            htmlFor="fechaDeclaracion"
            className="block text-xs font-semibold text-blue-800 mb-1"
          >
            Fecha Resolución mínimos
          </label>
          <input
            type="date"
            id="fechaDeclaracion"
            className="w-full border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Panel de actualización de mínimos */}
        <div
          id="panelActualizaMinimo"
          className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-md hidden"
        >
          <div className="text-sm font-semibold text-blue-900 mb-2">
            Actualizar mínimos legales desde "Fecha resolución" → "Fecha
            actualización IBM"
          </div>

          {/* Art. 11 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end mb-2">
            <div>
              <label className="block text-xs text-gray-700 mb-1">
                Tasa mínimo (Art. 11)
              </label>
              <select
                id="tasaMinimo11"
                className="w-full border rounded px-2 py-2"
              >
                <option value="activa">Tasa activa BNA</option>
                <option value="pasiva">Tasa pasiva BCRA</option>
                <option value="ripte">RIPTE</option>
                <option value="RIPTE Res. 332/23">RIPTE (Res. 332/23)</option>
                <option value="smvm">SMVM</option>
                <option value="inflacion">IPC Nivel General</option>
                <option value="cer">CER</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="noActMinimo11" defaultChecked /> No
              actualizar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="capMinimo11" /> Capitalizar intereses
            </label>
          </div>
          <div
            id="previewMinimo11"
            className="mt-1 text-xs text-blue-900"
          ></div>

          <hr className="my-3" />

          {/* Art. 14/15 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end mb-2">
            <div>
              <label className="block text-xs text-gray-700 mb-1">
                Tasa mínimo (Art. 14/15)
              </label>
              <select
                id="tasaMinimo14_15"
                className="w-full border rounded px-2 py-2"
              >
                <option value="activa">Tasa activa BNA</option>
                <option value="pasiva">Tasa pasiva BCRA</option>
                <option value="ripte">RIPTE</option>
                <option value="RIPTE Res. 332/23">RIPTE (Res. 332/23)</option>
                <option value="smvm">SMVM</option>
                <option value="inflacion">IPC Nivel General</option>
                <option value="cer">CER</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="noActMinimo14_15" defaultChecked /> No
              actualizar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="capMinimo14_15" /> Capitalizar
              intereses
            </label>
          </div>
          <div
            id="previewMinimo14_15"
            className="mt-1 text-xs text-blue-900"
          ></div>

          <div className="mt-2 text-xs text-gray-600">
            Tip: podés elegir tasas distintas (p.ej., Activa para art. 14/15 y
            CER para art. 11).
          </div>
        </div>

        {/* Porcentaje incapacidad */}
        <div className="relative mt-4">
          <label className="absolute -top-3 left-3 bg-white px-1 text-xs text-slate-700">
            Porcentaje de incapacidad
          </label>
          <input
            type="text"
            id="incapacidad"
            placeholder="Ej: 15, 100"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
          />
        </div>

        {/* Checkboxes muerte / in itinere */}
        <div className="flex flex-wrap gap-4 items-center mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" id="muerte" /> Fallecimiento
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" id="itinere" /> Accidente in itinere
          </label>
        </div>

{/* Botón Calcular + Guardar en juicio */}
<Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
  <div className="mt-5 flex flex-col gap-2">

    {/* Botón calcular (misma lógica, solo arriba) */}
    <button
      id="btnCalcular"
      className="w-full bg-[#0f2f4b] hover:bg-[#0c243b] text-white font-semibold py-2.5 rounded-lg transition-transform active:scale-[0.98]"
    >
      Calcular
    </button>

    {/* Botón guardar en juicio, debajo del Calcular */}
    <DialogTrigger asChild>
      <button
        type="button"
        className="w-full border border-emerald-600 text-emerald-700 font-semibold py-2.5 rounded-lg hover:bg-emerald-50 transition"
        onClick={handleOpenSaveDialog}
      >
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-4 w-4" />
          Guardar en juicio
        </div>
      </button>
    </DialogTrigger>

  </div>

  {/* ----------------- DIALOG ----------------- */}
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Guardar cálculo del Paso 3 en un juicio</DialogTitle>
      <DialogDescription>
        Seleccioná el juicio y, si querés, agregá un título y notas.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">

      {/* Select de juicios */}
      <div className="space-y-1">
        <Label>Juicio</Label>
        <Select
          value={selectedCaseId}
          onValueChange={setSelectedCaseId}
          disabled={casesLoading || availableCases.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                casesLoading
                  ? 'Cargando juicios...'
                  : availableCases.length === 0
                  ? 'No se encontraron juicios'
                  : 'Seleccioná un juicio'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableCases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title || 'Sin título'}
                {c.caseNumber ? ` · ${c.caseNumber}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loadCasesError && (
          <p className="text-xs text-red-600 mt-1">{loadCasesError}</p>
        )}
      </div>

      {/* Título */}
      <div className="space-y-1">
        <Label>Título del cálculo</Label>
        <Input
          value={saveTitle}
          onChange={(e) => setSaveTitle(e.target.value)}
          placeholder="Ej: Indemnización LRT – Paso 3"
        />
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <Label>Notas (opcional)</Label>
        <Textarea
          value={saveNotes}
          onChange={(e) => setSaveNotes(e.target.value)}
          placeholder="Notas internas del caso..."
          rows={3}
        />
      </div>

      {/* Resumen */}
      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
        <p className="font-semibold mb-1">Resumen a guardar</p>

<p>
  <span className="font-semibold">Fecha nacimiento:</span>{' '}
  {formatDMY(document.getElementById('fechaNacimiento')?.value)}
</p>

<p>
  <span className="font-semibold">Fecha accidente:</span>{' '}
  {formatDMY(document.getElementById('fecha')?.value)}
</p>

        <p>
          <span className="font-semibold">Edad:</span>{' '}
          {document.getElementById('resultadoEdad')?.textContent || '—'}
        </p>

        <p>
          <span className="font-semibold">% incapacidad:</span>{' '}
          {document.getElementById('incapacidad')?.value ||
            document.getElementById('porcentajeIncapacidad')?.value ||
            document.getElementById('porcIncapacidad')?.value ||
            '—'}
        </p>

        <p className="mt-1">
          <span className="font-semibold">Resultado total:</span>{' '}
          {document.getElementById('resultadoMontoFinal')?.textContent?.trim() ||
            '—'}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
        <Button onClick={handleConfirmSave} disabled={savingResult || !selectedCaseId}>
          {savingResult ? 'Guardando…' : 'Guardar en juicio'}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

        {/* Resultado */}
        <div id="resultado" className="mt-6"></div>
      </div>
    </div>
  );
}