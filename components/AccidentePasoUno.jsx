// ===============================
// Imports LIMPIOS – CalculadoraIBM
// ===============================

import React, { useEffect, useMemo, useState } from 'react';

const AZUL = '#0f2f4b';

// UI – shadcn
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Icons
import { Calendar, Calculator, Info, RefreshCw, FileText } from 'lucide-react';

// Data
import { FinancialData } from '@/entities/FinancialData';
import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

// Contexto
import { useAccidenteContext } from '@/components/AccidenteContext';



// ===============================
// Helpers generales
// ===============================

// Formateo moneda AR en input (similar a HTML original)
const formatMonedaInput = (raw) => {
  let valor = String(raw || '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/[^0-9]/g, '');
  if (!valor) return '';
  const numero = parseFloat(valor) / 100;
  return (
    '$ ' +
    numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// Parsear moneda AR de string "$ 12.345,67" a número
const parseMoneda = (str) => {
  if (!str) return NaN;
  const limpio = String(str)
    .replace(/[^0-9,]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  return parseFloat(limpio);
};

// Días corridos de un mes "YYYY-MM"
const diasDelMesCorridos = (yyyyMm) => {
  if (!yyyyMm) return 0;
  const [year, month] = yyyyMm.split('-').map(Number);
  if (!year || !month) return 0;
  return new Date(year, month, 0).getDate();
};

// Días hábiles (lun-vie) de un mes "YYYY-MM"
const diasHabilesDelMes = (yyyyMm) => {
  if (!yyyyMm) return 0;
  const [Y, M] = yyyyMm.split('-').map(Number);
  if (!Y || !M) return 0;
  const total = new Date(Y, M, 0).getDate();
  let hab = 0;
  for (let d = 1; d <= total; d++) {
    const wd = new Date(Y, M - 1, d).getDay(); // 0 dom, 6 sáb
    if (wd !== 0 && wd !== 6) hab++;
  }
  return hab;
};

// Mapa de meses, con caso especial "sept"
const MESES_RIPTE = [
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
].map((m) => (m === 'sep' ? 'sept' : m));

// Clave RIPTE tipo "ene-25" / "sept-25" a partir de fecha ISO "YYYY-MM-DD"
const getClaveRIPTE = (isoDate) => {
  if (!isoDate) return null;
  const [year, month] = isoDate.substring(0, 7).split('-').map(Number);
  if (!year || !month) return null;
  const mesStr = MESES_RIPTE[month - 1] || 'ene';
  const yy = String(year).slice(-2);
  return `${mesStr}-${yy}`.toLowerCase();
};

// Parseo robusto de números AR (para RIPTE)
const parseNumberAR = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
};

const DIAS_CORRIDOS_ANIO = 365;
const DIAS_CORRIDOS_MES_PROM = 30.4;
const DIAS_HABILES_ANIO = 260;
const DIAS_HABILES_MES_PROM = 22;

export default function CalculadoraIBM({ toolName, toolId }) {
  const { state, updateState } = useAccidenteContext();

  // ===============================
  // State principal - ahora sincronizado con contexto
  // ===============================
  const [fechaAccidente, setFechaAccidente] = useState(state.fechaAccidente || '');
  const [rows, setRows] = useState(state.rows || []);
  const [nextId, setNextId] = useState(state.nextId || 0);

  const [ripteMap, setRipteMap] = useState({});
  const [loadingRipte, setLoadingRipte] = useState(true);
  const [ripteError, setRipteError] = useState('');

  const [previo27348, setPrevio27348] = useState(state.previo27348 || false);
  const [modoHabiles, setModoHabiles] = useState(state.modoHabiles || false);

  const [resultadoIBM, setResultadoIBM] = useState(state.resultadoIBM || null);
  const [observacionesModo, setObservacionesModo] = useState('');

  // ===== Guardar en juicio – Paso 1 =====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // Sincronizar cambios con el contexto
  useEffect(() => {
    updateState({
      fechaAccidente,
      rows,
      nextId,
      previo27348,
      modoHabiles,
      resultadoIBM,
    });
  }, [fechaAccidente, rows, nextId, previo27348, modoHabiles, resultadoIBM]);

  // ===============================
  // Carga RIPTE desde FinancialData
  // ===============================
  useEffect(() => {
    const loadRipte = async () => {
      setLoadingRipte(true);
      setRipteError('');
      try {
        const allData = await FinancialData.filter(
          {
            category: 'ripte',
            isActive: true,
          },
          '-lastSync',
          1
        );

        if (!allData || allData.length === 0) {
          setRipteError('No se encontraron datos de RIPTE en FinancialData.');
          setRipteMap({});
          return;
        }

        const rec = allData[0];
        const headers = rec.headers || [];
        const headersLower = headers.map((h) => (h || '').toString().toLowerCase());

        // Buscamos columna de clave (mes) y de índice
        let idxClave = 0;
        let idxValor = 1;

        const idxFecha = headersLower.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('mes') ||
            h.includes('periodo') ||
            h.includes('período')
        );
        if (idxFecha !== -1) idxClave = idxFecha;

        const idxIndice = headersLower.findIndex(
          (h) =>
            (h.includes('indice') ||
              h.includes('índice') ||
              h.includes('ripte')) &&
            !h.includes('%') &&
            !h.includes('var') &&
            !h.includes('variación') &&
            !h.includes('variacion')
        );
        if (idxIndice !== -1) idxValor = idxIndice;

        const map = {};
        if (rec.data && Array.isArray(rec.data)) {
          for (const row of rec.data) {
            const claveRaw = row[idxClave];
            const valRaw = row[idxValor];
            if (!claveRaw || valRaw == null) continue;

            const clave = String(claveRaw).trim().toLowerCase(); // ej "jul-25" / "sept-25"
            const val = parseNumberAR(valRaw);
            if (val != null) {
              map[clave] = val;
            }
          }
        }

        setRipteMap(map);
        if (Object.keys(map).length === 0) {
          setRipteError('No se pudieron mapear índices RIPTE desde la serie.');
        }
      } catch (e) {
        console.error('Error cargando RIPTE desde FinancialData:', e);
        setRipteError('Error cargando RIPTE. Verificá la configuración de la serie "ripte".');
        setRipteMap({});
      } finally {
        setLoadingRipte(false);
      }
    };

    loadRipte();
  }, []);

    // ===============================
  // Cargar juicios para guardar Paso 1
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
        console.error('Error cargando juicios para guardar IBM Paso 1:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // ===============================
  // Helpers de filas
  // ===============================
  const agregarFila = (prefMes = '') => {
    const diasBase = modoHabiles
      ? diasHabilesDelMes(prefMes)
      : diasDelMesCorridos(prefMes);

    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        mes: prefMes,
        monto: '',
        diasMes: previo27348 ? diasBase : 0,
        diasTrab: previo27348 ? diasBase : 0,
      },
    ]);
    setNextId((id) => id + 1);
  };

  const eliminarFila = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMesChange = (id, nuevoMes) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const diasBase = modoHabiles
          ? diasHabilesDelMes(nuevoMes)
          : diasDelMesCorridos(nuevoMes);

        // Reescalamos días trabajados si ya había datos
        let nuevoDiasTrab = r.diasTrab || 0;
        if (previo27348) {
          if (r.diasMes && r.diasTrab) {
            nuevoDiasTrab = Math.round((r.diasTrab / r.diasMes) * diasBase);
            if (nuevoDiasTrab < 0) nuevoDiasTrab = 0;
            if (nuevoDiasTrab > diasBase) nuevoDiasTrab = diasBase;
          } else {
            nuevoDiasTrab = diasBase;
          }
        } else {
          nuevoDiasTrab = 0;
        }

        return {
          ...r,
          mes: nuevoMes,
          diasMes: previo27348 ? diasBase : 0,
          diasTrab: previo27348 ? nuevoDiasTrab : 0,
        };
      })
    );
  };

  const handleMontoChange = (id, raw) => {
    const formateado = formatMonedaInput(raw);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, monto: formateado } : r))
    );
  };

  const handleDiasMesChange = (id, value) => {
    const v = parseInt(value || '0', 10) || 0;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              diasMes: v,
              diasTrab: r.diasTrab > v ? v : r.diasTrab,
            }
          : r
      )
    );
  };

  const handleDiasTrabChange = (id, value) => {
    const v = parseInt(value || '0', 10) || 0;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              diasTrab:
                v < 0
                  ? 0
                  : r.diasMes && v > r.diasMes
                  ? r.diasMes
                  : v,
            }
          : r
      )
    );
  };

  // Si cambia el modo (háblies/corridos) y estamos en PREVIO 27.348, reacomodamos días
  useEffect(() => {
    if (!previo27348) return;

    setRows((prev) =>
      prev.map((r) => {
        if (!r.mes) return r;
        const dias = modoHabiles
          ? diasHabilesDelMes(r.mes)
          : diasDelMesCorridos(r.mes);

        const oldDiasMes = r.diasMes || 0;
        const oldDiasTrab = r.diasTrab || 0;

        let nuevoTrab;
        if (oldDiasMes > 0 && oldDiasTrab > 0) {
          nuevoTrab = Math.round((oldDiasTrab / oldDiasMes) * dias);
          if (nuevoTrab < 0) nuevoTrab = 0;
          if (nuevoTrab > dias) nuevoTrab = dias;
        } else {
          nuevoTrab = dias;
        }

        return {
          ...r,
          diasMes: dias,
          diasTrab: nuevoTrab,
        };
      })
    );
  }, [modoHabiles, previo27348]);

  // Al activar/desactivar PREVIO 27.348, mostramos/ocultamos días
  const togglePrevio27348 = () => {
    setPrevio27348((prev) => {
      const nuevo = !prev;
      setRows((oldRows) =>
        oldRows.map((r) => {
          if (!r.mes) {
            return {
              ...r,
              diasMes: nuevo ? 0 : 0,
              diasTrab: nuevo ? 0 : 0,
            };
          }
          const dias = nuevo
            ? modoHabiles
              ? diasHabilesDelMes(r.mes)
              : diasDelMesCorridos(r.mes)
            : 0;
          return {
            ...r,
            diasMes: nuevo ? dias : 0,
            diasTrab: nuevo ? dias : 0,
          };
        })
      );
      return nuevo;
    });
  };

  // ===============================
  // Cargar 12 meses anteriores
  // ===============================
  const cargar12MesesAnteriores = () => {
    if (!fechaAccidente) {
      alert('Primero seleccioná la fecha de accidente o PMI.');
      return;
    }
    const [y, m] = fechaAccidente.substring(0, 7).split('-').map(Number);
    const existentes = new Set(
      rows
        .map((r) => r.mes)
        .filter(Boolean)
    );

    const mesesPrevios = [];
    for (let k = 1; k <= 12; k++) {
      const d = new Date(y, m - 1, 1);
      d.setMonth(d.getMonth() - k);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      mesesPrevios.push(`${yyyy}-${mm}`);
    }
    mesesPrevios.sort();

    mesesPrevios.forEach((ym) => {
      if (!existentes.has(ym)) {
        const diasBase = modoHabiles
          ? diasHabilesDelMes(ym)
          : diasDelMesCorridos(ym);
        setRows((prev) => [
          ...prev,
          {
            id: nextId + prev.length,
            mes: ym,
            monto: '',
            diasMes: previo27348 ? diasBase : 0,
            diasTrab: previo27348 ? diasBase : 0,
          },
        ]);
      }
    });
    setNextId((id) => id + mesesPrevios.length);
  };

    // ===============================
  // Guardar en juicio – Paso 1
  // ===============================

  const handleOpenSaveDialogPaso1 = () => {
    // Necesitamos fechaAccidente y un IBM calculado
    if (!fechaAccidente || !resultadoIBM || resultadoIBM.error || resultadoIBM.ibm == null) {
      alert(
        'Primero calculá el IBM (con fecha de accidente y RIPTE) antes de guardar en un juicio.'
      );
      return;
    }

    const defaultTitle =
      saveTitle || toolName || 'IBM a la fecha del accidente (Paso 1)';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

const handleConfirmSavePaso1 = async () => {
  if (!selectedCaseId) {
    alert('Seleccioná un juicio.');
    return;
  }

  try {
    setSavingResult(true);
    const user = await User.me();

    // Tomamos la fecha del accidente desde el input que ya usás en el Paso 1
    const fechaAccidente =
      (document.getElementById('fechaAccidente')?.value || '').trim();

    // Tomamos el IBM a la fecha del accidente desde el resultado/DOM/contexto
    // Si tenés el IBM en estado React (por ej. ibmCalculado), usá directamente esa variable.
    // Si sólo está en el DOM, podés hacer:
    const ibmText =
      document.getElementById('ibmResultado')?.textContent ||
      document.getElementById('ibmFinal')?.textContent ||
      '';
    // parseamos a número si hace falta, o lo guardamos como string:
    const ibmAlAccidente = ibmText.trim();

    const payload = {
      tipo: 'accidente_paso_1',
      fechaAccidente,
      ibmAlAccidente,
    };

    await CalculatorResult.create({
      userId: user.id,
      caseId: selectedCaseId,
      toolId,
      toolName: toolName || 'Accidente – Paso 1: calcular IBM',
      title:
        saveTitle ||
        toolName ||
        'Paso 1 – IBM a la fecha del accidente',
      notes: saveNotes,
      payload, // 👈 igual que en Paso 2
    });

    alert('✅ Resultado del Paso 1 guardado en el juicio.');
    setSaveDialogOpen(false);
    setSelectedCaseId('');
    setSaveTitle('');
    setSaveNotes('');
  } catch (e) {
    console.error('Error guardando Paso 1 en juicio:', e);
    alert('No se pudo guardar el resultado en el juicio.');
  } finally {
    setSavingResult(false);
  }
};


  // ===============================
  // Cálculo de IBM
  // ===============================
  const calcularIBM = () => {
    if (!fechaAccidente) {
      alert('Debe ingresar la fecha de accidente o PMI.');
      return;
    }

    if (!ripteMap || Object.keys(ripteMap).length === 0) {
      alert('No hay índices RIPTE cargados.');
      return;
    }

    const claveAccidente = getClaveRIPTE(fechaAccidente);
    if (!claveAccidente || !ripteMap[claveAccidente]) {
      setResultadoIBM({
        error: `No hay índice RIPTE disponible para la fecha de accidente (${claveAccidente || '—'}).`,
      });
      return;
    }
    const ripteAccidente = ripteMap[claveAccidente];

    let sumaValoresProrrateados = 0;
    let totalDiasTrabajados = 0;
    let cantidadMesesValidos = 0;
    const registros = [];

    rows.forEach((r) => {
      if (!r.mes || !r.monto) return;

      const montoBruto = parseMoneda(r.monto);
      if (Number.isNaN(montoBruto) || montoBruto <= 0) return;

      const claveMes = getClaveRIPTE(`${r.mes}-01`);
      if (!claveMes || !ripteMap[claveMes]) return;

      const ripteMes = ripteMap[claveMes];
      const montoAjustado = montoBruto * (ripteAccidente / ripteMes);
      const valorProrrateado = montoAjustado;

      sumaValoresProrrateados += valorProrrateado;
      cantidadMesesValidos++;

      let diasDelMes = r.diasMes || 0;
      let diasTrabajados = r.diasTrab || 0;

      if (previo27348) {
        // Si no hay info de días, usamos el total del mes según modo
        if (!diasDelMes) {
          diasDelMes = modoHabiles
            ? diasHabilesDelMes(r.mes)
            : diasDelMesCorridos(r.mes);
        }
        if (!diasTrabajados) {
          diasTrabajados = diasDelMes;
        }
        totalDiasTrabajados += Math.min(diasTrabajados, diasDelMes);
      }

      registros.push({
        mesClave: claveMes,
        montoBruto,
        diasDelMes,
        diasTrabajados,
        ripteMes,
        valorProrrateado,
      });
    });

    if (registros.length === 0) {
      setResultadoIBM({
        error:
          'No se pudo calcular. Verificá que hayas completado correctamente los meses y los montos.',
      });
      return;
    }

    let ibm = 0;
    let obs = '';

    if (!previo27348) {
      // Siempre promedio mensual
      ibm = sumaValoresProrrateados / cantidadMesesValidos;
      obs =
        'Cálculo del IBM por promedio mensual de los meses cargados. No se consideran días hábiles ni corridos.';
    } else {
      const allMesesCompletos = registros.every(
        (r) => r.diasTrabajados === r.diasDelMes
      );

      const LIMITE_ANUAL = modoHabiles ? DIAS_HABILES_ANIO : DIAS_CORRIDOS_ANIO;
      const DIAS_MES_PROM = modoHabiles
        ? DIAS_HABILES_MES_PROM
        : DIAS_CORRIDOS_MES_PROM;

      if (totalDiasTrabajados <= 0) {
        setResultadoIBM({
          error:
            'No se pudo calcular (0 días trabajados). Revisá los datos de días trabajados.',
        });
        return;
      }

      if (cantidadMesesValidos >= 12 && allMesesCompletos) {
        ibm = sumaValoresProrrateados / cantidadMesesValidos;
      } else if (totalDiasTrabajados < LIMITE_ANUAL) {
        ibm = (sumaValoresProrrateados / totalDiasTrabajados) * DIAS_MES_PROM;
      } else {
        ibm = sumaValoresProrrateados / cantidadMesesValidos;
      }

      if (modoHabiles) {
        obs += 'Modo de cálculo: se consideraron días hábiles mensuales. ';
      } else {
        obs += 'Modo de cálculo: se consideraron días corridos mensuales. ';
      }

      if (cantidadMesesValidos < 12 || !allMesesCompletos) {
        obs +=
          'Como no se cuenta con 12 meses completos, se aplica un promedio diario multiplicado por ' +
          (modoHabiles ? `${DIAS_HABILES_MES_PROM} días hábiles promedio.` : `${DIAS_CORRIDOS_MES_PROM} días corridos promedio.`);
      } else {
        obs +=
          'Se utilizaron 12 meses completos, por lo que el cálculo se realizó con promedio mensual.';
      }
    }

    const fechaLabel = (() => {
      const [y, m, d] = fechaAccidente.split('-');
      return `${d}/${m}/${y}`;
    })();

    // Redondeamos un poco el IBM para mostrar
    const ibmRedondeado = Math.round(ibm * 100) / 100;

    // Guardamos el resultado completo
    setResultadoIBM({
      ibm: ibmRedondeado,
      fechaLabel,
      registros,
      ripteAccidente,
      claveAccidente,
    });

    // Guardamos las observaciones de cómo se calculó
    setObservacionesModo(obs);
  }; // 👈 acá cerramos calcularIBM

  useEffect(() => {
    updateState({
      fechaAccidente,
      rows,
      nextId,
      previo27348,
      modoHabiles,
      resultadoIBM,
    });
  }, [fechaAccidente, rows, nextId, previo27348, modoHabiles, resultadoIBM]);

  const hayRipte = useMemo(
    () => Object.keys(ripteMap).length > 0,
    [ripteMap]
  );

  // ===============================
  // Render
  // ===============================
  return (
    <div className="space-y-6">
      <Card className="border-2 border-[#0f2f4b]">
<CardHeader className="pb-3 text-center">
  <CardTitle className="flex items-center justify-center gap-2 text-lg md:text-xl">
    <Calculator className="h-5 w-5 text-[#0f2f4b]" />
    {toolName || 'Paso 1️⃣: Calcular IBM actualizado por RIPTE'}
  </CardTitle>

  <p className="text-xs md:text-sm bg-amber-100 text-black px-3 py-2 rounded-md mt-2 inline-block">
    ⚠️ Valores actualizados por RIPTE a la fecha del accidente / PMI.
  </p>
</CardHeader>

        <CardContent className="space-y-4">
          {/* Estado RIPTE */}
          <div className="text-sm flex justify-center">
            {loadingRipte && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando índices RIPTE...
              </div>
            )}
            {!loadingRipte && hayRipte && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">
                <span>✅ RIPTE cargados correctamente</span>
              </div>
            )}
            {!loadingRipte && !hayRipte && ripteError && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-800 border border-red-200">
                <Info className="h-4 w-4" />
                {ripteError}
              </div>
            )}
          </div>

          {/* Fecha + botón 12 meses */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label
                htmlFor="fechaAccidente"
                className="flex items-center gap-2 text-sm"
              >
                <Calendar className="h-4 w-4" />
                Fecha de accidente o PMI
              </Label>
              <Input
                id="fechaAccidente"
                type="date"
                value={fechaAccidente}
                onChange={(e) => setFechaAccidente(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!fechaAccidente}
              onClick={cargar12MesesAnteriores}
              className="w-full md:w-auto"
            >
              ⏳ Cargar 12 meses anteriores
            </Button>
          </div>

          {/* Toggles Previo 27.348 + modo hábiles */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              onClick={togglePrevio27348}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm flex items-center gap-2 ${
                previo27348
                  ? 'bg-[#0f2f4b] text-white border-[#0f2f4b]'
                  : 'bg-white text-[#0f2f4b] border-[#0f2f4b]'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#5EA6D7]" />
              Previo vigencia Ley 27.348
            </button>

            {previo27348 && (
              <button
                type="button"
                onClick={() => setModoHabiles((v) => !v)}
                className={`px-3 py-1.5 rounded-full border text-xs md:text-sm flex items-center gap-2 ${
                  modoHabiles
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-sky-50 text-sky-900 border-sky-300'
                }`}
              >
                {modoHabiles ? 'Modo: días hábiles' : 'Modo: días corridos'}
              </button>
            )}
          </div>

          {/* Tabla de inputs (meses) */}
          <div className="border rounded-lg p-3 bg-slate-50/70">
            <p className="text-xs text-slate-600 mb-2">
              Cargá uno o más meses con los haberes brutos. Podés usar el botón de
              &quot;Cargar 12 meses anteriores&quot; para autocompletar.
            </p>

            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 md:grid-cols-[1.3fr,1.6fr,1.1fr,1.1fr,auto] gap-2 items-center"
                >
                  {/* Mes */}
                  <Input
                    type="month"
                    value={r.mes}
                    onChange={(e) => handleMesChange(r.id, e.target.value)}
                    className="text-sm"
                  />

                  {/* Monto */}
                  <Input
                    type="text"
                    placeholder="$ 0,00"
                    value={r.monto}
                    onChange={(e) => handleMontoChange(r.id, e.target.value)}
                    className="text-sm text-left"
                  />

                  {/* Días del mes */}
                  {previo27348 && (
                    <>
                      <Input
                        type="number"
                        min={0}
                        value={r.diasMes || ''}
                        onChange={(e) =>
                          handleDiasMesChange(r.id, e.target.value)
                        }
                        placeholder="Días mes"
                        className="text-xs text-center"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={r.diasTrab || ''}
                        onChange={(e) =>
                          handleDiasTrabChange(r.id, e.target.value)
                        }
                        placeholder="Días trab."
                        className="text-xs text-center"
                      />
                    </>
                  )}

                  {/* Botón eliminar */}
                  <button
                    type="button"
                    onClick={() => eliminarFila(r.id)}
                    className="text-red-500 text-lg hover:text-red-700"
                    title="Eliminar fila"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => agregarFila()}
                className="text-sm"
              >
                ➕ Agregar mes
              </Button>
            </div>
          </div>

{/* Botón calcular + Guardar en juicio */}
<Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
  <div className="mt-3 flex flex-col gap-3">

    {/* --- BOTÓN CALCULAR IBM (arriba) --- */}
    <Button
      type="button"
      onClick={calcularIBM}
      className="w-full bg-[#0f2f4b] hover:bg-[#0b2235] flex items-center justify-center"
    >
      <Calculator className="h-5 w-5 mr-2" />
      Calcular IBM
    </Button>

    {/* --- BOTÓN GUARDAR EN JUICIO (debajo) --- */}
    <DialogTrigger asChild>
      <Button
        type="button"
        variant="outline"
        className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center"
        onClick={handleOpenSaveDialogPaso1}
      >
        <FileText className="h-4 w-4 mr-2" />
        Guardar Paso 1 en juicio
      </Button>
    </DialogTrigger>

  </div>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Guardar Paso 1 en un juicio</DialogTitle>
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
                    placeholder="Ej: IBM a la fecha del accidente"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Notas sobre el IBM, supuestos, etc."
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
                        ? new Date(fechaAccidente).toLocaleDateString('es-AR')
                        : '—'}
                    </span>
                  </p>
                  <p>
                    IBM a la fecha del accidente:{' '}
                    <span className="font-bold text-[#0f2f4b]">
                      {resultadoIBM && !resultadoIBM.error && resultadoIBM.ibm != null
                        ? resultadoIBM.ibm.toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </span>
                  </p>
                  {resultadoIBM && resultadoIBM.fechaLabel && (
                    <p>
                      Fecha de referencia del IBM:{' '}
                      <span className="font-semibold">
                        {resultadoIBM.fechaLabel}
                      </span>
                    </p>
                  )}
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
                    onClick={handleConfirmSavePaso1}
                    disabled={savingResult || !selectedCaseId}
                  >
                    {savingResult ? 'Guardando…' : 'Guardar en juicio'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Resultado */}
          {resultadoIBM && !resultadoIBM.error && (
            <div className="space-y-3 mt-2">
              <div className="text-center bg-[#d9ecf8] text-[#0f2f4b] font-bold text-lg md:text-xl px-4 py-3 rounded-xl">
                IBM actualizado al {resultadoIBM.fechaLabel}:{' '}
                {resultadoIBM.ibm.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Observaciones modo */}
              {observacionesModo && (
                <div className="flex items-center justify-center gap-2 bg-[#eaf4fb] border-l-4 border-[#5EA6D7] px-3 py-2 rounded-lg text-xs md:text-sm text-[#0f2f4b]">
                  <span>ℹ️</span>
                  <span className="text-center">{observacionesModo}</span>
                </div>
              )}

              {/* Tabla detalle */}
              {resultadoIBM.registros && resultadoIBM.registros.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full text-xs md:text-sm text-center">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Mes
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Haberes brutos
                        </th>
                        {previo27348 && (
                          <>
                            <th className="px-3 py-2 font-semibold text-slate-700">
                              Días mes
                            </th>
                            <th className="px-3 py-2 font-semibold text-slate-700">
                              Días trabajados
                            </th>
                          </>
                        )}
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          RIPTE mes
                        </th>
                        <th className="px-3 py-2 font-semibold text-slate-700">
                          Valor actualizado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoIBM.registros.map((reg, idx) => (
                        <tr key={idx} className={idx % 2 ? 'bg-slate-50/60' : ''}>
                          <td className="px-3 py-1.5">{reg.mesClave}</td>
                          <td className="px-3 py-1.5">
                            {reg.montoBruto.toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          {previo27348 && (
                            <>
                              <td className="px-3 py-1.5">
                                {reg.diasDelMes || ''}
                              </td>
                              <td className="px-3 py-1.5">
                                {reg.diasTrabajados || ''}
                              </td>
                            </>
                          )}
                          <td className="px-3 py-1.5">
                            {reg.ripteMes.toLocaleString('es-AR', {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td className="px-3 py-1.5">
                            {reg.valorProrrateado.toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                      {/* Fila final con RIPTE accidente */}
                      <tr className="bg-slate-100">
                        <td className="px-3 py-1.5">
                          {resultadoIBM.claveAccidente}
                        </td>
                        <td
                          className="px-3 py-1.5"
                          colSpan={previo27348 ? 3 : 1}
                        >
                          –
                        </td>
                        <td className="px-3 py-1.5">
                          {resultadoIBM.ripteAccidente.toLocaleString('es-AR', {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="px-3 py-1.5">–</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Error de resultado */}
          {resultadoIBM && resultadoIBM.error && (
            <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs md:text-sm text-red-800">
              {resultadoIBM.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}