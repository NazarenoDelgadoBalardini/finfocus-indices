import React, { useState, useEffect, useRef } from 'react';

// ===============================
// Helpers de formato globales
// ===============================
const fmtMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtPct = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// 👇 Helper para guardar fechas como DD-MM-YYYY
function formatDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// ===============================
// Imports para GUARDAR EN JUICIO
// ===============================
import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

import { FileText } from 'lucide-react';

// función auxiliar para comparar Vuotto/Méndez
function calcInd(salario, incapacidad, edad, n, i) {
  if (!isFinite(n) || n <= 0 || !isFinite(i) || i <= 0) return NaN;
  const a = salario * 13 * incapacidad * (60 / edad);
  const Vn = 1 / Math.pow(1 + i, n);
  return a * ((1 - Vn) / i);
}

export default function CalculadoraVuottoMendez({
  toolId,
  toolName = 'Calculadora Vuotto–Méndez (renta periódica)',
}) {
  const containerRef = useRef(null);

  // estados de formulario
  const [fechaNacimiento, setFechaNacimiento] = useState('1993-06-30');
  const [fechaAccidente, setFechaAccidente] = useState('2025-06-13');
  const [edad, setEdad] = useState('');
  const [salario, setSalario] = useState('$ 15.000,00');
  const [incapacidad, setIncapacidad] = useState('20,00%');
  const [criterio, setCriterio] = useState('vuotto');
  const [vidaUtil, setVidaUtil] = useState('');
  const [tasa, setTasa] = useState('6,00%');

  // resultados
  const [resultado, setResultado] = useState(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [detalleHtml, setDetalleHtml] = useState('');
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [formulasAbiertas, setFormulasAbiertas] = useState(false);
  const [montoVuotto, setMontoVuotto] = useState(null);
  const [montoMendez, setMontoMendez] = useState(null);

  // =============== GUARDAR EN JUICIO ===============
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // ==== helpers de formato ====
  const formatearMonedaInput = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    const num = parseFloat(digits) / 100;
    return fmtMoneda.format(num);
  };

  const formatearPorcentajeInput = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    const num = parseFloat(digits) / 100;
    return `${fmtPct.format(num)}%`;
  };

  const parseMoney = (s) => {
    if (!s) return 0;
    const n = parseFloat(
      s.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    );
    return isFinite(n) ? n : 0;
  };

  const parsePercent = (s) => {
    if (!s) return 0;
    const n = parseFloat(
      s.replace('%', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    );
    return isFinite(n) ? n / 100 : 0;
  };

  // ==== edad automática ====
  useEffect(() => {
    if (!fechaAccidente || !fechaNacimiento) return;
    const acc = new Date(fechaAccidente);
    const nac = new Date(fechaNacimiento);
    let e = acc.getFullYear() - nac.getFullYear();
    if (
      acc.getMonth() < nac.getMonth() ||
      (acc.getMonth() === nac.getMonth() && acc.getDate() < nac.getDate())
    ) {
      e--;
    }
    setEdad(Number.isFinite(e) ? String(e) : '');
  }, [fechaAccidente, fechaNacimiento]);

  // ==== vida útil y tasa según criterio ====
  useEffect(() => {
    const edadNum = parseInt(edad, 10);
    if (!edadNum || Number.isNaN(edadNum)) {
      if (criterio !== 'manual') {
        setVidaUtil('');
      }
      return;
    }

    if (criterio === 'vuotto') {
      const n = 65 - edadNum;
      setVidaUtil(n > 0 ? String(n) : '');
      setTasa('6,00%');
    } else if (criterio === 'mendez') {
      const n = 75 - edadNum;
      setVidaUtil(n > 0 ? String(n) : '');
      setTasa('4,00%');
    }
    // en "manual" no tocamos nada, lo maneja el usuario
  }, [criterio, edad]);

  // ===============================
  // Cargar juicios al abrir diálogo
  // ===============================
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
        console.error('Error cargando juicios para Vuotto–Méndez:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // ==== cálculo principal ====
  const handleCalcular = () => {
    const edadNum = parseInt(edad, 10);
    const nVida = parseInt(vidaUtil, 10);
    const salarioNum = parseMoney(salario);
    const incap = parsePercent(incapacidad);
    const tasaAnual = parsePercent(tasa);

    if (
      !fechaAccidente ||
      !edadNum ||
      !salarioNum ||
      !incap ||
      !nVida ||
      !tasaAnual
    ) {
      alert('Completá todos los campos.');
      return;
    }

    const a = salarioNum * 13 * incap * (60 / edadNum);
    const Vn = 1 / Math.pow(1 + tasaAnual, nVida);
    const factor = (1 - Vn) / tasaAnual;
    const ind = a * factor;

    // comparativa Vuotto / Méndez
    const nVuotto = 65 - edadNum;
    const iVuotto = 0.06;
    const nMendez = 75 - edadNum;
    const iMendez = 0.04;

    const indVu = calcInd(salarioNum, incap, edadNum, nVuotto, iVuotto);
    const indMe = calcInd(salarioNum, incap, edadNum, nMendez, iMendez);

    setMontoVuotto(Number.isFinite(indVu) ? indVu : null);
    setMontoMendez(Number.isFinite(indMe) ? indMe : null);

    setResultado(ind);
    setMostrarResultado(true);

    // detalle HTML
    const detalle = `
      <div class="steps">
        <div class="block">
          <h3>Base <span class="chip">a</span></h3>
          <p class="expr">a = salario × 13 × %incapacidad × (60/edad)</p>
          <p class="subexpr num">
            ${fmtMoneda.format(salarioNum)} × 13 × ${fmtPct.format(incap * 100)}% × (60/${edadNum})
          </p>
          <p class="res num">= ${fmtMoneda.format(a)}</p>
        </div>

        <div class="block">
          <h3>Parámetros <span class="chip">n, i</span></h3>
          <p class="expr">n, i (vida útil y tasa)</p>
          <p class="subexpr">
            n = <span class="num">${nVida}</span>,
            i = <span class="num">${fmtPct.format(tasaAnual * 100)}%</span>
          </p>
        </div>

        <div class="block">
          <h3>Valor actual <span class="chip">V<sup>n</sup></span></h3>
          <p class="expr">V<sup>n</sup> = 1 / (1 + i)<sup>n</sup></p>
          <p class="subexpr num">
            1 / (1 + ${tasaAnual.toFixed(4)})<sup>${nVida}</sup> = ${Vn.toFixed(6)}
          </p>
          <p class="res num">= ${Vn.toFixed(6)}</p>
        </div>

        <div class="block">
          <h3>Factor renta</h3>
          <p class="expr">(1 − V<sup>n</sup>) / i</p>
          <p class="subexpr num">
            (1 − ${Vn.toFixed(6)}) / ${tasaAnual.toFixed(4)} = ${factor.toFixed(6)}
          </p>
          <p class="res num">= ${factor.toFixed(6)}</p>
        </div>

        <div class="block">
          <h3>Indemnización <span class="chip">a × (1 − V<sup>n</sup>) / i</span></h3>
          <p class="expr">a × (1 − V<sup>n</sup>) / i</p>
          <p class="subexpr num">${fmtMoneda.format(a)} × ${factor.toFixed(6)}</p>
          <p class="res num">= ${fmtMoneda.format(ind)}</p>
        </div>
      </div>
    `;
    setDetalleHtml(detalle);
    setMostrarDetalle(true);
  };

  // ==== limpiar ====
  const handleClear = () => {
    setFechaNacimiento('');
    setFechaAccidente('');
    setEdad('');
    setSalario('');
    setIncapacidad('');
    setCriterio('vuotto');
    setVidaUtil('');
    setTasa('6,00%');
    setResultado(null);
    setMostrarResultado(false);
    setMostrarDetalle(false);
    setDetalleHtml('');
    setMontoVuotto(null);
    setMontoMendez(null);
    setFormulasAbiertas(false);
  };

  // ==== exportar PDF (usa window.html2pdf) ====
  const handleExportPdf = () => {
    if (typeof window === 'undefined' || !window.html2pdf) {
      alert('La función de exportar a PDF no está disponible.');
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const margin = { top: 10, right: 10, bottom: 10, left: 10 }; // mm
    const pxPerMm = 96 / 25.4;
    const availW = (210 - margin.left - margin.right) * pxPerMm;
    const availH = (297 - margin.top - margin.bottom) * pxPerMm;
    const rect = el.getBoundingClientRect();
    const fitScale = Math.min(availW / rect.width, availH / rect.height, 1);

    el.style.transformOrigin = 'top left';
    el.style.transform = `scale(${fitScale})`;

    window
      .html2pdf()
      .set({
        margin: [margin.top, margin.right, margin.bottom, margin.left],
        filename: 'calculadora_indemnizacion_vuotto_mendez.pdf',
        html2canvas: { scale: 1 },
        jsPDF: { unit: 'mm', format: 'legal', orientation: 'portrait' },
      })
      .from(el)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const total = pdf.internal.getNumberOfPages();
        for (let i = total; i > 1; i--) pdf.deletePage(i);
      })
      .save()
      .then(() => {
        el.style.transform = '';
      })
      .catch((err) => {
        console.error('PDF error:', err);
        el.style.transform = '';
      });
  };

  // =============== Abrir diálogo "Guardar en juicio" ===============
  const handleOpenSaveDialog = () => {
    if (!resultado || !Number.isFinite(resultado)) {
      alert('Primero calculá la indemnización antes de guardar en un juicio.');
      return;
    }

    const defaultTitle =
      saveTitle || toolName || 'Indemnización Vuotto–Méndez a la fecha del accidente';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  // =============== Confirmar guardado en juicio ===============
  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const edadNum = parseInt(edad, 10) || null;
      const salarioNum = parseMoney(salario);
      const incapFrac = parsePercent(incapacidad);
      const tasaAnual = parsePercent(tasa);
      const nVida = parseInt(vidaUtil, 10) || null;

      const payload = {
        tipo: 'vuotto_mendez',
        fechaNacimiento: formatDDMMYYYY(fechaNacimiento),
        fechaAccidente: formatDDMMYYYY(fechaAccidente),
        edadAlAccidente: edadNum,
        salarioMensualBruto: salarioNum,
        incapacidadPorc: incapFrac != null ? incapFrac * 100 : null,
        criterioSeleccionado: criterio,
        vidaUtil: nVida,
        tasaAnualPorc: tasaAnual != null ? tasaAnual * 100 : null,
        indemnizacionSegunCriterio: resultado,
        montoVuotto,
        montoMendez,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Calculadora Vuotto–Méndez',
        title:
          saveTitle ||
          toolName ||
          'Indemnización Vuotto–Méndez a la fecha del accidente',
        notes: saveNotes,
        payload,
      });

      alert('✅ Resultado guardado en el juicio.');
      setSaveDialogOpen(false);
      setSelectedCaseId('');
      setSaveTitle('');
      setSaveNotes('');
    } catch (e) {
      console.error('Error guardando Vuotto–Méndez en juicio:', e);
      alert('No se pudo guardar el resultado en el juicio.');
    } finally {
      setSavingResult(false);
    }
  };

  // valores calculados para la tabla de fórmulas
  const montoVuottoFmt = montoVuotto != null ? fmtMoneda.format(montoVuotto) : '—';
  const montoMendezFmt = montoMendez != null ? fmtMoneda.format(montoMendez) : '—';

  return (
    <>
      {/* estilos originales */}
      <style>{`
        :root{ --azul:#0f2f4b; --celeste:#5EA6D7; --gris:#F3F4F6; --borde:#E5E7EB; }
        body{ background:#FFF; margin:0; padding:20px; color:#0f2f4b; }

        .calc-container{
          max-width: 720px; margin:auto; padding:26px;
          border-radius:20px; background:#fff;
          box-shadow:0 10px 30px rgba(0,0,0,.06), 0 1px 0 rgba(0,0,0,.03);
          position:relative; page-break-inside:avoid; break-inside:avoid;
        }

        .header{ display:flex; align-items:center; gap:10px; justify-content:center; margin-bottom:4px; color:var(--azul) }
        .subtle{ color:#334155; font-size:.9rem; text-align:center; margin-bottom:18px }

        .form-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px }
        @media (max-width: 640px){ .form-grid{ grid-template-columns:1fr } }

        .fg{ position:relative; }
        .fg input, .fg select{
          width:100%; padding:14px 12px; border:1px solid var(--borde);
          border-radius:12px; background:#fff; color:#0f2f4b; font-size:1rem;
          transition:border-color .2s, box-shadow .2s, background .2s;
        }
        .fg input:focus, .fg select:focus{
          outline:none; border-color:var(--azul); box-shadow:0 0 0 3px rgba(15,47,75,.18);
          background:#fbfdff;
        }
        .fg input.readonly{ background:#F1F5F9; color:#475569 }
        .label-chip{
          position:absolute; top:-10px; left:12px; padding:0 8px; height:20px;
          display:inline-flex; align-items:center; gap:6px; border-radius:9999px;
          background:#fff; border:1px solid #E2E8F0; font-size:.80rem; font-weight:600; color:var(--azul);
        }

        .tt{ position:relative; display:inline-flex; align-items:center; justify-content:center; }
        .tt-btn{
          width:18px; height:18px; font-size:.78rem; line-height:1; border-radius:9999px;
          border:1px solid rgba(15,47,75,.20); color:var(--azul); background:#F8FAFC;
          cursor:pointer; user-select:none; display:inline-flex; align-items:center; justify-content:center;
        }
        .tt[data-tip]::after,.tt[data-tip]::before{
          pointer-events:none; position:absolute; opacity:0; transform:translateY(4px);
          transition:opacity .12s, transform .12s;
        }
        .tt[data-tip]::after{
          content:attr(data-tip); z-index:50; left:50%; bottom:calc(100% + 10px); transform:translate(-50%,4px);
          background:var(--azul); color:#fff; padding:8px 10px; border-radius:10px;
          font-size:.82rem; line-height:1.15; width:max-content; max-width:280px; text-align:left;
          box-shadow:0 10px 20px rgba(0,0,0,.18)
        }
        .tt[data-tip]::before{
          content:""; z-index:49; left:50%; bottom:calc(100% + 6px); transform:translate(-50%,4px);
          border:6px solid transparent; border-top-color:var(--azul)
        }
        .tt:hover::after,.tt:hover::before{ opacity:1; transform:translate(-50%,0) }

        .btn{
          width:100%; margin-top:16px; padding:14px 16px; border:none; border-radius:9999px;
          font-weight:800; color:#fff; background:var(--azul); cursor:pointer;
          box-shadow:0 8px 20px rgba(15,47,75,.18);
          transition:transform .06s ease, filter .2s ease, background .2s ease;
        }
        .btn:hover{ filter:brightness(1.03) } .btn:active{ transform:translateY(1px) }

        .btn-export{
          display:inline-flex; align-items:center; gap:8px; margin:16px auto 0;
          padding:10px 14px; border-radius:12px; border:2px solid var(--azul);
          color:var(--azul); background:#fff; font-weight:700; cursor:pointer;
          transition:background .2s, color .2s;
          width: 100%; justify-content: center;
        }
        .btn-export:hover{ background:var(--azul); color:#fff }

        .mobile-sep{
          display:none; height:1px; background:linear-gradient(90deg, transparent, #cbd5e1, transparent);
          position:sticky; top:0; z-index:5; margin-top:8px;
        }
        @media (max-width:640px){ .mobile-sep{ display:block } }

        .result-wrap{ margin-top:12px }
        .result{
          display:flex; gap:14px; align-items:center;
          padding:16px 16px; border-radius:16px; position:relative; overflow:hidden;
          background:linear-gradient(180deg,#F4F9FF 0%,#F9FCFF 100%);
          box-shadow:0 10px 24px rgba(15,47,75,.08);
          border:1px solid #DCE7F5;
        }
        .result::before{
          content:""; position:absolute; inset:0; padding:1px; border-radius:16px;
          background:linear-gradient(135deg, rgba(15,47,75,.55), rgba(94,166,215,.45));
          -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        .badge{
          font-size:.72rem; font-weight:800; padding:4px 8px; border-radius:9999px;
          background:#E8F1FA; color:var(--azul); border:1px solid #D4E3F2;
        }
        .result-amount{ font-size:1.45rem; font-weight:900; color:#0f2f4b; letter-spacing:.2px }
        .result-title{ font-weight:700; margin-bottom:2px; color:#0f2f4b }
        .result-icon{
          min-width:42px; height:42px; border-radius:12px; display:grid; place-items:center;
          background:#E8F1FA; color:var(--azul); font-weight:800; border:1px solid #D4E3F2; font-size:1.1rem;
        }

        .panel{
          margin-top:12px; padding:14px; border:1px solid var(--borde);
          background:#FCFCFD; border-radius:14px;
        }
        .panel h2{ margin:4px 0 8px; font-size:1rem; color:var(--azul) }
        .linea{ margin:.35rem 0; color:#334155 }
        .num{
        }

        .toggle-btn{
          margin-top:14px; width:100%; display:flex; justify-content:center; align-items:center; gap:8px;
          padding:10px 14px; border-radius:12px; border:1px solid #CBD5E1; background:#F8FAFC; color:#0f2f4b; font-weight:700; cursor:pointer;
        }
        .toggle-btn:hover{ background:#EEF2F7 }
        .fold{ display:none }
        .fold.open{ display:block; animation:fade .18s ease }
        @keyframes fade{ from{opacity:0; transform:translateY(-4px)} to{opacity:1; transform:translateY(0)} }

        .tbl{ width:100%; border-collapse:collapse; margin-top:10px; font-size:.94rem }
        .tbl th,.tbl td{ border:1px solid #E5E7EB; padding:10px; vertical-align:top }
        .tbl th{ background:#F3F7FB; color:#0f2f4b; text-align:left }
        .tbl caption{ text-align:left; color:#0f2f4b; font-weight:700; margin-bottom:6px }
        .pill{ display:inline-block; padding:2px 8px; border-radius:9999px; font-weight:700; font-size:.75rem; border:1px solid #cfe1f0; background:#edf5fb; color:#0f2f4b }
        .muted{ color:#64748b }
        .hidden{ display:none }

        .clear-btn{
          position:absolute; top:14px; right:14px; color:#ef4444; border:none; background:transparent;
          font-size:.9rem; cursor:pointer; display:flex; align-items:center; gap:6px;
        }
        .clear-btn:hover{ color:#b91c1c }

        .steps{ display:flex; flex-direction:column; gap:16px; }

        .block{
          padding:14px 16px; border:1px solid #e6eef7; border-radius:14px; background:#fbfdff;
        }
        .block h3{
          margin:0 0 10px;
          font-size:1.1rem;
          font-weight:800;
          color:#0f2f4b;
          text-align:center;
          display:flex;
          justify-content:center;
          align-items:center;
          gap:6px;
          position:relative;
        }
        .block h3::after{
          content:"";
          position:absolute;
          bottom:-4px;
          left:50%;
          transform:translateX(-50%);
          width:40%;
          height:2px;
          border-radius:2px;
          background:linear-gradient(90deg, transparent, #5EA6D7, transparent);
        }
        .block p{ margin:.15rem 0; line-height:1.35; }
        .block .expr{ color:#334155; }
        .block .subexpr{ color:#475569; font-size:.92rem; }
        .block .res{ font-weight:800; color:#0f2f4b; }
        .block .chip{
          padding:2px 6px; border-radius:9999px; font-size:.72rem; font-weight:800;
          background:#edf5fb; border:1px solid #cfe1f0; color:#0f2f4b;
        }
      `}</style>

      <div ref={containerRef} className="calc-container">
        <button className="clear-btn" onClick={handleClear} title="Limpiar">
          🧹 Limpiar
        </button>

        <div className="header">
          <h1 className="text-xl font-extrabold tracking-tight">
            {toolName || 'Calculadora Vuotto–Méndez (renta periódica)'}
          </h1>
        </div>
        <p className="subtle">
          a × ((1 − Vⁿ) / i) &nbsp;•&nbsp; a = salario × 13 × %incapacidad × (60 / edad)
        </p>

        {/* Panel explicativo */}
        <div className="panel" style={{ marginBottom: '24px' }}>
          <h2 className="font-bold mb-1">🧭 Cómo usar esta calculadora</h2>
          <div className="space-y-1 text-sm">
            <p className="linea">
              <strong>🗓️ Ingresá los datos</strong><br />
              Fecha de nacimiento y fecha de accidente/PMI → se calcula tu edad automáticamente.
              Salario mensual bruto ($) y % de incapacidad.
            </p>
            <p className="linea">
              <strong>🔍 Elegí el criterio</strong><br />
              🔹 Vuotto → n = 65 − edad e i = 6% anual.<br />
              🔸 Méndez → n = 75 − edad e i = 4% anual.<br />
              ✏️ Manual → podés editar (n − edad) y la tasa a tu gusto.
            </p>
            <p className="linea">
              <strong>⚖️ Calcular</strong><br />
              Pulsá <b>“Calcular indemnización”</b> para ver el resultado y el detalle del factor de
              anualidad. Si necesitás actualizar ese monto a una fecha posterior, podés usar la
              calculadora de actualización de capital de FINFOCUS.
            </p>
          </div>
        </div>

        {/* formulario */}
        <div className="form-grid">
          <div className="fg">
            <div className="label-chip">
              Fecha de nacimiento
              <span
                className="tt tt-btn"
                data-tip="Usamos esta fecha para calcular la edad exacta al momento del accidente."
              >
                ℹ️
              </span>
            </div>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              Fecha del accidente
              <span
                className="tt tt-btn"
                data-tip="Fecha de referencia del cálculo. Determina la edad y la vida útil remanente."
              >
                ℹ️
              </span>
            </div>
            <input
              type="date"
              value={fechaAccidente}
              onChange={(e) => setFechaAccidente(e.target.value)}
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              Edad al accidente
              <span
                className="tt tt-btn"
                data-tip="Se calcula automáticamente a partir de las fechas."
              >
                ℹ️
              </span>
            </div>
            <input
              type="number"
              className="readonly"
              readOnly
              value={edad}
              placeholder="Se calculará"
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              Salario mensual bruto
              <span
                className="tt tt-btn"
                data-tip="Salario en pesos sin descuentos. Se multiplica por 13 (incluye aguinaldo) dentro de la base ‘a’."
              >
                ℹ️
              </span>
            </div>
            <input
              type="text"
              value={salario}
              inputMode="decimal"
              onChange={(e) => setSalario(formatearMonedaInput(e.target.value))}
              placeholder="$ 0,00"
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              % de incapacidad
              <span
                className="tt tt-btn"
                data-tip="Porcentaje médico-legal de incapacidad permanente. 20% = 0,20."
              >
                ℹ️
              </span>
            </div>
            <input
              type="text"
              value={incapacidad}
              inputMode="decimal"
              onChange={(e) => setIncapacidad(formatearPorcentajeInput(e.target.value))}
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              Criterio de cálculo
              <span
                className="tt tt-btn"
                data-tip="Vuotto: n=65−edad, i=6% • Méndez: n=75−edad, i=4% • Manual: elegís ambos."
              >
                ℹ️
              </span>
            </div>
            <select
              value={criterio}
              onChange={(e) => setCriterio(e.target.value)}
            >
              <option value="vuotto">Vuotto</option>
              <option value="mendez">Méndez</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="fg">
            <div className="label-chip">
              Vida útil (n-edad)
              <span
                className="tt tt-btn"
                data-tip="Años de vida útil remanente. Se completa según criterio o lo editás en Manual."
              >
                ℹ️
              </span>
            </div>
            <input
              type="number"
              placeholder="Se calculará o ingresa"
              value={vidaUtil}
              onChange={(e) => setVidaUtil(e.target.value)}
              readOnly={criterio !== 'manual'}
              className={criterio !== 'manual' ? 'readonly' : ''}
            />
          </div>

          <div className="fg">
            <div className="label-chip">
              Tasa anual (i)
              <span
                className="tt tt-btn"
                data-tip="Tasa efectiva anual de descuento: 6% (Vuotto) o 4% (Méndez). En Manual podés fijar otra."
              >
                ℹ️
              </span>
            </div>
            <input
              type="text"
              placeholder="6,00%"
              value={tasa}
              onChange={(e) => setTasa(formatearPorcentajeInput(e.target.value))}
              readOnly={criterio !== 'manual'}
              className={criterio !== 'manual' ? 'readonly' : ''}
              inputMode="decimal"
            />
          </div>
        </div>

        <button className="btn" onClick={handleCalcular}>
          Calcular indemnización
        </button>

        <button id="btnExportPdf" className="btn-export" onClick={handleExportPdf}>
          <span>📄</span> <span>Exportar todo a PDF</span>
        </button>

        {/* Botón GUARDAR EN JUICIO + Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <div style={{ marginTop: '12px' }}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="btn-export"
                onClick={handleOpenSaveDialog}
              >
                <span>📁</span>
                <span>Guardar en juicio</span>
              </button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Guardar cálculo Vuotto–Méndez en un juicio</DialogTitle>
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
                    <p className="text-xs text-red-600 mt-1">
                      {loadCasesError}
                    </p>
                  )}
                </div>

                {/* Título */}
                <div className="space-y-1">
                  <Label>Título del cálculo</Label>
                  <UiInput
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Ej: Indemnización Vuotto–Méndez a la fecha del accidente"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Notas sobre el criterio, parámetros, etc."
                    rows={3}
                  />
                </div>

                {/* Resumen breve */}
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
                  <p className="font-semibold mb-1">Resumen a guardar</p>
                  <p>
                    Fecha del accidente:{' '}
                    <span className="font-bold text-[#0f2f4b]">
                      {fechaAccidente
                        ? formatDDMMYYYY(fechaAccidente)
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Indemnización (según criterio actual):{' '}
                    <span className="font-bold text-[#0f2f4b]">
                      {resultado != null
                        ? fmtMoneda.format(resultado)
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Monto según Vuotto:{' '}
                    <span className="font-semibold">
                      {montoVuotto != null ? montoVuottoFmt : '—'}
                    </span>
                  </p>
                  <p>
                    Monto según Méndez:{' '}
                    <span className="font-semibold">
                      {montoMendez != null ? montoMendezFmt : '—'}
                    </span>
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
                    {savingResult ? (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Guardar en juicio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </div>
        </Dialog>

        <div className="mobile-sep" />

        {/* resultado principal */}
        {mostrarResultado && resultado != null && (
          <div id="resultadoWrap" className="result-wrap">
            <div className="result">
              <div className="result-icon">$</div>
              <div style={{ flex: 1 }}>
                <div className="result-title">Total a la fecha del accidente</div>
                <div id="resultado" className="result-amount">
                  {fmtMoneda.format(resultado)}
                </div>
                <div className="muted" style={{ fontSize: '.8rem' }}>
                  Fórmula: <span className="pill">a × (1−Vⁿ)/i</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* toggle fórmulas */}
        <button
          type="button"
          className="toggle-btn"
          onClick={() => setFormulasAbiertas((prev) => !prev)}
        >
          {formulasAbiertas ? '▲ Ocultar fórmulas (Vuotto vs Méndez)' : '▼ Mostrar fórmulas (Vuotto vs Méndez)'}
        </button>

        <div id="foldFormulas" className={`fold ${formulasAbiertas ? 'open' : ''}`}>
          <div className="panel" style={{ marginTop: 10 }}>
            <h2>Comparativa de parámetros</h2>
            <table className="tbl">
              <caption>Definiciones y diferencias</caption>
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Vuotto</th>
                  <th>Méndez</th>
                  <th>Explicación</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>n</b> (vida útil)</td>
                  <td><span className="pill">65 − edad</span></td>
                  <td><span className="pill">75 − edad</span></td>
                  <td>Años restantes de vida útil considerados para proyectar la renta.</td>
                </tr>
                <tr>
                  <td><b>i</b> (tasa)</td>
                  <td><span className="pill">6% anual</span></td>
                  <td><span className="pill">4% anual</span></td>
                  <td>Tasa efectiva anual de descuento.</td>
                </tr>
                <tr>
                  <td><b>a</b> (base)</td>
                  <td colSpan={2}>
                    <span className="pill">
                      salario × 13 × %incapacidad × (60/edad)
                    </span>
                  </td>
                  <td>Base anual ajustada por incapacidad y un factor etario (60/edad).</td>
                </tr>
                <tr>
                  <td><b>Vⁿ</b></td>
                  <td colSpan={2}>
                    <span className="pill">1/(1+i)ⁿ</span>
                  </td>
                  <td>Valor actual de una unidad pagadera dentro de n años.</td>
                </tr>
                <tr>
                  <td><b>Factor</b></td>
                  <td colSpan={2}>
                    <span className="pill">(1 − Vⁿ)/i</span>
                  </td>
                  <td>Factor de renta uniforme descontada durante n años a tasa i.</td>
                </tr>
                <tr>
                  <td><b>Indemnización</b></td>
                  <td colSpan={2}>
                    <span className="pill">a × (1 − Vⁿ)/i</span>
                  </td>
                  <td>Resultado al momento del accidente (sin otros ajustes legales).</td>
                </tr>
                <tr>
                  <td><b>Monto de indemnización</b></td>
                  <td className="num">
                    <span id="montoVuotto">{montoVuottoFmt}</span>
                  </td>
                  <td className="num">
                    <span id="montoMendez">{montoMendezFmt}</span>
                  </td>
                  <td>
                    Calculado con los mismos datos ingresados arriba, aplicando cada criterio
                    (Vuotto 6% – 65 años; Méndez 4% – 75 años).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* detalle paso a paso */}
        {mostrarDetalle && (
          <div id="detalle" className="panel">
            <h2>Detalle de cálculos</h2>
            <div
              id="detalleTexto"
              dangerouslySetInnerHTML={{ __html: detalleHtml }}
            />
          </div>
        )}
      </div>
    </>
  );
}
