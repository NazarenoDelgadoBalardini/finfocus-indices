import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FinancialData } from '@/entities/FinancialData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

// ==== Guardar en juicio ====
import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

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

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AZUL = '#0f2f4b';
const CEL = '#5EA6D7';

/* =====================
   Helpers de fechas / texto
   ===================== */

const formatISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const toDMY = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// 👉 para guardar en juicio en formato DD-MM-YYYY
const formatDDMMYYYY = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\w]+/g, ' ')
    .trim();

const parseSheetDateCellToISO = (val) => {
  if (val == null) return null;
  const str = String(val).trim();

  // Caso "YYYY-MM-DD"
  const mIso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) return str;

  // Caso "DD/MM/YYYY"
  const mDmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mDmy) {
    const dd = mDmy[1].padStart(2, '0');
    const mm = mDmy[2].padStart(2, '0');
    const yy = mDmy[3];
    return `${yy}-${mm}-${dd}`;
  }

  // Caso date(YYYY,MM,DD) tipo GViz
  const mDateFn = str.match(/^date\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (mDateFn) {
    const y = +mDateFn[1];
    const mm = (+mDateFn[2] + 1).toString().padStart(2, '0');
    const dd = (+mDateFn[3]).toString().padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  return null;
};

const isWeekend = (d) => {
  const wd = d.getDay();
  return wd === 0 || wd === 6;
};

const isBusinessDay = (d, feriados, inhabilUsuario, habilForzado) => {
  const wd = d.getDay();
  const iso = formatISO(d);

  // finde: nunca hábil
  if (wd === 0 || wd === 6) return false;

  // si está forzado como hábil, vale aunque sea inhábil/feriado
  if (habilForzado.includes(iso)) return true;

  // feriados o inhábiles de usuario → inhábil
  if (feriados.includes(iso) || inhabilUsuario.includes(iso)) return false;

  return true;
};

const sumarHabiles = (fecha, dias, feriados, inhabilUsuario, habilForzado) => {
  const res = new Date(fecha);
  let cont = 0;
  while (cont < dias) {
    res.setDate(res.getDate() + 1);
    if (isBusinessDay(res, feriados, inhabilUsuario, habilForzado)) cont++;
  }
  return res;
};

/* =====================
   Núcleo de cálculo de plazos
   ===================== */

const calcularPlazosCore = ({
  isoProveido,
  esperarFirmeza,
  diasFirmeza,
  diasConteo,
  feriados,
  inhabilUsuario,
  habilForzado,
}) => {
  if (!isoProveido) return null;
  const [y, m, d] = isoProveido.split('-').map(Number);
  const fp = new Date(y, m - 1, d, 12, 0, 0); // fecha proveído

  // Notificación = +1 hábil desde proveído
  const fn = sumarHabiles(fp, 1, feriados, inhabilUsuario, habilForzado);

  // Firmeza base (si aplica) para luego sumar la "con cargo"
  const diasF = esperarFirmeza ? diasFirmeza : 0;
  const ff = diasF > 0 ? sumarHabiles(fn, diasF, feriados, inhabilUsuario, habilForzado) : fn;

  // Firmeza con cargo = +1 hábil desde firmeza
  const ffc = sumarHabiles(ff, 1, feriados, inhabilUsuario, habilForzado);

  if (!diasConteo || diasConteo === 0) {
    return { fp, fn, ffc, fv: null, fm: null };
  }

  // Vencimiento: se cuentan días hábiles desde la firmeza con cargo
  const fv = sumarHabiles(ffc, diasConteo, feriados, inhabilUsuario, habilForzado);
  // Mora: +1 hábil desde vencimiento
  const fm = sumarHabiles(fv, 1, feriados, inhabilUsuario, habilForzado);

  return { fp, fn, ffc, fv, fm };
};

/* =====================
   Componente principal
   ===================== */

export default function CalculadoraPlazosSentencias() {
  const [fechaProveido, setFechaProveido] = useState('');
  const [diasFirmeza, setDiasFirmeza] = useState(5);
  const [esperarFirmeza, setEsperarFirmeza] = useState(true);
  const [diasConteo, setDiasConteo] = useState(0);

  const [feriados, setFeriados] = useState([]); // inhábiles base desde FinancialData
  const [inhabilUsuario, setInhabilUsuario] = useState([]);
  const [habilForzado, setHabilForzado] = useState([]);

  const [resultado, setResultado] = useState(null); // {fp, fn, ffc, fv, fm}
  const [showResultado, setShowResultado] = useState(false);
  const [showCalendarios, setShowCalendarios] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [hasCalculatedOnce, setHasCalculatedOnce] = useState(false);

  // Mini cal
  const [miniMonthRef, setMiniMonthRef] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [miniSelISO, setMiniSelISO] = useState('');

  // Debounce para recalcular al cambiar inhábiles / feriados / habilForzado
  const recalcTimeout = useRef(null);

  // ==== Estados para GUARDAR EN JUICIO ====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  /* ========= Leer inhábiles desde FinancialData (category: 'inhabiles') ========= */

  useEffect(() => {
    const loadInhabiles = async () => {
      try {
        setErrorCarga(null);
        const res = await FinancialData.filter(
          {
            category: 'inhabiles',
            isActive: true,
          },
          '-lastSync',
          1
        );

        if (!res || res.length === 0) {
          setFeriados([]);
          setErrorCarga('No se encontraron inhábiles en la categoría "inhabiles".');
          return;
        }

        const row = res[0];
        const headers = row.headers || [];
        const headersNorm = headers.map(norm);
        let idxFecha = headersNorm.findIndex((h) => h.includes('fecha') || h.includes('dia'));
        if (idxFecha === -1) idxFecha = 0;

        const fechas = [];
        for (const r of row.data || []) {
          const val = r[idxFecha];
          const iso = parseSheetDateCellToISO(val);
          if (iso) fechas.push(iso);
        }

        const unique = Array.from(new Set(fechas)).sort();
        setFeriados(unique);
      } catch (err) {
        console.error('Error cargando inhábiles desde FinancialData:', err);
        setErrorCarga('Error al cargar los días inhábiles. Revisá la sincronización.');
      }
    };

    loadInhabiles();
  }, []);

  /* ========= Sincronizar mini-calendario cuando se cambia manualmente el input ========= */

  useEffect(() => {
    if (!fechaProveido) return;
    const [y, m] = fechaProveido.split('-').map(Number);
    setMiniMonthRef(new Date(y, m - 1, 1));
    setMiniSelISO(fechaProveido);
  }, [fechaProveido]);

  /* ========= Recalcular automáticamente cuando ya se calculó una vez ========= */

  useEffect(() => {
    if (!hasCalculatedOnce || !fechaProveido) return;

    if (recalcTimeout.current) clearTimeout(recalcTimeout.current);
    recalcTimeout.current = setTimeout(() => {
      const res = calcularPlazosCore({
        isoProveido: fechaProveido,
        esperarFirmeza,
        diasFirmeza: Number(diasFirmeza) || 0,
        diasConteo: Number(diasConteo) || 0,
        feriados,
        inhabilUsuario,
        habilForzado,
      });
      setResultado(res);
    }, 150);

    return () => {
      if (recalcTimeout.current) clearTimeout(recalcTimeout.current);
    };
  }, [
    hasCalculatedOnce,
    fechaProveido,
    esperarFirmeza,
    diasFirmeza,
    diasConteo,
    feriados,
    inhabilUsuario,
    habilForzado,
  ]);

  /* ========= Handlers ========= */

  const handleEsperarFirmezaChange = (checked) => {
    setEsperarFirmeza(checked);
    if (!checked) setDiasFirmeza(0);
    else if (Number(diasFirmeza) === 0) setDiasFirmeza(5);
  };

  const handleDiasFirmezaChange = (v) => {
    const n = Number(v) || 0;
    setDiasFirmeza(n);
    setEsperarFirmeza(n > 0);
  };

  const handleAgregarInhabil = (iso) => {
    if (!iso) return;
    if (!inhabilUsuario.includes(iso)) {
      setInhabilUsuario((prev) => [...prev, iso]);
    }
  };

  const handleRemoveInhabil = (iso) => {
    setInhabilUsuario((prev) => prev.filter((d) => d !== iso));
  };

  const handleCalcular = () => {
    if (!fechaProveido) {
      alert('Ingresa la fecha del proveído');
      return;
    }

    const res = calcularPlazosCore({
      isoProveido: fechaProveido,
      esperarFirmeza,
      diasFirmeza: Number(diasFirmeza) || 0,
      diasConteo: Number(diasConteo) || 0,
      feriados,
      inhabilUsuario,
      habilForzado,
    });

    setResultado(res);
    setShowResultado(true);
    setShowCalendarios(true);
    setHasCalculatedOnce(true);
  };

  const handleClickDayInCalendars = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const wd = date.getDay();

    // No tocar fines de semana
    if (wd === 0 || wd === 6) return;

    // 1) Si está como inhábil de usuario, lo volvemos hábil normal
    if (inhabilUsuario.includes(iso)) {
      setInhabilUsuario((prev) => prev.filter((x) => x !== iso));
      return;
    }

    // 2) Si es feriado: forzar hábil o quitar forzado
    if (feriados.includes(iso)) {
      setHabilForzado((prev) =>
        prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]
      );
      return;
    }

    // 3) Hábil normal -> marcar como inhábil de usuario
    setInhabilUsuario((prev) => (prev.includes(iso) ? prev : [...prev, iso]));
  };

  /* ========= Mini-calendario ========= */

  const handleMiniShift = (delta) => {
    setMiniMonthRef((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const miniCalendar = useMemo(() => {
    const y = miniMonthRef.getFullYear();
    const m = miniMonthRef.getMonth();
    const title = miniMonthRef
      .toLocaleString('es-AR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());

    const firstDow = new Date(y, m, 1).getDay(); // 0=Dom
    const daysInM = new Date(y, m + 1, 0).getDate();
    const startPad = firstDow === 0 ? 6 : firstDow - 1;

    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push({ type: 'empty' });

    const todayISO = formatISO(new Date());
    for (let d = 1; d <= daysInM; d++) {
      const cur = new Date(y, m, d, 12, 0, 0);
      const iso = formatISO(cur);
      const wd = cur.getDay();

      const classes = [];
      if (miniSelISO === iso) classes.push('sel');
      if (todayISO === iso) classes.push('hoy');
      if (wd === 0 || wd === 6) classes.push('finSem');
      if (feriados.includes(iso)) classes.push('feriado');
      if (inhabilUsuario.includes(iso)) classes.push('inhabil');

      cells.push({
        type: 'day',
        iso,
        day: d,
        classes,
      });
    }

    const rows = [];
    let row = [];
    cells.forEach((c, idx) => {
      row.push(c);
      if ((idx + 1) % 7 === 0) {
        rows.push(row);
        row = [];
      }
    });
    if (row.length) {
      while (row.length < 7) row.push({ type: 'empty' });
      rows.push(row);
    }

    return { title, rows };
  }, [miniMonthRef, miniSelISO, feriados, inhabilUsuario]);

  const handleMiniDayClick = (iso) => {
    setMiniSelISO(iso);
    setFechaProveido(iso);
  };

  /* ========= Calendarios grandes ========= */

  const generarCalendarioMes = (baseDate, keysMap) => {
    const ref = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    let nombreMes = ref.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
    nombreMes = nombreMes.replace(/^\w/, (c) => c.toUpperCase());

    const primerDia = ref.getDay(); // 0=Dom
    const total = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();

    const rows = [];
    let row = [];

    for (let i = 0; i < primerDia; i++) {
      row.push(null);
    }

    for (let d = 1; d <= total; d++) {
      const cur = new Date(ref.getFullYear(), ref.getMonth(), d, 12, 0, 0);
      const iso = formatISO(cur);
      const wd = cur.getDay();

      const esRehab = habilForzado.includes(iso);
      const classes = [];

      if (!esRehab && feriados.includes(iso)) classes.push('feriado');
      if (!esRehab && inhabilUsuario.includes(iso)) classes.push('inhabil');

      if (keysMap[iso]) classes.push(keysMap[iso]); // notificacion, cargo, vencimiento, mora
      if (wd === 0 || wd === 6) classes.push('finSem');
      if (esRehab) classes.push('rehabil');

      row.push({ iso, day: d, classes });

      if (wd === 6 && d < total) {
        rows.push(row);
        row = [];
      }
    }

    if (row.length) rows.push(row);

    return { nombreMes, rows };
  };

  const calendariosGrandes = useMemo(() => {
    if (!resultado || !resultado.fp || !showCalendarios) return [];

    const { fp, fn, ffc, fv, fm } = resultado;
    const keys = {};
    if (fn) keys[formatISO(fn)] = 'notificacion';
    if (ffc) keys[formatISO(ffc)] = 'cargo';
    if (fv) keys[formatISO(fv)] = 'vencimiento';
    if (fm) keys[formatISO(fm)] = 'mora';

    const meses = [];
    const count = fv && fm ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const md = new Date(fp.getFullYear(), fp.getMonth() + i, 1);
      meses.push(generarCalendarioMes(md, keys));
    }
    return meses;
  }, [resultado, showCalendarios, feriados, inhabilUsuario, habilForzado]);

  /* ========= Cargar juicios cuando se abre el diálogo ========= */

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
        console.error('Error cargando juicios para Plazos Sentencias:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  /* ========= Abrir diálogo Guardar en juicio ========= */

  const handleOpenSaveDialog = () => {
    if (!resultado || !resultado.fn) {
      alert('Primero contá los plazos antes de guardar en un juicio.');
      return;
    }

    const defaultTitle =
      saveTitle || 'Cómputo de plazos de sentencia (fecha de proveído)';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  /* ========= Confirmar guardado en juicio ========= */

  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const isoProveido = fechaProveido || null;
      const isoNotif = resultado?.fn ? formatISO(resultado.fn) : null;
      const isoFirmezaCargo = resultado?.ffc ? formatISO(resultado.ffc) : null;
      const isoVenc = resultado?.fv ? formatISO(resultado.fv) : null;
      const isoMora = resultado?.fm ? formatISO(resultado.fm) : null;

      const payload = {
        tipo: 'plazo_sentencia',

        // fechas clave en DD-MM-YYYY
        fechaProveido: isoProveido ? formatDDMMYYYY(isoProveido) : null,
        fechaNotificacion: isoNotif ? formatDDMMYYYY(isoNotif) : null,
        fechaFirmezaConCargo: isoFirmezaCargo
          ? formatDDMMYYYY(isoFirmezaCargo)
          : null,
        fechaVencimiento: isoVenc ? formatDDMMYYYY(isoVenc) : null,
        fechaMora: isoMora ? formatDDMMYYYY(isoMora) : null,

        // parámetros del cálculo
        esperarFirmeza: !!esperarFirmeza,
        diasFirmeza: Number(diasFirmeza) || 0,
        diasConteo: Number(diasConteo) || 0,

        // configuración de inhábiles
        diasInhabilesUsuario: inhabilUsuario, // ISO YYYY-MM-DD
        diasHabilForzado: habilForzado, // ISO YYYY-MM-DD
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId: 'plazo_sentencia',
        toolName: 'Plazos de sentencia (proveído)',
        title:
          saveTitle || 'Cómputo de plazos de sentencia (fecha de proveído)',
        notes: saveNotes,
        payload,
      });

      alert('✅ Plazos guardados en el juicio.');
      setSaveDialogOpen(false);
      setSelectedCaseId('');
      setSaveTitle('');
      setSaveNotes('');
    } catch (e) {
      console.error('Error guardando plazos en juicio:', e);
      alert('No se pudo guardar el cálculo de plazos en el juicio.');
    } finally {
      setSavingResult(false);
    }
  };

  /* ========= Render ========= */

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-lg font-semibold text-[#0f2f4b]">
          {/* Podés completar un título si querés */}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error al cargar inhábiles */}
        {errorCarga && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{errorCarga}</span>
          </div>
        )}

        {/* 1) FECHA + MINI CALENDARIO (centrado, ocupando ancho) */}
        <div className="flex justify-center">
          <div className="w-full max-w-[780px] space-y-2">
            <label className="block text-sm font-semibold text-[#0f2f4b] text-center w-full">
              Fecha del proveído: ingresa fecha o selecciona un día en el mini-calendario.
            </label>

            <div className="flex flex-col gap-3 w-full max-w-[420px] mx-auto">
              {/* Input fecha */}
              <Input
                type="date"
                value={fechaProveido}
                onChange={(e) => setFechaProveido(e.target.value)}
                className="text-center placeholder:text-center"
              />

              {/* Mini-calendario */}
              <div className="border border-slate-200 rounded-xl shadow-sm p-3 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <button
                    type="button"
                    onClick={() => handleMiniShift(-1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0f2f4b] text-white shadow"
                  >
                    ‹
                  </button>
                  <strong className="text-xs">{miniCalendar.title}</strong>
                  <button
                    type="button"
                    onClick={() => handleMiniShift(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0f2f4b] text-white shadow"
                  >
                    ›
                  </button>
                </div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr>
                      {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((d) => (
                        <th key={d} className="font-semibold pb-1">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {miniCalendar.rows.map((row, idxRow) => (
                      <tr key={idxRow}>
                        {row.map((cell, idxCell) => {
                          if (!cell || cell.type === 'empty') {
                            return <td key={idxCell} className="h-6" />;
                          }
                          const c = [];
                          if (cell.classes.includes('sel'))
                            c.push('bg-[#0f2f4b] text-white font-bold rounded');
                          if (cell.classes.includes('hoy'))
                            c.push('outline outline-1 outline-[#5EA6D7]');
                          if (cell.classes.includes('finSem')) c.push('bg-slate-100');
                          if (cell.classes.includes('feriado'))
                            c.push('bg-red-400 text-white');
                          if (cell.classes.includes('inhabil'))
                            c.push('bg-indigo-500 text-white');

                          return (
                            <td
                              key={idxCell}
                              className={`h-6 text-center cursor-pointer text-[11px] ${c.join(
                                ' '
                              )}`}
                              onClick={() => handleMiniDayClick(cell.iso)}
                            >
                              {cell.day}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 2) CAMPOS RESTANTES (centrados) */}
        <div className="flex flex-col items-center gap-4">
          {/* Días de espera para firmeza */}
          <div className="w-full max-w-[460px] space-y-1">
            <label className="text-sm font-semibold text-[#0f2f4b]">
              Días de espera para firmeza:
            </label>
            <Input
              type="number"
              min={0}
              value={diasFirmeza}
              onChange={(e) => handleDiasFirmezaChange(e.target.value)}
            />
            <small className="text-xs text-slate-600">
              (Se usará internamente para calcular la <strong>firmeza con cargo</strong>)
            </small>
          </div>

          {/* Checkbox esperar firmeza */}
          <div className="w-full max-w-[460px]">
            <label className="inline-flex items-center text-sm font-semibold text-[#0f2f4b]">
              <input
                type="checkbox"
                className="mr-2 scale-110"
                checked={esperarFirmeza}
                onChange={(e) => handleEsperarFirmezaChange(e.target.checked)}
              />
              Esperar firmeza
            </label>
          </div>

          {/* Días hábiles desde firmeza con cargo */}
          <div className="w-full max-w-[460px] space-y-1">
            <label className="text-sm font-semibold text-[#0f2f4b]">
              Días hábiles a contar desde la firmeza con cargo (opcional):
            </label>
            <Input
              type="number"
              min={0}
              value={diasConteo}
              onChange={(e) => setDiasConteo(Number(e.target.value) || 0)}
            />
          </div>

          {/* Agregar día inhábil */}
          <AgregarInhabilBlock onAgregar={handleAgregarInhabil} color={AZUL} />

          {/* Lista de inhábiles de usuario */}
          <div className="w-full max-w-[460px] text-sm">
            {inhabilUsuario.length === 0 ? (
              <em>No hay días inhábiles agregados.</em>
            ) : (
              <>
                <strong>Días inhábiles agregados:</strong>
                <ul className="flex flex-wrap gap-1 mt-1">
                  {inhabilUsuario.map((iso) => (
                    <li
                      key={iso}
                      className="bg-slate-200 rounded-full px-2 py-0.5 flex items-center"
                    >
                      {toDMY(iso)}
                      <button
                        type="button"
                        className="ml-1 text-xs opacity-70 hover:opacity-100"
                        onClick={() => handleRemoveInhabil(iso)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* 3) BOTÓN CONTAR PLAZOS + BOTÓN GUARDAR EN JUICIO */}
        <div className="flex flex-col gap-2 items-center">
          <Button
            type="button"
            onClick={handleCalcular}
            className="mt-1 font-semibold rounded-lg px-8"
            style={{ backgroundColor: AZUL }}
          >
            Contar plazos
          </Button>

          {/* Diálogo Guardar en juicio */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <div className="w-full max-w-[460px]">
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[#0f2f4b] text-[#0f2f4b] font-semibold"
                  onClick={handleOpenSaveDialog}
                >
                  Guardar en juicio
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Guardar plazos en un juicio</DialogTitle>
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
                    <Input
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Ej: Plazos de sentencia por vencimiento"
                    />
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      value={saveNotes}
                      onChange={(e) => setSaveNotes(e.target.value)}
                      placeholder="Notas sobre firmeza, días contados, feriados considerados, etc."
                      rows={3}
                    />
                  </div>

                  {/* Resumen breve */}
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
                    <p className="font-semibold mb-1">Resumen a guardar</p>
                    <p>
                      Fecha del proveído:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {fechaProveido ? formatDDMMYYYY(fechaProveido) : '—'}
                      </span>
                    </p>
                    <p>
                      Fecha de notificación:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {resultado?.fn
                          ? resultado.fn.toLocaleDateString('es-AR')
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Fecha de firmeza con cargo:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {resultado?.ffc
                          ? resultado.ffc.toLocaleDateString('es-AR')
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Fecha de vencimiento:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {resultado?.fv
                          ? resultado.fv.toLocaleDateString('es-AR')
                          : '—'}
                      </span>
                    </p>
                    <p>
                      Fecha de mora:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {resultado?.fm
                          ? resultado.fm.toLocaleDateString('es-AR')
                          : '—'}
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
                      {savingResult ? 'Guardando…' : 'Guardar en juicio'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </div>
          </Dialog>
        </div>

        {/* 4) RESULTADO + LEYENDA (centrado) */}
        {showResultado && resultado && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="text-sm w-full max-w-[780px]"
              style={{
                background: '#eaf2f8',
                padding: '14px 16px',
                borderRadius: 8,
                borderLeft: `6px solid ${AZUL}`,
              }}
            >
              {resultado.fn && (
                <div>
                  <strong>Fecha de notificación:</strong>{' '}
                  {resultado.fn.toLocaleDateString('es-AR')}
                </div>
              )}
              {resultado.ffc && (
                <div>
                  <strong>Fecha de firmeza con cargo:</strong>{' '}
                  {resultado.ffc.toLocaleDateString('es-AR')}
                </div>
              )}
              {resultado.fv && (
                <div>
                  <strong>Fecha de vencimiento:</strong>{' '}
                  {resultado.fv.toLocaleDateString('es-AR')}
                </div>
              )}
              {resultado.fm && (
                <div>
                  <strong>Fecha de mora:</strong>{' '}
                  {resultado.fm.toLocaleDateString('es-AR')}
                </div>
              )}
            </div>

            <div className="text-center text-xs space-y-2 w-full max-w-[780px]">
              <strong>Leyenda:</strong>
              <div className="mt-1 flex flex-wrap gap-2 justify-center">
                <span className="px-2 py-1 rounded-full text-white font-semibold bg-red-400">
                  Inhábil
                </span>
                <span className="px-2 py-1 rounded-full text-white font-semibold bg-indigo-500">
                  Inhábil judicial
                </span>
                <span className="px-2 py-1 rounded-full font-semibold text-[#0f2f4b] bg-[#e5d0ff]">
                  Notificación
                </span>
                <span className="px-2 py-1 rounded-full font-semibold text-[#0f2f4b] bg-[#cce5ff]">
                  Firmeza con cargo
                </span>
                <span className="px-2 py-1 rounded-full text-white font-semibold bg-[#0f2f4b]">
                  Vencimiento
                </span>
                <span className="px-2 py-1 rounded-full font-semibold text-[#0f2f4b] bg-[#ffcccc]">
                  Mora
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5) OBSERVACIÓN + CALENDARIOS GRANDES (centrados) */}
        {showCalendarios && resultado && (
          <>
            <div className="mt-2 text-xs bg-[#eaf4fc] border border-[#cfe4fa] border-l-4 border-l-[#5EA6D7] rounded-lg px-3 py-2 text-[#0f2f4b] max-w-[980px] mx-auto">
              💡 <strong>Observación:</strong> si considerás que un día es hábil o inhábil,
              hacé clic sobre ese día en el calendario. Se recalculará automáticamente.
            </div>

            <div className="mt-3 space-y-4 max-w-[980px] mx-auto">
              {calendariosGrandes.map((mes, idx) => (
                <div key={idx}>
                  <h4 className="mt-2 text-sm font-semibold text-[#0f2f4b]">
                    {mes.nombreMes}
                  </h4>
                  <table className="w-full border-collapse text-xs mt-1">
                    <thead>
                      <tr>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                          <th key={d} className="border border-slate-200 py-1">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mes.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((c, cIdx) => {
                            if (!c) {
                              return (
                                <td
                                  key={cIdx}
                                  className="border border-slate-200 h-8 text-center"
                                />
                              );
                            }

                            const classes = [
                              'border border-slate-200 h-8 text-center cursor-pointer',
                            ];

                            if (c.classes.includes('feriado'))
                              classes.push('bg-red-400 text-white');
                            if (c.classes.includes('inhabil'))
                              classes.push('bg-indigo-500 text-white');
                            if (c.classes.includes('notificacion'))
                              classes.push(
                                'bg-[#e5d0ff] text-[#0f2f4b] font-semibold'
                              );
                            if (c.classes.includes('cargo'))
                              classes.push(
                                'bg-[#cce5ff] text-[#0f2f4b] font-semibold'
                              );
                            if (c.classes.includes('vencimiento'))
                              classes.push('bg-[#0f2f4b] text-white font-semibold');
                            if (c.classes.includes('mora'))
                              classes.push(
                                'bg-[#ffcccc] text-[#0f2f4b] font-semibold'
                              );
                            if (c.classes.includes('finSem'))
                              classes.push('bg-slate-100 text-[#0f2f4b]');
                            if (c.classes.includes('rehabil'))
                              classes.push(
                                'outline outline-2 outline-emerald-500 bg-emerald-50'
                              );

                            return (
                              <td
                                key={cIdx}
                                className={classes.join(' ')}
                                onClick={() => handleClickDayInCalendars(c.iso)}
                              >
                                {c.day}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* Bloque “Agregar día inhábil” separado para que quede más limpio arriba */
function AgregarInhabilBlock({ onAgregar, color }) {
  const [inputDate, setInputDate] = useState('');

  const handleAdd = () => {
    if (!inputDate) return;
    onAgregar(inputDate);
    setInputDate('');
  };

  return (
    <div className="w-full max-w-[460px] space-y-1">
      <label className="text-sm font-semibold text-[#0f2f4b]">
        Agregar día inhábil:
      </label>
      <div className="flex">
        <Input
          type="date"
          value={inputDate}
          onChange={(e) => setInputDate(e.target.value)}
          className="rounded-r-none border-r-0"
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{ backgroundColor: color }}
          className="px-4 text-white font-semibold rounded-r-md border border-l-0 border-slate-300"
        >
          +
        </button>
      </div>
    </div>
  );
}
