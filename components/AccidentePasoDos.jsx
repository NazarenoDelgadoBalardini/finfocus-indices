// src/components/ActualizarIBM.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FinancialData } from '@/entities/FinancialData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, FileText } from 'lucide-react';
import { useAccidenteContext } from '@/components/AccidenteContext';

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

import { Textarea } from '@/components/ui/textarea';

const AZUL = '#0f2f4b';

// =====================
// Helpers generales
// =====================

const fmtARS = (n) =>
  n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (x) =>
  `${x.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

// Formato input moneda estilo FINFOCUS
const formatMonedaInput = (raw) => {
  const soloDigitos = String(raw || '').replace(/\D/g, '');
  if (!soloDigitos) return '';
  const numero = parseFloat(soloDigitos) / 100;
  return fmtARS(numero);
};

const parseMoneda = (str) => {
  if (!str) return 0;
  const limpio = String(str)
    .replace(/[^0-9,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(limpio) || 0;
};

// parseo genérico números tipo "107,9475"
const parseNumberAR = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const sinMiles = s.replace(/\./g, '');
  const normalizado = sinMiles.replace(',', '.');
  const n = parseFloat(normalizado);
  return Number.isNaN(n) ? null : n;
};

// meses RIPTE (sept con "t")
const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
];

// "YYYY-MM-DD" -> "mmm-yy" (ej: "2025-09-10" -> "sept-25")
const claveMensualRIPTE = (isoDate) => {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m) return null;
  const mes = MESES[new Date(y, m - 1, d || 1).getMonth()];
  const yy = String(y).slice(-2);
  return `${mes}-${yy}`.toLowerCase();
};

const daysInMonth = (year, month) =>
  new Date(year, month, 0).getDate(); // month = 1..12

// Para mostrar claves "YYYY-MM-DD" de tasa activa más lindo
const formatKey = (key) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [y, m, d] = key.split('-');
    return `${d}-${m}-${y}`;
  }
  return key;
};

// agrega alias sep/sept por si vienen distintos
const unifySeptKeys = (obj) => {
  const map = { ...obj };   // 👈 copiamos las claves
  Object.keys(map).forEach((k) => {
    if (k.startsWith('sept-') && !map[`sep-${k.slice(5)}`]) {
      map[`sep-${k.slice(5)}`] = map[k];
    }
    if (k.startsWith('sep-') && !map[`sept-${k.slice(4)}`]) {
      map[`sept-${k.slice(4)}`] = map[k];
    }
  });
  return map;
};

// =====================
// Carga índices
// =====================

async function loadIndiceFromFinancialData(category) {
  const records = await FinancialData.filter(
    {
      category,
      isActive: true,
    },
    '-lastSync',
    1
  );

  if (!records || records.length === 0) return {};

  const rec = records[0];
  const headers = rec.headers || [];
  const headersLower = headers.map((h) => (h || '').toString().toLowerCase());

  // Buscamos columna de clave (fecha / mes) y valor
  let idxClave = 0;
  let idxValor = 1;

  const idxFecha = headersLower.findIndex((h) =>
    ['fecha', 'mes', 'periodo', 'período'].some((kw) => h.includes(kw))
  );
  if (idxFecha !== -1) idxClave = idxFecha;

  const idxIndice = headersLower.findIndex(
    (h) =>
      (h.includes('indice') ||
        h.includes('índice') ||
        h.includes('ripte') ||
        h.includes('valor')) &&
      !h.includes('%') &&
      !h.includes('var')
  );
  if (idxIndice !== -1) idxValor = idxIndice;

  const map = {};
  (rec.data || []).forEach((row) => {
    const rawKey = row[idxClave];
    const rawVal = row[idxValor];
    if (rawKey == null || rawVal == null) return;

    const key = String(rawKey).trim().toLowerCase();
    const num = parseNumberAR(rawVal);
    if (num != null) map[key] = num;
  });

  return map;
}

// =====================
// Componente principal
// =====================

export default function AccidentePasoDos({ toolId, toolName }) {
  const { state, updateState } = useAccidenteContext();

  const [fechaInicio, setFechaInicio] = useState(
    state.fechaInicio || state.fechaAccidente || ''
  );
  const [fechaFin, setFechaFin] = useState(state.fechaFin || '');
  const [montoStr, setMontoStr] = useState(
    state.resultadoIBM?.ibm ? fmtARS(state.resultadoIBM.ibm) : ''
  );

  const [activeTab, setActiveTab] = useState('simple');

  const [ripte0, setRipte0] = useState({});
  const [ripte1, setRipte1] = useState({});
  const [ripte2, setRipte2] = useState({});
  const [activa, setActiva] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [resultSimple, setResultSimple] = useState(null);
  const [resultPond, setResultPond] = useState(null);
  const [resultActiva, setResultActiva] = useState(null);

  // IBM numérico para guardar/usar en cálculos
  const montoIBM = useMemo(() => parseMoneda(montoStr), [montoStr]);

  // ===== Guardar en juicio – Paso 2 =====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  const canSavePaso2 = useMemo(
    () =>
      !!fechaInicio &&
      !!fechaFin &&
      !!montoIBM &&
      ((resultSimple && !resultSimple.error) ||
        (resultPond && !resultPond.error) ||
        (resultActiva && !resultActiva.error)),
    [fechaInicio, fechaFin, montoIBM, resultSimple, resultPond, resultActiva]
  );

  const hayIndices = useMemo(
    () =>
      Object.keys(ripte0).length ||
      Object.keys(ripte1).length ||
      Object.keys(ripte2).length ||
      Object.keys(activa).length,
    [ripte0, ripte1, ripte2, activa]
  );

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        setLoading(true);
        setLoadError('');

        const [r0, r1, r2, ac] = await Promise.all([
          loadIndiceFromFinancialData('ripte'),
          loadIndiceFromFinancialData('ripte1'),
          loadIndiceFromFinancialData('ripte2'),
          loadIndiceFromFinancialData('tasa_activa_bna'),
        ]);

        if (cancelled) return;

        setRipte0(unifySeptKeys(r0));
        setRipte1(unifySeptKeys(r1));
        setRipte2(unifySeptKeys(r2));
        setActiva(ac);
      } catch (err) {
        console.error('Error cargando índices:', err);
        if (!cancelled) {
          setLoadError('No se pudieron cargar los índices desde FinancialData.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

    // Cargar juicios cuando se abre el diálogo de guardado
  useEffect(() => {
    if (!saveDialogOpen || availableCases.length > 0) return;

    const loadCases = async () => {
      try {
        setCasesLoading(true);
        setLoadCasesError(null);

        const user = await User.me();
        const cases = await Case.filter({ userId: user.id }, '-createdAt');
        setAvailableCases(cases || []);
      } catch (e) {
        console.error('Error cargando juicios para guardar Paso 2:', e);
        setLoadCasesError('No se pudieron cargar los juicios.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, availableCases.length]);

  // =====================
  // Cálculos
  // =====================

  const calcularSimple = () => {
    if (!fechaInicio || !fechaFin) {
      setResultSimple({ error: 'Debés ingresar la fecha de inicio y final.' });
      return;
    }
    if (fechaInicio > fechaFin) {
      setResultSimple({ error: 'La fecha de inicio no puede ser mayor a la final.' });
      return;
    }
    if (!montoIBM || montoIBM <= 0) {
      setResultSimple({ error: 'Ingresá un IBM válido mayor a cero.' });
      return;
    }

    const kI = claveMensualRIPTE(fechaInicio);
    const kF = claveMensualRIPTE(fechaFin);
    if (!kI || !kF) {
      setResultSimple({ error: 'No se pudo determinar la clave RIPTE de las fechas.' });
      return;
    }

    let data = ripte0;
    let fuente = 'original';

    if (!(kI in data) || !(kF in data)) {
      if (kI in ripte1 && kF in ripte1) {
        data = ripte1;
        fuente = 't+1';
      } else if (kI in ripte2 && kF in ripte2) {
        data = ripte2;
        fuente = 't+2';
      } else {
        setResultSimple({
          error: `No hay datos RIPTE disponibles para las claves ${kI} y ${kF}.`,
        });
        return;
      }
    }

    const vi = data[kI];
    const vf = data[kF];
    const pct = ((vf / vi) - 1) * 100;
    const actualizado = montoIBM * (1 + pct / 100);

    setResultSimple({
      fuente,
      kI,
      kF,
      vi,
      vf,
      pct,
      actualizado,
    });
  };

  const calcularPonderado = () => {
    if (!fechaInicio || !fechaFin) {
      setResultPond({ error: 'Debés ingresar la fecha de inicio y final.' });
      return;
    }
    if (fechaInicio > fechaFin) {
      setResultPond({ error: 'La fecha de inicio no puede ser mayor a la final.' });
      return;
    }
    if (!montoIBM || montoIBM <= 0) {
      setResultPond({ error: 'Ingresá un IBM válido mayor a cero.' });
      return;
    }

    const kI = claveMensualRIPTE(fechaInicio);
    const kF = claveMensualRIPTE(fechaFin);
    if (!kI || !kF) {
      setResultPond({ error: 'No se pudo determinar la clave RIPTE de las fechas.' });
      return;
    }

    let data = ripte0;
    let corr = '';
    if (!(kI in data) || !(kF in data)) {
      if (kI in ripte1 && kF in ripte1) {
        data = ripte1;
        corr = '+1 mes';
      } else if (kI in ripte2 && kF in ripte2) {
        data = ripte2;
        corr = '+2 meses';
      } else {
        setResultPond({
          error: `No hay datos RIPTE para las claves ${kI} y ${kF}.`,
        });
        return;
      }
    }

    const [yI, mI, dI] = fechaInicio.split('-').map(Number);
    const [yF, mF, dF] = fechaFin.split('-').map(Number);

    if (!yI || !mI || !yF || !mF) {
      setResultPond({ error: 'Fechas inválidas.' });
      return;
    }

    let suma = 0;
    const detalles = [];

    // tramo inicial proporcional
    const prevI = new Date(yI, mI - 2, 1);
    const kPrevI = claveMensualRIPTE(prevI.toISOString().slice(0, 10));
    if (!kPrevI || !(kPrevI in data) || !(kI in data)) {
      setResultPond({
        error: 'No hay datos RIPTE suficientes para el tramo inicial.',
      });
      return;
    }
    const varI = ((data[kI] / data[kPrevI]) - 1) * 100;
    const diasMesI = daysInMonth(yI, mI);
    const pesoI = (diasMesI - dI + 1) / diasMesI;
    suma += varI * pesoI;
    detalles.push(
      `${kPrevI} → ${kI}: ${fmtPct(varI)} × ${pesoI.toFixed(3)} = ${fmtPct(
        varI * pesoI
      )}`
    );

    // meses intermedios completos
    let cur = new Date(yI, mI - 1, 1);
    const endMonth = new Date(yF, mF - 1, 1);
    cur.setMonth(cur.getMonth() + 1); // empezamos mes posterior al inicio

    while (cur < endMonth) {
      const kCur = claveMensualRIPTE(cur.toISOString().slice(0, 10));
      const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
      const kPrev = claveMensualRIPTE(prev.toISOString().slice(0, 10));

      if (!kCur || !kPrev || !(kCur in data) || !(kPrev in data)) {
        setResultPond({
          error:
            'Faltan datos RIPTE para alguno de los meses intermedios del período.',
        });
        return;
      }

      const v = ((data[kCur] / data[kPrev]) - 1) * 100;
      suma += v;
      detalles.push(`${kPrev} → ${kCur}: ${fmtPct(v)} (completo)`);
      cur.setMonth(cur.getMonth() + 1);
    }

    // tramo final proporcional
    const prevF = new Date(yF, mF - 2, 1);
    const kPrevF = claveMensualRIPTE(prevF.toISOString().slice(0, 10));
    if (!kPrevF || !(kPrevF in data) || !(kF in data)) {
      setResultPond({
        error: 'No hay datos RIPTE suficientes para el tramo final.',
      });
      return;
    }
    const varF = ((data[kF] / data[kPrevF]) - 1) * 100;
    const diasMesF = daysInMonth(yF, mF);
    const pesoF = dF / diasMesF;
    suma += varF * pesoF;
    detalles.push(
      `${kPrevF} → ${kF}: ${fmtPct(varF)} × ${pesoF.toFixed(3)} = ${fmtPct(
        varF * pesoF
      )}`
    );

    const actualizado = montoIBM * (1 + suma / 100);

    setResultPond({
      corr,
      kI,
      kF,
      suma,
      detalles,
      actualizado,
      data,
    });
  };

  const calcularActiva = () => {
    if (!fechaInicio || !fechaFin) {
      setResultActiva({ error: 'Debés ingresar la fecha de inicio y final.' });
      return;
    }
    if (fechaInicio > fechaFin) {
      setResultActiva({ error: 'La fecha de inicio no puede ser mayor a la final.' });
      return;
    }
    if (!montoIBM || montoIBM <= 0) {
      setResultActiva({ error: 'Ingresá un IBM válido mayor a cero.' });
      return;
    }

    const i1 = activa[fechaInicio.toLowerCase()];
    const i2 = activa[fechaFin.toLowerCase()];
    if (i1 == null || i2 == null) {
      setResultActiva({
        error: 'No hay datos de Tasa Activa BNA para alguna de las fechas.',
      });
      return;
    }

    const vari = i2 - i1; // definición original
    const intereses = montoIBM * (vari / 100);
    const total = montoIBM + intereses;

    setResultActiva({
      fi: fechaInicio,
      ff: fechaFin,
      i1,
      i2,
      vari,
      total,
    });
  };

  const handleCalcular = () => {
    calcularSimple();
    calcularPonderado();
    calcularActiva();
  };

    const handleOpenSaveDialogPaso2 = () => {
    if (!canSavePaso2) return;

    setSaveDialogOpen(true);

    if (!saveTitle) {
      setSaveTitle(
        toolName
          ? `${toolName} – Paso 2: Actualizar IBM`
          : 'Accidente laboral – Paso 2: Actualizar IBM'
      );
    }
  };

  const handleConfirmSavePaso2 = async () => {
    if (!selectedCaseId || !canSavePaso2) return;

    try {
      setSavingResult(true);

      const user = await User.me();

      const payload = {
        tipo: 'accidente_paso_2',
        fechaInicio,
        fechaFin,
        montoIBM,
        ibmRipteSimple:
          resultSimple && !resultSimple.error ? resultSimple.actualizado : null,
        ibmRiptePonderado:
          resultPond && !resultPond.error ? resultPond.actualizado : null,
        ibmTasaActiva:
          resultActiva && !resultActiva.error ? resultActiva.total : null,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Accidente – Paso 2: Actualizar IBM',
        title:
          saveTitle ||
          'Paso 2 – Actualización de IBM (RIPTE simple, ponderado y tasa activa)',
        notes: saveNotes,
        payload,
      });

      setSaveDialogOpen(false);
      setSelectedCaseId('');
      setSaveTitle('');
      setSaveNotes('');
    } catch (e) {
      console.error('Error guardando resultado Paso 2:', e);
      alert('No se pudo guardar el resultado en el juicio.');
    } finally {
      setSavingResult(false);
    }
  };

  // Guardar en contexto cuando cambien los resultados
useEffect(() => {
  if (resultSimple || resultPond || resultActiva) {
    updateState({
      fechaInicio,
      fechaFin,
      montoIBM,
      resultSimple,
      resultPond,
      resultActiva,
    });
  }
}, [
  resultSimple,
  resultPond,
  resultActiva,
  fechaInicio,
  fechaFin,
  montoIBM,
  updateState,
]);

  // =====================
  // Render
  // =====================

  return (
    <div className="w-full max-w-none mx-auto px-4 md:px-6">
      <Card className="border-2 border-[#0f2f4b] rounded-2xl shadow-lg">
        <CardHeader className="pt-6 pb-4 text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl md:text-2xl">
            <Calculator className="h-6 w-6 text-[#0f2f4b]" />
            Paso 2️⃣: Actualizar IBM conforme:
          </CardTitle>
          <p className="mt-2 text-xs md:text-sm text-slate-600">
            Seleccioná el método de actualización y cargá las fechas + IBM una sola
            vez. Los tres métodos se recalculan juntos.
          </p>

          <div className="mt-3 flex justify-center">
            {loading && (
              <span className="text-xs md:text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                Cargando índices desde FinancialData…
              </span>
            )}
            {!loading && hayIndices && !loadError && (
              <span className="text-xs md:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                ✅ Índices cargados correctamente
              </span>
            )}
            {!loading && loadError && (
              <span className="text-xs md:text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                {loadError}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200 flex text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('simple')}
              className={`flex-1 px-3 py-2 font-medium text-center ${
                activeTab === 'simple'
                  ? 'border-b-2 border-[#0f2f4b] text-[#0f2f4b]'
                  : 'text-gray-500 hover:text-[#0f2f4b]'
              }`}
            >
              DNU 669/19
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ponderado')}
              className={`flex-1 px-3 py-2 font-medium text-center ${
                activeTab === 'ponderado'
                  ? 'border-b-2 border-[#0f2f4b] text-[#0f2f4b]'
                  : 'text-gray-500 hover:text-[#0f2f4b]'
              }`}
            >
              Res. 332/23
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activa')}
              className={`flex-1 px-3 py-2 font-medium text-center ${
                activeTab === 'activa'
                  ? 'border-b-2 border-[#0f2f4b] text-[#0f2f4b]'
                  : 'text-gray-500 hover:text-[#0f2f4b]'
              }`}
            >
              Art. 11 Ley 27.348
            </button>
          </div>

          {/* Inputs compartidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">📅 Fecha inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">📅 Fecha final</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">💵 IBM ($)</Label>
              <Input
                type="text"
                placeholder="$ 0,00"
                value={montoStr}
                onChange={(e) => setMontoStr(formatMonedaInput(e.target.value))}
                className="text-sm text-left"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCalcular}
            disabled={loading || !hayIndices}
            className="w-full bg-[#0f2f4b] hover:bg-[#0b2338]"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Calcular actualización (los 3 métodos)
          </Button>

                    {/* Guardar en juicio – Paso 2 */}
          <div className="mt-3 flex justify-end">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSavePaso2}
                  className="flex items-center gap-2 border-[#0f2f4b] text-[#0f2f4b]"
                  onClick={handleOpenSaveDialogPaso2}
                >
                  <FileText className="h-4 w-4" />
                  Guardar en juicio (Paso 2)
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Guardar resultado en un juicio</DialogTitle>
                  <DialogDescription>
                    Se guardarán la fecha de inicio y fin, el IBM base y el IBM
                    actualizado por los tres métodos (RIPTE simple, RIPTE
                    ponderado y tasa activa BNA).
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-600">
                      Seleccioná el juicio
                    </Label>
                    <Select
                      value={selectedCaseId}
                      onValueChange={setSelectedCaseId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            casesLoading
                              ? 'Cargando juicios...'
                              : 'Elegí un juicio'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title || c.caseNumber || 'Juicio sin título'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {loadCasesError && (
                      <p className="mt-1 text-xs text-red-600">
                        {loadCasesError}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">
                      Título del resultado
                    </Label>
                    <Input
                      type="text"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder="Ej: Paso 2 – Actualización de IBM"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">
                      Notas (opcional)
                    </Label>
                    <Textarea
                      rows={3}
                      value={saveNotes}
                      onChange={(e) => setSaveNotes(e.target.value)}
                      placeholder="Agregá algún detalle si lo necesitás..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSaveDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="bg-[#0f2f4b] hover:bg-[#0b2338]"
                      disabled={!selectedCaseId || savingResult}
                      onClick={handleConfirmSavePaso2}
                    >
                      {savingResult ? 'Guardando...' : 'Guardar en juicio'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>


          {/* Panel RIPTE simple */}
          {activeTab === 'simple' && (
            <div className="mt-5 text-sm">
              <h2 className="text-lg font-bold text-center text-[#0f2f4b] mb-3">
                Variación simple RIPTE
              </h2>
              {resultSimple?.error && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {resultSimple.error}
                </div>
              )}
              {resultSimple && !resultSimple.error && (
                <div className="mt-3 p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-full bg-blue-100 text-blue-700 text-sm">
                      📈
                    </span>
                    <p className="font-semibold text-[#0f2f4b]">
                      Fuente: RIPTE{' '}
                      {resultSimple.fuente === 'original'
                        ? 'original'
                        : `(${resultSimple.fuente})`}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice inicio</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {resultSimple.kI}:{' '}
                        {resultSimple.vi.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice final</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {resultSimple.kF}:{' '}
                        {resultSimple.vf.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center py-4 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-500">Variación RIPTE</p>
                      <p className="mt-1 text-xl font-bold text-indigo-700">
                        {fmtPct(resultSimple.pct)}
                      </p>
                    </div>
                    <div className="text-center py-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-500">IBM actualizado</p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {fmtARS(resultSimple.actualizado)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel RIPTE ponderado */}
          {activeTab === 'ponderado' && (
            <div className="mt-5 text-sm">
              <h2 className="text-lg font-bold text-center text-[#0f2f4b] mb-3">
                Suma de variaciones ponderadas RIPTE
              </h2>
              {resultPond?.error && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {resultPond.error}
                </div>
              )}
              {resultPond && !resultPond.error && (
                <div className="mt-3 p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm space-y-5">
                  {resultPond.corr && (
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-full bg-yellow-100 text-yellow-700 text-sm">
                        ⚠️
                      </span>
                      <p className="font-semibold text-[#0f2f4b]">
                        Fuente: RIPTE {resultPond.corr}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice inicio</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {resultPond.kI}:{' '}
                        {resultPond.data[resultPond.kI].toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice final</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {resultPond.kF}:{' '}
                        {resultPond.data[resultPond.kF].toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <details className="bg-white border border-gray-200 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium">
                      🔍 Ver detalles de variaciones mensuales
                    </summary>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-gray-700 text-xs md:text-sm">
                      {resultPond.detalles.map((d, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: d }} />
                      ))}
                    </ul>
                  </details>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center py-4 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-500">Suma de variaciones</p>
                      <p className="mt-1 text-xl font-bold text-indigo-700">
                        {fmtPct(resultPond.suma)}
                      </p>
                    </div>
                    <div className="text-center py-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-500">IBM actualizado</p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {fmtARS(resultPond.actualizado)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Panel Tasa Activa */}
          {activeTab === 'activa' && (
            <div className="mt-5 text-sm">
              <h2 className="text-lg font-bold text-center text-[#0f2f4b] mb-3">
                Tasa Activa Banco Nación
              </h2>
              {resultActiva?.error && (
                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {resultActiva.error}
                </div>
              )}
              {resultActiva && !resultActiva.error && (
                <div className="mt-3 p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm space-y-5">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-full bg-blue-100 text-blue-700 text-sm">
                      💧
                    </span>
                    <p className="font-semibold text-[#0f2f4b]">
                      Fuente: Tasa activa BNA 30 días
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice inicio</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {formatKey(resultActiva.fi)}:{' '}
                        {resultActiva.i1.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="p-4 bg-[#0f2f4b]/10 rounded-lg">
                      <p className="text-xs text-gray-500">Índice final</p>
                      <p className="font-bold text-[#0f2f4b]">
                        {formatKey(resultActiva.ff)}:{' '}
                        {resultActiva.i2.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center py-4 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-500">Variación</p>
                      <p className="mt-1 text-xl font-bold text-indigo-700">
                        {resultActiva.vari.toFixed(2).replace('.', ',')}%
                      </p>
                    </div>
                    <div className="text-center py-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-500">Total (IBM + intereses)</p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {fmtARS(resultActiva.total)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}