import React, { useEffect, useState } from 'react';
import { FinancialData } from '@/entities/FinancialData';
import { User } from '@/entities/User';
import { Case } from '@/entities/Case';
import { CalculatorResult } from '@/entities/CalculatorResult';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// ⚠️ Ajustá este nombre al que uses en tu base
const INHABILES_CATEGORY = 'inhabiles';

// ----------------- ESTADO GLOBAL SIMPLE (no React state) -----------------
let feriados = [];          // inhábiles base (desde FinancialData)
let inhabilesManuales = []; // por ahora no usamos esta lista, pero la mantengo
let inhabilesUsuario = [];  // días inhábiles marcados por el usuario
let fechasClave = {};
let rehabilitados = new Set(); // fechas ISO forzadas a hábil
let __lastCalendBase = null;
let __initialized = false;

// ----------------- HELPERS FECHA -----------------
function crearFechaSegura(ano, mes, dia) {
  return new Date(ano, mes - 1, dia, 12);
}

function formatDate(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function parseIsoLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return crearFechaSegura(y, m, d);
}

// DD/MM/YYYY -> YYYY-MM-DD
function parseDMYtoISO(value) {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yy = m[3];
  return `${yy}-${mm}-${dd}`;
}

// ----------------- ESTADO INHÁBILES -----------------
function esInhabilBaseISO(iso) {
  return (
    feriados.includes(iso) ||
    inhabilesManuales.includes(iso) ||
    inhabilesUsuario.includes(iso)
  );
}
function esHabilForzadoISO(iso) {
  return rehabilitados.has(iso);
}
function esInhabilRealISO(iso) {
  if (rehabilitados.has(iso)) return false;
  return esInhabilBaseISO(iso);
}

function marcarInhabil(iso) {
  rehabilitados.delete(iso);
  if (!esInhabilBaseISO(iso)) inhabilesUsuario.push(iso);
}

function marcarHabil(iso) {
  const estabaEnUsuario = inhabilesUsuario.includes(iso);
  inhabilesUsuario = inhabilesUsuario.filter((d) => d !== iso);

  if (!estabaEnUsuario && esInhabilBaseISO(iso)) {
    rehabilitados.add(iso);
  } else {
    rehabilitados.delete(iso);
  }
}

function esFeriadoDate(f) {
  const iso = formatDate(f);
  if (rehabilitados.has(iso)) return false;
  return (
    feriados.includes(iso) ||
    inhabilesManuales.includes(iso) ||
    inhabilesUsuario.includes(iso)
  );
}

function sumarHabiles(fecha, dias) {
  let f = new Date(fecha);
  let c = 0;
  while (c < dias) {
    f.setDate(f.getDate() + 1);
    if (f.getDay() && f.getDay() < 6 && !esFeriadoDate(f)) c++;
  }
  return f;
}

// ----------------- CONFIG DE FUEROS / PLAZOS -----------------
const noRequiereFirmezaPorFuero = {
  'FUERO LABORAL': [
    'CAUTELAR',
    'TRANCE Y REMATE C/ EXCEPCIONES',
    'TRANCE Y REMATE S/ EXCEPCIONES',
    'LEVANTAMIENTO DE EMBARGO',
    'SUSTITUCIONES DE EMBARGO',
    'AMPARO',
  ],
  'FUERO CIVIL Y COMERCIAL': ['CAUTELAR'],
  'FUERO DOCUMENTOS Y LOCACIONES': [
    'ACLARATORIA',
    'CAUTELAR',
    'HOMOLOGACIÓN',
    'AMPARO',
  ],
};

const plazosPorFuero = {
  'FUERO LABORAL': {
    CAUTELAR: 5,
    ACLARATORIA: 10,
    AMPARO: 2,
    'BENEFICIO PARA LITIGAR SIN GASTOS': 15,
    CADUCIDADES: 15,
    'CITACIONES DE TERCEROS': 15,
    'EXCEPCION PREVIAS': 15,
    HONORARIOS: 15,
    'IMPUGNACIONES DE PLANILLA': 5,
    INCIDENTES: 15,
    'INTEGRACIONES DE LITIS': 10,
    'LEVANTAMIENTO DE EMBARGO': 15,
    NULIDADES: 15,
    OPOSICIONES: 15,
    RECONSTRUCCIONES: 10,
    REVOCATORIAS: 10,
    SUMARISIMOS: 10,
    'SUSTITUCIONES DE EMBARGO': 5,
    'TERCERÍAS': 15,
    'TRANCE Y REMATE C/ EXCEPCIONES': 8,
    'TRANCE Y REMATE S/ EXCEPCIONES': 3,
    DESALOJO: 10,
    'MEDIDAS PREPARATORIAS': 10,
    DEFINITIVAS: 45,
    OTRAS: 0,
  },
  'FUERO CIVIL Y COMERCIAL': {
    CAUTELAR: 10,
    REVOCATORIA: 5,
    ACLARATORIA: 5,
    NULIDAD: 10,
    CADUCIDAD: 10,
    PLANILLA: 10,
    COMPETENCIA: 10,
    BENEFICIO: 10,
    'CITACIÓN A TERCERO': 10,
    'OPOSICIÓN A LA EJECUCIÓN PROVISIONAL': 15,
    'CONEXIDAD / ACUMULACIÓN': 10,
    'HECHO NUEVO': 10,
    DESISTIMIENTO: 10,
    HONORARIOS: 10,
    ASTREINTES: 10,
    INCONSTITUCIONALIDAD: 10,
    OTRAS: 0,
  },
  'FUERO FAMILIA': { OTRAS: 0 },
  'FUERO CONTENCIOSO ADMINISTRATIVO': { OTRAS: 0 },
  'FUERO DOCUMENTOS Y LOCACIONES': {
    ACLARATORIA: 5,
    CAUTELAR: 10,
    HOMOLOGACIÓN: 10,
    AMPARO: 10,
    INCIDENTE: 10,
    CADUCIDAD: 10,
    INCONSTITUCIONALIDAD: 10,
    REVOCATORIA: 5,
    'FONDO ORDINARIO': 60,
    'ORDINARIO EXCEPCIONES PREVIAS': 30,
    SUMARIO: 45,
    DESALOJO: 45,
    CONSUMO: 45,
    'PRESCRIPCIÓN EXCEPCIÓN PREVIA': 30,
    'PRESCRIPCIÓN ACCIÓN': 10,
    'EJECUTIVO MONITORIO': 10,
    'EJECUTIVO CON EXCEPCIONES': 8,
    'EJECUTIVO SIN EXCEPCIONES': 3,
    'EJECUCIÓN PRENDARIA': 3,
    'EJECUCIÓN DE ASTREINTES': 10,
    'IMPUGNACIÓN DE PLANILLA': 10,
    HONORARIOS: 10,
    SUBASTA: 10,
    OTRAS: 0,
  },
};

const FUEROS = [
  'FUERO LABORAL',
  'FUERO CIVIL Y COMERCIAL',
  'FUERO FAMILIA',
  'FUERO CONTENCIOSO ADMINISTRATIVO',
  'FUERO DOCUMENTOS Y LOCACIONES',
];

const FUERO_LOGOS = {
  'FUERO LABORAL': 'https://imgur.com/gonQzkk.png',
  'FUERO CIVIL Y COMERCIAL': 'https://imgur.com/x52CSzZ.png',
  'FUERO FAMILIA': 'https://imgur.com/XHcn71H.png',
  'FUERO CONTENCIOSO ADMINISTRATIVO': 'https://imgur.com/7tHCmEC.png',
  'FUERO DOCUMENTOS Y LOCACIONES': 'https://imgur.com/XtKCNFC.png',
};

// ----------------- UTILIDADES VARIAS -----------------
function tipoRequiereFirmeza(fuero, tipo) {
  const noReq = noRequiereFirmezaPorFuero[fuero] || [];
  return !noReq.includes(tipo);
}

function setActive(containerId, value) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.querySelectorAll('[data-value]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-value') === value);
  });
}

function debounce(fn, ms = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ----------------- RENDER MINI PICKER -----------------
function renderMiniPicker(baseDate) {
  const cont = document.getElementById('miniPicker');
  if (!cont) return;

  const d0 = crearFechaSegura(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  const month = d0.getMonth();
  const year = d0.getFullYear();
  const last = new Date(year, month + 1, 0).getDate();
  const startDow = d0.getDay();

  const input = document.getElementById('fechaProveido');
  const selected = input && input.value ? parseIsoLocal(input.value) : null;
  const isSelected = (y, m, d) =>
    selected &&
    y === selected.getFullYear() &&
    m === selected.getMonth() &&
    d === selected.getDate();

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  let html = `
    <header>
      <button type="button" aria-label="Mes anterior" id="mpPrev">‹</button>
      <div>${meses[month]} ${year}</div>
      <button type="button" aria-label="Mes siguiente" id="mpNext">›</button>
    </header>
    <table>
      <thead><tr><th>Dom</th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th></tr></thead>
      <tbody>
        <tr>`;

  for (let i = 0; i < startDow; i++) html += `<td></td>`;

  for (let d = 1; d <= last; d++) {
    const f = crearFechaSegura(year, month + 1, d);
    const dow = f.getDay();
    const iso = formatDate(f);

    const classes = ['day'];
    if (dow === 0 || dow === 6) classes.push('weekend');
    if (isSelected(year, month, d)) classes.push('selected');

    let tit = '';
    if (esHabilForzadoISO(iso)) {
      classes.push('rehabil');
      tit = 'Hábil (forzado)';
    } else {
      if (feriados.includes(iso)) {
        classes.push('feriado');
        tit = 'Feriado';
      } else if (inhabilesManuales.includes(iso)) {
        classes.push('inhabil');
        tit = 'Inhábil judicial';
      } else if (inhabilesUsuario.includes(iso)) {
        classes.push('inhabilUsuario');
        tit = 'Inhábil usuario';
      }
    }

    const titleAttr = tit ? ` title="${tit}"` : '';
    html += `<td><button type="button" class="${classes.join(
      ' '
    )}" data-iso="${iso}"${titleAttr}>${d}</button></td>`;

    if (dow === 6 && d < last) html += `</tr><tr>`;
  }

  const lastDow = new Date(year, month, last).getDay();
  for (let i = lastDow; i < 6; i++) html += `<td></td>`;
  html += `</tr></tbody></table>`;

  cont.innerHTML = html;

  document.getElementById('mpPrev').onclick = () =>
    renderMiniPicker(new Date(year, month - 1, 1));
  document.getElementById('mpNext').onclick = () =>
    renderMiniPicker(new Date(year, month + 1, 1));

  cont.querySelectorAll('.day').forEach((btn) => {
    const iso = btn.getAttribute('data-iso');
    btn.addEventListener('click', () => {
      const dLocal = parseIsoLocal(iso);
      const inp = document.getElementById('fechaProveido');
      if (!inp) return;
      inp.value = formatDate(dLocal);
      renderMiniPicker(dLocal);
      safeRecalc();
    });
  });
}

// ----------------- CALENDARIO GRANDE -----------------
function generarCalendario(fecha) {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const mes = fecha.getMonth();
  const anio = fecha.getFullYear();
  const inicio = new Date(anio, mes, 1);
  const fin = new Date(anio, mes + 1, 0);

  let tabla = `<h3>${meses[mes]} ${anio}</h3><table><tr><th>Dom</th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th></tr><tr>`;
  for (let i = 0; i < inicio.getDay(); i++) tabla += '<td></td>';

  for (let d = 1; d <= fin.getDate(); d++) {
    const f = new Date(anio, mes, d);
    const iso = formatDate(f);
    const isRehab = esHabilForzadoISO(iso);
    let cls = '';
    let tit = '';

    if (!isRehab) {
      if (feriados.includes(iso)) {
        cls = 'feriado';
        tit = 'Feriado';
      } else if (inhabilesManuales.includes(iso)) {
        cls = 'inhabil';
        tit = 'Inhábil judicial';
      } else if (inhabilesUsuario.includes(iso)) {
        cls = 'inhabilUsuario';
        tit = 'Inhábil usuario';
      } else if (iso === fechasClave.notificacion) {
        cls = 'notificacion';
        tit = 'Notificación';
      } else if (iso === fechasClave.firmeza) {
        cls = 'firmeza';
        tit = 'Firmeza';
      } else if (iso === fechasClave.inicioSentencia) {
        cls = 'inicioSentencia';
        tit = 'Inicio del plazo';
      } else if (iso === fechasClave.vencimiento) {
        cls = 'vencimiento';
        tit = 'Vencimiento';
      }
    } else {
      cls = 'rehabil';
      tit = 'Hábil (forzado)';
    }

    const fs = f.getDay() === 0 || f.getDay() === 6 ? ' finDeSemana' : '';
    tabla += `<td class="${cls}${fs}" data-iso="${iso}" title="${tit}">${d}</td>`;
    if (f.getDay() === 6) tabla += '</tr><tr>';
  }
  tabla += '</tr></table>';
  return tabla;
}

function renderizarCalendarios(baseDate) {
  __lastCalendBase = baseDate;
  const cont = document.getElementById('calendarios');
  if (!cont) return;
  cont.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    cont.innerHTML += generarCalendario(dt);
  }
}

// ----------------- UI AUX: FUERO / TIPOS / INHÁBILES -----------------
function mostrarListaInhabiles() {
  const cont = document.getElementById('listaInhabiles');
  if (!cont) return;
  if (!inhabilesUsuario.length) {
    cont.innerHTML = '<em>No se cargaron días inhábiles.</em>';
    return;
  }
  cont.innerHTML =
    '<ul>' +
    inhabilesUsuario
      .map(
        (fecha) =>
          `<li>${fecha} <button type="button" onclick="window.__quitarInhabil && window.__quitarInhabil('${fecha}')">✖</button></li>`
      )
      .join('') +
    '</ul>';
}

function renderFueroButtons() {
  const cont = document.getElementById('fueroGroup');
  const sel = document.getElementById('fuero');
  if (!cont || !sel) return;

  const current = sel.value || FUEROS[0];

  cont.innerHTML = FUEROS.map((f) => {
    const short = f.replace('FUERO ', '');
    const logo = FUERO_LOGOS[f] || '';
    return `
      <a href="" class="fuero-card ${f === current ? 'active' : ''}" data-value="${f}">
        <div class="fuero-logo">${logo ? `<img src="${logo}" alt="${short}">` : ''}</div>
        <div class="fuero-title">${short}</div>
        <div class="fuero-sub">Seleccionar</div>
      </a>
    `;
  }).join('');

  cont.querySelectorAll('.fuero-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const v = card.getAttribute('data-value');
      if (sel.value !== v) {
        sel.value = v;
        populateTipos();
      }
      setActive('fueroGroup', v);
      renderTipoButtons();
    });
  });
}

function renderTipoButtons() {
  const cont = document.getElementById('tipoGroup');
  const tipoSel = document.getElementById('tipoSentencia');
  if (!cont || !tipoSel) return;

  if (!tipoSel.options.length) populateTipos();

  const opciones = Array.from(tipoSel.options).map((o) => o.value);
  const current = tipoSel.value || (opciones[0] || '');

  cont.innerHTML = opciones
    .map(
      (t) =>
        `<button type="button" class="btn-option ${
          t === current ? 'active' : ''
        }" data-value="${t}">${t}</button>`
    )
    .join('');

  cont.querySelectorAll('.btn-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value');
      if (tipoSel.value !== v) {
        tipoSel.value = v;
        toggleManualInput();
      }
      setActive('tipoGroup', v);
    });
  });

  actualizarLabelPlazo();
}

function populateTipos() {
  const fueroEl = document.getElementById('fuero');
  const sel = document.getElementById('tipoSentencia');
  if (!fueroEl || !sel) return;
  const fuero = fueroEl.value;

  sel.innerHTML = '';
  Object.keys(plazosPorFuero[fuero]).forEach((tipo) => {
    const o = document.createElement('option');
    o.value = tipo;
    o.textContent = tipo;
    sel.appendChild(o);
  });
  toggleManualInput();
}

function actualizarLabelPlazo() {
  const fueroEl = document.getElementById('fuero');
  const tipoEl = document.getElementById('tipoSentencia');
  const lbl = document.getElementById('diasPlazoLabel');
  const ayuda = document.getElementById('ayudaPlazo');
  if (!fueroEl || !tipoEl || !lbl || !ayuda) return;

  const fuero = fueroEl.value;
  const tipo = tipoEl.value;

  if (tipo === 'OTRAS') {
    const v = parseInt(
      document.getElementById('diasManual')?.value || '0',
      10
    ) || 0;
    lbl.textContent = v;
    ayuda.textContent = 'Ingresá manualmente los días hábiles para este caso.';
  } else {
    const dias = plazosPorFuero[fuero][tipo] || 0;
    lbl.textContent = dias;
    ayuda.textContent = 'Valor predefinido según fuero y tipo elegido.';
  }
  safeRecalc();
}

function toggleManualInput() {
  const fueroEl = document.getElementById('fuero');
  const tipoEl = document.getElementById('tipoSentencia');
  const inputManual = document.getElementById('inputManual');
  const chk = document.getElementById('esperarFirmeza');
  const info = document.getElementById('infoFirmeza');
  const df = document.getElementById('diasFirmeza');

  if (!fueroEl || !tipoEl || !inputManual || !chk || !info || !df) return;
  const fuero = fueroEl.value;
  const tipo = tipoEl.value;
  const esOtras = tipo === 'OTRAS';

  inputManual.style.display = esOtras ? 'block' : 'none';

  const requierePorDefecto = esOtras ? chk.checked : tipoRequiereFirmeza(fuero, tipo);
  chk.checked = requierePorDefecto;
  info.textContent = requierePorDefecto ? 'Requiere firmeza.' : 'No requiere firmeza.';
  df.disabled = false;
  df.value = requierePorDefecto ? 5 : 0;

  actualizarLabelPlazo();
  safeRecalc();
}

function updateFirmeza() {
  const chk = document.getElementById('esperarFirmeza');
  const df = document.getElementById('diasFirmeza');
  const info = document.getElementById('infoFirmeza');
  if (!chk || !df || !info) return;

  const on = chk.checked;
  if (!on) df.value = 0;
  info.textContent = on ? 'Requiere firmeza.' : 'No requiere firmeza.';
  safeRecalc();
}

function syncFirmezaCheckbox() {
  const df = document.getElementById('diasFirmeza');
  const chk = document.getElementById('esperarFirmeza');
  const info = document.getElementById('infoFirmeza');
  if (!df || !chk || !info) return;

  const dias = parseInt(df.value || '0', 10) || 0;
  chk.checked = dias > 0;
  info.textContent = dias > 0 ? 'Requiere firmeza.' : 'No requiere firmeza.';
  safeRecalc();
}

function quitarInhabil(f) {
  inhabilesUsuario = inhabilesUsuario.filter((x) => x !== f);
  mostrarListaInhabiles();
  const v = document.getElementById('fechaProveido')?.value;
  if (v) renderMiniPicker(parseIsoLocal(v));
  safeRecalc();
}

// ----------------- CÁLCULO PRINCIPAL -----------------
function calcularPlazo() {
  const inpVal = document.getElementById('fechaProveido')?.value;
  if (!inpVal) {
    alert('Ingresa fecha válida.');
    return;
  }
  const [y, m, d] = inpVal.split('-');
  const proveido = crearFechaSegura(+y, +m, +d);

  const fuero = document.getElementById('fuero')?.value;
  const tipo = document.getElementById('tipoSentencia')?.value;
  if (!fuero || !tipo) return;

  let dias = plazosPorFuero[fuero][tipo] || 0;
  if (tipo === 'OTRAS') {
    const v = parseInt(
      document.getElementById('diasManual')?.value || '0',
      10
    ) || 0;
    if (v <= 0) {
      alert("Ingresa días hábiles para 'OTRAS'.");
      return;
    }
    dias = v;
  }

  const noti = sumarHabiles(proveido, 1);
  const inicioBase = sumarHabiles(proveido, 2);

  const userChecked = document.getElementById('esperarFirmeza')?.checked;
  const defaultRequires =
    tipo === 'OTRAS'
      ? userChecked
      : tipoRequiereFirmeza(fuero, tipo);
  const requiere = userChecked || defaultRequires;

  const diasFirm =
    parseInt(
      document.getElementById('diasFirmeza')?.value || '0',
      10
    ) || 0;
  const firmeza = requiere ? sumarHabiles(inicioBase, diasFirm) : null;
  const inicioSent = requiere ? sumarHabiles(firmeza, 0) : inicioBase;

  let venc = sumarHabiles(inicioSent, dias);
  let intent = 0;
  while (
    (venc.getDay() === 0 || venc.getDay() === 6 || esFeriadoDate(venc)) &&
    intent < 30
  ) {
    venc.setDate(venc.getDate() + 1);
    intent++;
  }

  fechasClave = {
    notificacion: formatDate(noti),
    firmeza: firmeza ? formatDate(firmeza) : null,
    inicioSentencia: formatDate(inicioSent),
    vencimiento: formatDate(venc),
  };

  const resEl = document.getElementById('resultado');
  if (!resEl) return;

  let res = `<strong>Resultados:</strong><br>
    Fecha de puesta de notificación: ${noti.toLocaleDateString()}<br>
    Inicio del plazo para dictar sentencia: ${inicioBase.toLocaleDateString()}<br>`;
  if (firmeza)
    res += `Firmeza del proveído: ${firmeza.toLocaleDateString()}<br>`;
  res += `Inicio sentencia: ${inicioSent.toLocaleDateString()}<br>
    <strong>Fecha de vencimiento: ${venc.toLocaleDateString()}</strong>`;

  resEl.innerHTML = res;
  resEl.style.display = 'block';

  const ley = document.querySelector('.leyenda');
  if (ley) ley.style.display = 'block';
  const cal = document.getElementById('calendarios');
  if (cal) cal.style.display = 'block';
  const obs = document.getElementById('obsCalendario');
  if (obs) obs.style.display = 'block';

  renderizarCalendarios(proveido);
}

const safeRecalc = debounce(() => {
  const inp = document.getElementById('fechaProveido')?.value;
  if (!inp) return;
  try {
    calcularPlazo();
  } catch (e) {
    console.warn('Recalc omitido:', e);
  }
}, 150);

// ----------------- CARGA INHÁBILES DESDE FINANCIALDATA -----------------
async function loadInhabilesFromFinancialData() {
  try {
    const results = await FinancialData.filter(
      { category: INHABILES_CATEGORY, isActive: true },
      '-lastSync',
      1
    );
    if (!results || results.length === 0) {
      console.warn('No se encontraron inhábiles en FinancialData');
      feriados = [];
      return;
    }

    const record = results[0];
    const out = [];

    if (record.data && Array.isArray(record.data)) {
      for (const row of record.data) {
        if (!row || !row.length) continue;
        const raw = row[0];
        const iso = parseDMYtoISO(raw);
        if (iso) out.push(iso);
      }
    }

    feriados = Array.from(new Set(out)).sort();

    // refresco de UI si ya están los elementos
    mostrarListaInhabiles();
    const v = document.getElementById('fechaProveido')?.value;
    if (v) {
      renderMiniPicker(parseIsoLocal(v));
    }
    safeRecalc();
    console.log(`Inhábiles cargados desde FinancialData (${feriados.length})`);
  } catch (e) {
    console.error('Error cargando inhábiles desde FinancialData:', e);
    feriados = [];
  }
}

// ----------------- INIT (llamado una sola vez) -----------------
async function initPlazosSentencias() {
  if (__initialized) return;
  __initialized = true;

  // Exponer función para botón "✖" de lista de inhábiles
  window.__quitarInhabil = quitarInhabil;

  await loadInhabilesFromFinancialData();

  mostrarListaInhabiles();
  populateTipos();
  renderFueroButtons();
  renderTipoButtons(); // 👈 agrega esto

  const inp = document.getElementById('fechaProveido');
  const hoy = new Date();
  if (inp) {
    renderMiniPicker(inp.value ? parseIsoLocal(inp.value) : hoy);
    inp.addEventListener('change', () => {
      if (inp.value) renderMiniPicker(parseIsoLocal(inp.value));
      safeRecalc();
    });
  }

  const btnAdd = document.getElementById('btnAgregarInhabil');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const ip = document.getElementById('inhabilInput');
      if (!ip || !ip.value) return;
      if (!inhabilesUsuario.includes(ip.value)) inhabilesUsuario.push(ip.value);
      ip.value = '';
      mostrarListaInhabiles();
      const adv = document.getElementById('advertenciaRecalculo');
      if (adv)
        adv.textContent =
          '⚠ Recuerda recalcular los plazos para aplicar los cambios';
      const v = document.getElementById('fechaProveido')?.value;
      if (v) renderMiniPicker(parseIsoLocal(v));
      safeRecalc();
    });
  }

  const diasFirmEl = document.getElementById('diasFirmeza');
  if (diasFirmEl) {
    diasFirmEl.addEventListener('input', syncFirmezaCheckbox);
  }
  const chkFirmEl = document.getElementById('esperarFirmeza');
  if (chkFirmEl) {
    chkFirmEl.addEventListener('change', updateFirmeza);
  }

  const cont = document.getElementById('calendarios');
  if (cont) {
    cont.addEventListener('click', (e) => {
      const td = e.target.closest('td[data-iso]');
      if (!td) return;
      const iso = td.getAttribute('data-iso');

      const esInhabilVisual =
        td.classList.contains('feriado') ||
        td.classList.contains('inhabil') ||
        td.classList.contains('inhabilUsuario');

      if (esInhabilVisual) {
        marcarHabil(iso);
      } else {
        marcarInhabil(iso);
      }

      mostrarListaInhabiles();
      if (__lastCalendBase) renderizarCalendarios(__lastCalendBase);
      safeRecalc();
    });
  }
}

// ----------------- COMPONENTE REACT -----------------
export default function CalculadoraPlazosSentencias({ toolId, toolName }) {
  // Init de la herramienta (mini calendario, feriados, etc.)
  useEffect(() => {
    initPlazosSentencias();
  }, []);

  // ======== ESTADO: Guardar en juicio ========
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // Cargar juicios cuando se abre el diálogo
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
        console.error('Error cargando juicios para guardar vencimiento:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // Abrir diálogo: verifica que haya cálculo
  const handleOpenSaveDialog = () => {
    const fueroEl = document.getElementById('fuero');
    const tipoEl = document.getElementById('tipoSentencia');
    const fechaProvEl = document.getElementById('fechaProveido');

    if (!fueroEl || !tipoEl || !fechaProvEl || !fechaProvEl.value || !fechasClave?.vencimiento) {
      alert('Primero calculá el plazo (con fuero, tipo y fecha de proveído) para poder guardarlo en un juicio.');
      return;
    }

    const fueroRaw = fueroEl.value || '';
    const fueroLimpio = fueroRaw.replace('FUERO ', '');
    const tipo = tipoEl.value || '';
    const defaultTitle =
      saveTitle ||
      `Vencimiento ${fueroLimpio} – ${tipo}`;

    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  // Confirmar guardado
  const handleConfirmSave = async () => {
    const fueroEl = document.getElementById('fuero');
    const tipoEl = document.getElementById('tipoSentencia');
    const fechaProvEl = document.getElementById('fechaProveido');

    if (!fueroEl || !tipoEl || !fechaProvEl || !fechaProvEl.value || !fechasClave?.vencimiento) {
      alert('Faltan datos para guardar (fuero, tipo, proveído o vencimiento).');
      return;
    }

    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const fuero = fueroEl.value;
      const tipoSentencia = tipoEl.value;
      const fechaProveidoISO = fechaProvEl.value;          // YYYY-MM-DD
      const fechaVencimientoISO = fechasClave.vencimiento; // YYYY-MM-DD

      const payload = {
        tipo: 'plazo_sentencia',
        entrada: {
          fuero,
          tipoSentencia,
          fechaProveido: fechaProveidoISO,
        },
        resultado: {
          fechaVencimiento: fechaVencimientoISO,
          fechasClave, // guardamos todo por si después lo usás en el detalle
        },
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId: toolId || 'calculadora_plazos_sentencias',
        toolName: toolName || 'Cálculo de plazos de sentencia',
        title: saveTitle || toolName || 'Registro de vencimiento',
        notes: saveNotes,
        data: payload,
      });

      alert('✅ Vencimiento guardado en el juicio.');
      setSaveDialogOpen(false);
    } catch (e) {
      console.error('Error guardando vencimiento en juicio:', e);
      alert('No se pudo guardar el resultado. Intenta nuevamente.');
    } finally {
      setSavingResult(false);
    }
  };

  const css = `
    :root{ --azul:#0f2f4b; --cel:#5EA6D7; --borde:#dbe3ea; }

    .visually-hidden-select{
      position:absolute !important; left:-9999px !important; width:1px !important; height:1px !important; overflow:hidden !important;
    }

    input[type="date"], input[type="text"], input[type="number"], select{
      width:100%; max-width:400px; padding:10px; margin-top:4px; font-size:1em;
      border:1px solid #ccc; border-radius:8px; box-sizing:border-box;
    }

    .calc-button{
      display:block; width:100%; margin:1.5em 0; padding:.75em 1.5em;
      font-size:1.05rem; font-weight:700; background:var(--azul); color:#fff;
      border:2px solid var(--azul); border-radius:10px;
      box-shadow:0 4px 10px rgba(0,0,0,.12);
      transition:background .2s, transform .2s, box-shadow .2s;
    }
    .calc-button:hover{ background:#17324e; transform:translateY(-2px); box-shadow:0 6px 14px rgba(0,0,0,.2); }

    .dias-plazo{
      margin:1rem 0; padding:1rem; background:#eef5fa;
      border-left:6px solid var(--azul); border-radius:8px; width:100%;
      box-sizing:border-box;
    }
    .resultado{
      display:none; margin-top:1.5rem; background:#eef5fa; padding:1rem;
      border-left:6px solid var(--azul); border-radius:8px;
    }

    table{ border-collapse:collapse; width:100%; margin-bottom:2rem; font-size:.95em; }
    th,td{ border:1px solid #dee2e6; padding:8px; text-align:center; position:relative; }
    .finDeSemana{ background:#eee; }
    .feriado { background:#f88; color:#fff; }
    .inhabil { background:#88c; color:#fff; }
    .inhabilUsuario { background:#d4b3ff; color:#000; }
    .notificacion { background:#cce5ff; }
    .firmeza { background:#fff3cd; }
    .inicioSentencia { background:#d4edda; }
    .vencimiento { background:#0f2f4b; color:#fff; }

    .leyenda{ display:none; margin-top:1rem; }
    .leyenda span{
      display:inline-block; padding:6px 12px; margin:8px 12px 0 0;
      border-radius:12px; font-weight:600; line-height:1;
    }
    #calendarios{ display:none; }

    .section-title{ text-align:center; font-weight:800; letter-spacing:.02em; margin:.25rem 0 .75rem 0; }
    .section-band{ background:#FFF; padding:14px 18px; margin: 1.5rem 0 1rem 0; }

    .fuero-grid{ display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); margin:.5rem 0 1.25rem 0; }
    .fuero-card{
      display:block; text-decoration:none; color:var(--azul); background:#fff; border:1px solid var(--borde);
      border-radius:16px; padding:14px 12px; box-shadow:0 2px 10px rgba(0,0,0,.06);
      transition:transform .15s, box-shadow .15s, border-color .15s;
    }
    .fuero-card:hover{ transform:translateY(-2px); box-shadow:0 8px 18px rgba(0,0,0,.12); border-color:#cfd8e3; }
    .fuero-card.active{ border:2px solid var(--cel); box-shadow:0 6px 16px rgba(94,166,215,.25); }
    .fuero-logo{ width:48px; height:48px; border-radius:50%; background:#f2f6fb; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:10px; border:1px solid #e7eef5; }
    .fuero-logo img{ width:100%; height:100%; object-fit:cover; }
    .fuero-title{ font-weight:800; font-size:.95rem; line-height:1.15; text-transform:uppercase; }
    .fuero-sub{ font-size:.8rem; opacity:.8; margin-top:2px; }

    .btn-grid{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); margin:.5rem 0 1rem 0; }
    .btn-option{
      appearance:none; border:1px solid var(--borde); background:#fff; color:var(--azul);
      border-radius:14px; padding:6px 10px; font-size:.75rem; font-weight:400; cursor:pointer; text-align:center;
      box-shadow:0 2px 8px rgba(0,0,0,.06); transition:transform .15s, box-shadow .15s, background .15s, color .15s;
      line-height:1.1; hyphens:auto; word-break: break-word;
    }
    .btn-option:hover{ transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.12); }
    .btn-option.active{ background:var(--azul); color:#fff; border-color:var(--azul); }

    .fecha-proveido-outer{ display:flex; justify-content:center; margin-bottom:16px; }
    .fecha-proveido-wrap{
      display:grid; grid-template-columns:1fr; gap:10px; align-items:start; justify-items:center;
    }
    @media (min-width:720px){ .fecha-proveido-wrap{ grid-template-columns:260px 1fr; gap:16px; } }

    .fecha-proveido-container{ text-align:center; }
    .fecha-proveido-container label{ display:block; font-weight:700; font-size:1.1rem; margin-bottom:6px; }
    .fecha-proveido-container input[type="date"]{ display:inline-block; max-width:250px; text-align:center; }

    .mini-picker{
      border:1px solid #e5eaf0;
      border-radius:6px;
      padding:12px;
      background:#fff;
      box-shadow:0 2px 10px rgba(0,0,0,.06);
      max-width:320px;
      font-size:.9rem;
    }

    .mini-picker header{
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:6px; font-weight:700; line-height:1.15;
    }

    .mini-picker header button{
      border:0;
      background:#0f2f4b; color:#fff;
      width:30px; height:30px;
      border-radius:6px;
      font-size:1em;
      cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.1);
    }

    .mini-picker table{ width:100%; border-collapse:collapse; }
    .mini-picker th{
      font-weight:600; font-size:.95em;
      padding:3px 0;
    }
    .mini-picker td{ padding:0px; }
    .mini-picker .day{
      width:100%;
      border:none;
      border-radius:4px;
      padding:4px 0;
      cursor:pointer;
      background:#fff;
    }
    .mini-picker .day:hover:not(.feriado):not(.inhabil):not(.inhabilUsuario):not(.selected){
      background:#e7eef5;
      color:#0f2f4b;
      box-shadow:none;
    }
    .mini-picker .selected{
      background:#0f2f4b;
      color:#fff;
      outline:none;
    }
    .mini-picker .selected:hover{
      background:#0f2f4b;
      color:#fff;
      box-shadow:none;
      cursor:default;
    }
    .mini-picker .weekend{ background:#eee; }
    .mini-picker .disabled{ opacity:.45; pointer-events:none; }

    .mini-picker .feriado { background:#f88; color:#fff; }
    .mini-picker .inhabil { background:#88c; color:#fff; }
    .mini-picker .inhabilUsuario { background:#d4b3ff; color:#000; }

    .mini-picker .feriado,
    .mini-picker .inhabil,
    .mini-picker .inhabilUsuario {
      cursor: pointer;
      transition: none;
    }

    .mini-picker .feriado:hover{ background:#f88; color:#fff; box-shadow:none; }
    .mini-picker .inhabil:hover{ background:#88c; color:#fff; box-shadow:none; }
    .mini-picker .inhabilUsuario:hover{ background:#d4b3ff; color:#000; box-shadow:none; }

    .rehabil{
      outline: 2px dashed #2e7d32;
      background: #e9f7ef !important;
      color: #0f2f4b !important;
    }

    .info-tip{
      margin: 12px 0 8px 0;
      padding: 10px 12px;
      background: #eaf4fc;
      border: 1px solid #cfe4fa;
      border-left: 6px solid #5EA6D7;
      border-radius: 10px;
      color: #0f2f4b;
      font-size: .95rem;
    }
  `;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <style>{css}</style>

      <div className="fecha-proveido-outer">
        <div className="fecha-proveido-wrap">
          <div className="fecha-proveido-container">
            <label htmlFor="fechaProveido">
              <strong>Fecha del proveído:</strong>
            </label>
            <input type="date" id="fechaProveido" placeholder="dd/mm/aaaa" />
          </div>
          <div id="miniPicker" className="mini-picker" aria-label="Selector de fecha" />
        </div>
      </div>

      {/* FUERO */}
      <div className="section-band">
        <div className="section-title">FUERO</div>
        <select
          id="fuero"
          className="visually-hidden-select"
          defaultValue="FUERO LABORAL"
          onChange={() => {
            populateTipos();
          }}
        >
          <option value="FUERO LABORAL">Fuero Laboral</option>
          <option value="FUERO CIVIL Y COMERCIAL">Fuero Civil y Comercial</option>
          <option value="FUERO FAMILIA">Fuero Familia</option>
          <option value="FUERO CONTENCIOSO ADMINISTRATIVO">Fuero Contencioso Administrativo</option>
          <option value="FUERO DOCUMENTOS Y LOCACIONES">Fuero Documentos y Locaciones</option>
        </select>
        <div id="fueroGroup" className="fuero-grid" />
      </div>

      {/* TIPO */}
      <div className="section-band">
        <div className="section-title">TIPO DE SENTENCIA</div>
        <select
          id="tipoSentencia"
          className="visually-hidden-select"
          onChange={() => toggleManualInput()}
        />
        <div id="tipoGroup" className="btn-grid" />
      </div>

      <div className="dias-plazo">
        <strong>
          Plazo (días hábiles): <span id="diasPlazoLabel">—</span>
        </strong>
        <small id="ayudaPlazo" style={{ display: 'block', marginTop: 4 }} />
      </div>

      <div id="inputManual" style={{ display: 'none', maxWidth: 420, marginBottom: 8 }}>
        <label htmlFor="diasManual">
          <strong>Ingresá los días hábiles (OTRAS):</strong>
        </label>
        <input type="number" id="diasManual" min="0" defaultValue="0" />
      </div>

      <div id="infoFirmeza" style={{ marginTop: 5, fontWeight: 'bold' }} />

      <div
        className="firmeza-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#fff3cd',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #ffe08a',
          maxWidth: 400,
          marginBottom: '1em',
        }}
      >
        <label htmlFor="diasFirmeza" style={{ fontWeight: 600 }}>
          Espera firmeza:
        </label>
        <input type="number" id="diasFirmeza" min="0" defaultValue="0" style={{ width: 80 }} />
        <label>
          <input type="checkbox" id="esperarFirmeza" /> Activar
        </label>
      </div>

      <label htmlFor="inhabilInput">
        <strong>Agregar día inhábil:</strong>
      </label>
      <div
        className="agregar-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'nowrap',
          margin: '1rem 0',
        }}
      >
        <input
          type="date"
          id="inhabilInput"
          style={{
            flex: '1 1 auto',
            width: 'auto',
            maxWidth: 'none',
            minWidth: 0,
          }}
        />
        <button
          type="button"
          id="btnAgregarInhabil"
          style={{
            flex: '0 0 44px',
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#0f2f4b',
            color: '#fff',
            border: 0,
            fontSize: '1.2rem',
            lineHeight: 1,
            boxShadow: '0 6px 16px rgba(0,0,0,.18)',
          }}
        >
          +
        </button>
      </div>

      <div id="listaInhabiles" />

<div  style={{    display: 'flex',    flexDirection: 'column',    gap: '0.75rem',    width: '100%', }}>
  {/* Botón calcular (igual que antes) */}
  <button className="calc-button" type="button" onClick={calcularPlazo}>
    Calcular plazo
  </button>

  {/* Botón + diálogo Guardar en juicio */}
  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
    <div>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={handleOpenSaveDialog}
        >
          Guardar en juicio
        </Button>
      </DialogTrigger>
    </div>

    <DialogContent>
      <DialogHeader>
        <DialogTitle>Guardar vencimiento en un juicio</DialogTitle>
        <DialogDescription>
          Se guardarán el fuero, el tipo de sentencia, la fecha del proveído y la fecha de vencimiento calculada.
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
            <p className="text-xs text-red-600 mt-1">
              {loadCasesError}
            </p>
          )}
        </div>

        {/* Título */}
        <div className="space-y-1">
          <Label>Título del registro</Label>
          <Input
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="Ej: Vencimiento sentencia laboral"
          />
        </div>

        {/* Notas */}
        <div className="space-y-1">
          <Label>Notas (opcional)</Label>
          <Textarea
            value={saveNotes}
            onChange={(e) => setSaveNotes(e.target.value)}
            placeholder="Notas sobre el plazo, consideraciones especiales, etc."
            rows={3}
          />
        </div>

        {/* Resumen breve */}
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2">
          <p className="font-semibold mb-1">Resumen a guardar</p>
          <p id="resumenGuardarFueroTipo" className="mb-1">
            {/* Mostramos datos leyendo del DOM cuando se abre el diálogo */}
            {/* Esto no es reactivo, pero sirve como recordatorio visual */}
          </p>
          <p className="mt-1">
            Se guardará también la fecha de vencimiento calculada.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSaveDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmSave}
            disabled={savingResult || !selectedCaseId}
          >
            {savingResult ? 'Guardando…' : 'Guardar en juicio'}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</div>

<div id="resultado" className="resultado" />

      <div
        id="advertenciaRecalculo"
        style={{ marginTop: 10, fontWeight: 'bold', color: '#cc6600' }}
      />

      <div className="leyenda">
        <strong>Leyenda:</strong>
        <br />
        <span className="feriado">Inhábil</span>
        <span className="inhabil">Inhábil judicial</span>
        <span className="inhabilUsuario">Inhábil usuario</span>
        <span className="notificacion">Notificación</span>
        <span className="firmeza">Firmeza</span>
        <span className="inicioSentencia">Inicio sentencia</span>
        <span className="vencimiento">Vencimiento</span>
      </div>

      <div id="obsCalendario" className="info-tip" style={{ display: 'none' }}>
        💡 <strong>Observación:</strong> si considerás que un día es hábil o inhábil, hacé clic sobre ese día en el
        calendario. Se recalculará automáticamente.
      </div>

      <div id="calendarios" />
    </div>
  );
}
