// src/components/ActualizadorCuota.jsx
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  RefreshCw,
  Info,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FinancialData } from '@/entities/FinancialData';

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

import { Textarea } from '@/components/ui/textarea';

// 📊 Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';

// ======================
// Helpers genéricos
// ======================
const formatearMoneda = (v) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(v ?? 0);

const formatearPorcentaje = (valor) =>
  `${valor.toFixed(2).replace('.', ',')}%`;

// Formato input moneda estilo FINFOCUS ($ 0,00)
const formatCurrencyInput = (value) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseFloat(digits) / 100;
  return formatearMoneda(num);
};

// Parseo de moneda desde input
const parseCurrencyInput = (value) => {
  const clean = value.replace(/[^\d]/g, '');
  if (!clean) return null;
  const num = parseFloat(clean) / 100;
  return Number.isNaN(num) ? null : num;
};

// Formato input porcentaje con coma (sin % en el valor, el símbolo va en la UI)
const formatPercentInput = (value) => {
  let val = value.replace(/[^0-9,]/g, '');
  const parts = val.split(',');
  if (parts.length > 2) {
    val = parts[0] + ',' + parts[1];
  }
  return val;
};

// Parseo de porcentaje: "2,50" → 0.025 (decimal)
const parsePercentInputToDecimal = (value) => {
  if (!value) return null;
  const clean = value.replace(/[^0-9,]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (Number.isNaN(num)) return null;
  return num / 100;
};

// Helper para guardar fecha REM como DD-MM-YYYY
const formatDDMMYYYY = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// ======================
// IPC: helpers (Ajuste por Inflación)
// ======================
const parseNumberAR = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
};

// "feb-24" / "sept-24" / "set-24" / "jan-24" → Date
const parseFechaIPC = (fechaStr) => {
  try {
    const meses = {
      // Español corto
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
      // Variantes
      set: 8,
      sept: 8,
      // Inglés corto (por si aparece)
      jan: 0,
      apr: 3,
      aug: 7,
      dec: 11,
    };

    const parts = fechaStr.split('-');
    if (parts.length === 2) {
      const mesStr = parts[0].toLowerCase().trim();
      const yearStr = parts[1].trim();
      const mes = meses[mesStr];
      if (mes !== undefined) {
        let year = parseInt(yearStr, 10);
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        const fecha = new Date(year, mes, 1);
        return fecha.toISOString();
      }
    }
    return null;
  } catch (error) {
    console.error('Error parseando fecha IPC:', fechaStr, error);
    return null;
  }
};

// ======================
// Tooltip del gráfico IPC
// ======================
const IPCMonthlyTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const p = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-md p-2 shadow-sm text-xs">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-blue-700">
          Inflación mensual:{' '}
          {formatearPorcentaje(p.value || 0)}
        </p>
      </div>
    );
  }
  return null;
};

// ======================
// Componente principal
// ======================
export default function ActualizadorCuota({ toolName }) {
  // Inputs
  const [ultimaCuota, setUltimaCuota] = useState('');
  const [tasaPuraInput, setTasaPuraInput] = useState('3,00'); // texto "3,00"
  const [inflacionMensualInput, setInflacionMensualInput] = useState('');

  // Resultado
  const [resultado, setResultado] = useState(null);
  const [simulacion, setSimulacion] = useState([]); // [{tasa, valor}]
  const [simulacionChartData, setSimulacionChartData] = useState([]);

  // REM (inflación esperada)
  const [loadingREM, setLoadingREM] = useState(true);
  const [remInfo, setRemInfo] = useState(null);
  const [errorREM, setErrorREM] = useState(null);

  // IPC últimos 12 meses
  const [loadingIPC, setLoadingIPC] = useState(true);
  const [ipcChartData, setIpcChartData] = useState([]);
  const [errorIPC, setErrorIPC] = useState(null);

  // ==== Guardar en juicio ====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // ======================
  // Carga inicial: REM + IPC
  // ======================
  useEffect(() => {
    loadREMData();
    loadIPCData();
  }, []);

  // ========= Carga REM desde FinancialData (inflación esperada) =========
  const loadREMData = async () => {
    setLoadingREM(true);
    setErrorREM(null);
    try {
      const remRecords = await FinancialData.filter(
        {
          category: 'inflacion_esperada',
          isActive: true,
        },
        '-lastSync',
        1
      );

      if (!remRecords || remRecords.length === 0) {
        setErrorREM('No se encontraron datos de inflación esperada.');
        setRemInfo(null);
        return;
      }

      const remRecord = remRecords[0];
      let headers = (remRecord.headers || []).map((h) =>
        (h || '').toString().toLowerCase()
      );

      let fechaIdx = -1;
      let valorIdx = -1;

      if (headers.length > 0) {
        fechaIdx = headers.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('mes') ||
            h.includes('periodo') ||
            h.includes('período')
        );

        valorIdx = headers.findIndex(
          (h) =>
            (h.includes('anual') ||
              h.includes('12 meses') ||
              h.includes('esperada')) &&
            !h.includes('mensual')
        );
      }

      // Si no hay headers útiles, asumir [fecha, valor]
      if (
        (fechaIdx === -1 || valorIdx === -1) &&
        Array.isArray(remRecord.data) &&
        remRecord.data.length > 0 &&
        Array.isArray(remRecord.data[0]) &&
        remRecord.data[0].length >= 2
      ) {
        fechaIdx = 0;
        valorIdx = 1;
      }

      if (
        fechaIdx === -1 ||
        valorIdx === -1 ||
        !Array.isArray(remRecord.data)
      ) {
        setErrorREM(
          'Estructura de datos REM no reconocida (se esperaba [fecha, valor]).'
        );
        setRemInfo(null);
        return;
      }

      const parseNumberARLocal = (raw) => {
        if (raw == null) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const normalized = s.replace(/\./g, '').replace(',', '.');
        const n = parseFloat(normalized);
        return Number.isNaN(n) ? null : n;
      };

      const registros = [];
      for (const row of remRecord.data) {
        if (!Array.isArray(row)) continue;
        const fechaRaw = row[fechaIdx];
        const valorRaw = row[valorIdx];
        if (!fechaRaw || valorRaw == null) continue;

        const fecha = moment(fechaRaw).isValid()
          ? moment(fechaRaw).toDate()
          : null;
        if (!fecha) continue;

        const anual = parseNumberARLocal(valorRaw); // % anual
        if (anual == null) continue;

        registros.push({ fecha, inflAnual: anual });
      }

      if (registros.length === 0) {
        setErrorREM('No se pudo leer la inflación anual esperada.');
        setRemInfo(null);
        return;
      }

      registros.sort((a, b) => a.fecha - b.fecha);
      const last = registros[registros.length - 1];

      const inflMensual = Math.pow(1 + last.inflAnual / 100, 1 / 12) - 1;

      const info = {
        fecha: last.fecha,
        inflAnual: last.inflAnual, // %
        inflMensual, // decimal
      };

      setRemInfo(info);

      // Si el input de inflación mensual está vacío, lo precargamos
      if (!inflacionMensualInput) {
        const valorTxt = (info.inflMensual * 100)
          .toFixed(2)
          .replace('.', ',');
        setInflacionMensualInput(valorTxt);
      }
    } catch (error) {
      console.error('Error cargando REM:', error);
      setErrorREM('Error al cargar la inflación esperada.');
      setRemInfo(null);
    } finally {
      setLoadingREM(false);
    }
  };

  // ========= Carga IPC (nivel general) para gráfico últimos 12 meses =========
  const loadIPCData = async () => {
    setLoadingIPC(true);
    setErrorIPC(null);
    try {
      const allData = await FinancialData.filter(
        {
          category: 'ipc_nivel_general',
          isActive: true,
        },
        '-lastSync',
        1
      );

      if (!allData || allData.length === 0) {
        setErrorIPC('No se encontraron datos de IPC.');
        setIpcChartData([]);
        return;
      }

      const ipcRecord = allData[0];
      const processedData = [];

      if (ipcRecord.data && Array.isArray(ipcRecord.data)) {
        const headers = ipcRecord.headers || [];
        const headersLower = headers.map((h) =>
          (h || '').toString().toLowerCase()
        );

        const fechaIdx = headersLower.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('periodo') ||
            h.includes('período') ||
            h.includes('mes')
        );

        const indiceIdx = headersLower.findIndex(
          (h) =>
            (h.includes('indice') ||
              h.includes('índice') ||
              h.includes('nivel') ||
              h.includes('ipc')) &&
            !h.includes('variación') &&
            !h.includes('variacion') &&
            !h.includes('mensual') &&
            !h.includes('interanual') &&
            !h.includes('%')
        );

        const mensualIdx = headersLower.findIndex(
          (h) =>
            h.includes('mensual') ||
            h.includes('var. mensual') ||
            h.includes('variación mensual') ||
            h.includes('variacion mensual')
        );

        for (const row of ipcRecord.data) {
          const fechaRaw = row[fechaIdx];
          if (!fechaRaw) continue;

          const fechaStr = fechaRaw.toString().toLowerCase();
          const parsedDate = parseFechaIPC(fechaStr);
          if (!parsedDate) continue;

          const registro = {
            fecha: parsedDate,
            fechaOriginal: fechaRaw,
          };

          if (indiceIdx !== -1 && row[indiceIdx] != null) {
            registro.indice = parseNumberAR(row[indiceIdx]);
          }
          if (mensualIdx !== -1 && row[mensualIdx] != null) {
            registro.inflMensual = parseNumberAR(row[mensualIdx]);
          }

          processedData.push(registro);
        }
      }

      processedData.sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

      // Construir serie con inflMensual; si no viene, la calculamos a partir del índice
      let seriesConMensual = [];

      if (
        processedData.some(
          (d) => d.inflMensual != null && !Number.isNaN(d.inflMensual)
        )
      ) {
        seriesConMensual = processedData.filter(
          (d) => d.inflMensual != null && !Number.isNaN(d.inflMensual)
        );
      } else if (
        processedData.length > 1 &&
        processedData.every((d) => d.indice != null)
      ) {
        seriesConMensual = processedData
          .map((item, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const inflMensual =
              prev != null && prev.indice
                ? ((item.indice / prev.indice) - 1) * 100
                : null;
            return {
              ...item,
              inflMensual,
            };
          })
          .filter(
            (d) =>
              d.inflMensual != null && !Number.isNaN(d.inflMensual)
          );
      }

      const last12 = seriesConMensual.slice(-12);
      const chartData = last12.map((d) => ({
        name: moment(d.fecha).format('MM/YY'),
        inflMensual: Number(d.inflMensual.toFixed(2)),
      }));

      setIpcChartData(chartData);
    } catch (error) {
      console.error('Error cargando IPC:', error);
      setErrorIPC('Error al cargar los datos de IPC.');
      setIpcChartData([]);
    } finally {
      setLoadingIPC(false);
    }
  };

  // ========= Handlers inputs =========
  const handleUltimaCuotaChange = (e) => {
    const value = e.target.value;
    setUltimaCuota(formatCurrencyInput(value));
  };

  const handleTasaPuraChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    let num = val ? parseFloat(val) / 100 : 0; // "250" -> 2.50
    if (num > 3) num = 3;
    const txt = num
      ? num.toLocaleString('es-AR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '';
    setTasaPuraInput(txt);
  };

  const handleInflacionMensualChange = (e) => {
    setInflacionMensualInput(formatPercentInput(e.target.value));
  };

  // ========= Cálculo principal =========
  const calcular = () => {
    try {
      const cuota = parseCurrencyInput(ultimaCuota);
      if (!cuota || cuota <= 0) {
        alert('Ingresá un valor válido para la última cuota.');
        return;
      }

      // Tasa pura anual (0–3)
      const rawTasa = tasaPuraInput.replace(/[^0-9,]/g, '').replace(',', '.');
      let pura = rawTasa ? parseFloat(rawTasa) : 0; // pura en puntos porcentuales (0–3)
      if (Number.isNaN(pura) || pura < 0 || pura > 3) {
        alert('La tasa pura debe estar entre 0 y 3% anual.');
        return;
      }

      const puraAnualTxt = `${pura.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}% anual`;
      const puraMensualTxt = `${(pura / 12).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}% mensual`;

      // Inflación mensual
      const inflMensualDecimal = parsePercentInputToDecimal(
        inflacionMensualInput
      ); // ej 0.016
      if (inflMensualDecimal == null || inflMensualDecimal < 0) {
        alert('Ingresá una inflación mensual válida.');
        return;
      }
      const inflPct = inflMensualDecimal * 100;

      const cuotaInflacion = cuota * (1 + inflMensualDecimal);
      const inflAmount = cuotaInflacion - cuota;

      const tasaPuraMensualDecimal = (pura / 100) / 12; // ej 3% → 0.03/12
      const pureAmount = cuotaInflacion * tasaPuraMensualDecimal;
      const cuotaActualizada = cuotaInflacion * (1 + tasaPuraMensualDecimal);

      const result = {
        cuotaOriginal: cuota,
        cuotaInflacion,
        cuotaActualizada,
        inflAmount,
        pureAmount,
        inflPct,
        pura,
        puraAnualTxt,
        puraMensualTxt,
      };
      setResultado(result);

      // Simulación: tasas 0,1,2,3 + tasa del usuario
      const tasasBase = [0, 1, 2, 3];
      const tasas = Array.from(new Set([...tasasBase, pura])).sort(
        (a, b) => a - b
      );

      const sim = tasas.map((t) => {
        const mensual = (t / 100) / 12;
        const val = cuota * (1 + inflMensualDecimal) * (1 + mensual);
        return { tasa: t, valor: val, seleccionada: Math.abs(t - pura) < 1e-6 };
      });
      setSimulacion(sim);

      const vals = sim.map((s) => s.valor);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const margin = (maxVal - minVal) * 0.1;
      const yMin = minVal - margin;
      const yMax = maxVal + margin;

      setSimulacionChartData({
        data: sim.map((s) => ({
          name: `${s.tasa.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}%`,
          valor: s.valor,
          seleccionada: s.seleccionada,
        })),
        yMin,
        yMax,
      });
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  // ========= Guardar en juicio =========

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
        console.error('Error cargando juicios para Actualizador de cuota:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  const handleOpenSaveDialog = () => {
    if (!resultado) {
      alert('Primero calculá la cuota actualizada antes de guardar en un juicio.');
      return;
    }

    const defaultTitle =
      saveTitle || 'Actualización de cuota (inflación + interés puro)';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }
    if (!resultado) {
      alert('No hay resultado calculado para guardar.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const payload = {
        tipo: 'actualizador_cuota',

        // Datos base de la cuota
        cuotaOriginal: resultado.cuotaOriginal ?? null,
        cuotaAjustadaSoloInflacion: resultado.cuotaInflacion ?? null,
        cuotaFinalConInteresPuro: resultado.cuotaActualizada ?? null,

        // Desglose de ajustes
        ajustePorInflacion: resultado.inflAmount ?? null,
        ajustePorTasaPura: resultado.pureAmount ?? null,

        // Parámetros usados
        inflacionMensualPorc: resultado.inflPct ?? null, // %
        tasaPuraAnualPorc: resultado.pura ?? null, // %
        tasaPuraAnualTxt: resultado.puraAnualTxt || null,
        tasaPuraMensualTxt: resultado.puraMensualTxt || null,

        // REM (si estaba disponible)
        remFecha: remInfo ? formatDDMMYYYY(remInfo.fecha) : null,
        remInflacionAnualEsperada: remInfo?.inflAnual ?? null, // %
        remInflacionMensualEquivalente: remInfo
          ? remInfo.inflMensual * 100
          : null, // % mensual equivalente
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId: 'actualizador_cuota',
        toolName: toolName || 'Actualizador de cuota FINFOCUS',
        title:
          saveTitle || 'Actualización de cuota (inflación + interés puro)',
        notes: saveNotes,
        payload,
      });

      alert('✅ Actualización de cuota guardada en el juicio.');
      setSaveDialogOpen(false);
      setSelectedCaseId('');
      setSaveTitle('');
      setSaveNotes('');
    } catch (e) {
      console.error('Error guardando actualizador de cuota en juicio:', e);
      alert('No se pudo guardar la actualización de cuota en el juicio.');
    } finally {
      setSavingResult(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            {toolName || 'Actualizador de cuota FINFOCUS'}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Actualiza la última cuota combinando <strong>inflación</strong> y{' '}
            <strong>tasa pura</strong> (art. 276 LCT, máx. 3% anual). Usa IPC
            INDEC + REM (expectativas de mercado).
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bloque de inflación esperada + input mensual editable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 border border-blue-100 bg-gradient-to-r from-[#d9ecf9] to-[#bde3f9]">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Info className="h-5 w-5 text-[#0f2f4b]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0f2f4b]/80">
                      Inflación esperada · REM
                    </p>
                    {loadingREM ? (
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Cargando expectativas de mercado...
                      </p>
                    ) : errorREM ? (
                      <p className="text-xs text-red-600 mt-1">
                        {errorREM}
                      </p>
                    ) : remInfo ? (
                      <>
                        <p className="text-xs text-gray-700 mt-1">
                          Última actualización:{' '}
                          <span className="font-semibold">
                            {moment(remInfo.fecha).format('DD/MM/YYYY')}
                          </span>
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-[#0f2f4b] text-sm">
                          <div className="bg-white/70 rounded-xl px-3 py-2 text-center shadow-sm">
                            <p className="text-[10px] uppercase tracking-wide text-[#0f2f4b]/70">
                              Inflación anual esperada
                            </p>
                            <p className="text-xl font-extrabold">
                              {formatearPorcentaje(remInfo.inflAnual)}
                            </p>
                          </div>
                          <div className="bg-[#0f2f4b] text-white rounded-xl px-3 py-2 text-center shadow-sm">
                            <p className="text-[10px] uppercase tracking-wide text-white/80">
                              Equivalente mensual
                            </p>
                            <p className="text-xl font-extrabold">
                              {formatearPorcentaje(remInfo.inflMensual * 100)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-700 mt-1">
                        No se pudo obtener la inflación esperada.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-indigo-100 bg-indigo-50/60">
              <CardContent className="py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Inflación mensual a usar
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Podés ajustar la inflación mensual. Por defecto se toma de la
                  REM, pero es editable.
                </p>
                <div className="mt-2 relative">
                  <Input
                    type="text"
                    value={inflacionMensualInput}
                    onChange={handleInflacionMensualChange}
                    placeholder="Ej: 1,80"
                    className="pr-10 text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico IPC últimos 12 meses */}
          <Card className="border border-blue-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#0f2f4b] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Inflación mensual – últimos 12 meses (IPC INDEC)
              </CardTitle>
              <p className="text-xs text-gray-600">
                Variación mensual del IPC Nivel General. Fuente: INDEC (vía
                hoja IPC cargada en FINFOCUS).
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingIPC ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-500 gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando IPC...
                </div>
              ) : errorIPC ? (
                <p className="text-xs text-red-600">{errorIPC}</p>
              ) : ipcChartData.length === 0 ? (
                <p className="text-xs text-gray-600">
                  No hay datos suficientes para el gráfico de inflación
                  mensual.
                </p>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ipcChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis
                        tickFormatter={(v) => `${v.toFixed(0)}%`}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip content={<IPCMonthlyTooltip />} />
                      <Bar dataKey="inflMensual" barSize={60}>
                        <LabelList
                          dataKey="inflMensual"
                          position="top"
                          formatter={(v) =>
                            `${Number(v).toFixed(1)}%`
                          }
                          className="text-[10px]"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario principal */}
          <div className="space-y-4">
            {/* Valor última cuota + tooltip */}
            <div className="space-y-1">
              <Label
                htmlFor="ultimaCuota"
                className="font-medium flex items-center gap-1"
              >
                <DollarSign className="h-4 w-4" />
                Valor de la última cuota
                <span className="relative inline-block ml-1 group">
                  <Info className="h-4 w-4 text-gray-500 cursor-pointer" />
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-1 hidden w-64 rounded bg-gray-800 p-2 text-xs text-white group-hover:block z-10">
                    Este valor debe ser la última cuota ajustada{' '}
                    <strong>solo</strong> por inflación, sin incluir interés
                    puro anterior para evitar su capitalización.
                  </div>
                </span>
              </Label>
              <Input
                id="ultimaCuota"
                type="text"
                value={ultimaCuota}
                onChange={handleUltimaCuotaChange}
                placeholder="$ 0,00"
                className="text-left"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tasaPura" className="font-medium">
                  Tasa de interés puro anual
                </Label>
                <div className="relative">
                  <Input
                    id="tasaPura"
                    type="text"
                    value={tasaPuraInput}
                    onChange={handleTasaPuraChange}
                    placeholder="3,00"
                    className="pr-10 text-left"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Máx. 3% anual —{' '}
                  <a
                    href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/25000-29999/25552/texact.htm"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    art. 276 LCT
                  </a>
                </p>
              </div>
            </div>

<div className="flex flex-col gap-2">
<Button
  onClick={calcular}
  className="w-full bg-[#0f2f4b] hover:bg-[#0c2236]"
  size="lg"
>
  <Calculator className="h-5 w-5 mr-2" />
  Actualizar cuota
</Button>

              {/* Botón + diálogo Guardar en juicio */}
  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
    <div className="w-full">
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
                      <DialogTitle>Guardar actualización de cuota</DialogTitle>
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
                          placeholder="Ej: Actualización de cuota por IPC + tasa pura"
                        />
                      </div>

                      {/* Notas */}
                      <div className="space-y-1">
                        <Label>Notas (opcional)</Label>
                        <Textarea
                          value={saveNotes}
                          onChange={(e) => setSaveNotes(e.target.value)}
                          placeholder="Notas sobre parámetros usados, referencias normativas, etc."
                          rows={3}
                        />
                      </div>

                      {/* Resumen breve */}
                      {resultado && (
                        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
                          <p className="font-semibold mb-1">Resumen a guardar</p>
                          <p>
                            Última cuota:{' '}
                            <span className="font-bold text-[#0f2f4b]">
                              {formatearMoneda(resultado.cuotaOriginal)}
                            </span>
                          </p>
                          <p>
                            Inflación mensual aplicada:{' '}
                            <span className="font-bold text-[#0f2f4b]">
                              {resultado.inflPct.toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              %
                            </span>
                          </p>
                          <p>
                            Tasa pura anual:{' '}
                            <span className="font-bold text-[#0f2f4b]">
                              {resultado.puraAnualTxt}
                            </span>{' '}
                            ({resultado.puraMensualTxt})
                          </p>
                          <p>
                            Cuota ajustada solo por inflación:{' '}
                            <span className="font-bold text-[#0f2f4b]">
                              {formatearMoneda(resultado.cuotaInflacion)}
                            </span>
                          </p>
                          <p>
                            Cuota final (inflación + tasa pura):{' '}
                            <span className="font-bold text-emerald-700">
                              {formatearMoneda(resultado.cuotaActualizada)}
                            </span>
                          </p>
                          {remInfo && (
                            <p className="mt-1 text-[11px]">
                              REM ({moment(remInfo.fecha).format('DD/MM/YYYY')}):{' '}
                              inflación anual esperada{' '}
                              {formatearPorcentaje(remInfo.inflAnual)} (
                              mensual equivalente{' '}
                              {formatearPorcentaje(remInfo.inflMensual * 100)}).
                            </p>
                          )}
                        </div>
                      )}

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
          </div>

          {/* Resultado & simulación */}
          {resultado && (
            <div className="space-y-4 mt-2">
              {/* Mensajes principales */}
              <div className="mt-2 p-3 bg-blue-50 rounded-lg text-[#0f2f4b] font-semibold whitespace-pre-line">
                Cuota ajustada por inflación + interés puro:{' '}
                {formatearMoneda(resultado.cuotaActualizada)}
              </div>

              <div className="mt-2 p-3 bg-[#FEFCE8] rounded-lg text-[#0f2f4b] font-semibold">
                Cuota ajustada solo por inflación:{' '}
                {formatearMoneda(resultado.cuotaInflacion)}
              </div>

              <div className="mt-1 text-gray-700 italic whitespace-pre-line">
                {`Si la última cuota fue ${formatearMoneda(
                  resultado.cuotaOriginal
                )}:
- Ajuste por inflación: ${resultado.inflPct.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}% → ${formatearMoneda(resultado.inflAmount)}
- Ajuste por tasa pura (${resultado.puraAnualTxt} → ${
                  resultado.puraMensualTxt
                }): ${formatearMoneda(resultado.pureAmount)}`}
              </div>

              {/* Tabla simulación */}
              {simulacion.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#0f2f4b]">
                      Simulación: cuota actualizada según tasa pura anual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            <th className="border-b p-2 text-left">
                              Tasa pura anual
                            </th>
                            <th className="border-b p-2 text-left">
                              Cuota actualizada
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulacion.map((fila, idx) => (
                            <tr
                              key={idx}
                              className={
                                fila.seleccionada
                                  ? 'bg-[#0f2f4b] text-white'
                                  : ''
                              }
                            >
                              <td className="p-2 border-b">
                                {fila.tasa.toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                                %
                              </td>
                              <td className="p-2 border-b">
                                {formatearMoneda(fila.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gráfico simulación */}
              {simulacionChartData.data && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#0f2f4b]">
                      Gráfico: cuota actualizada vs. tasa pura anual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={simulacionChartData.data}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis
                            tickFormatter={(v) => formatearMoneda(v)}
                            tick={{ fontSize: 10 }}
                            domain={[
                              simulacionChartData.yMin,
                              simulacionChartData.yMax,
                            ]}
                          />
                          <RechartsTooltip
                            formatter={(value) => [formatearMoneda(value), 'Cuota']}
                          />
                          <Bar
                            dataKey="valor"
                            barSize={80}
                            fill="#5EA6D7"
                          >
                            <LabelList
                              dataKey="valor"
                              position="top"
                              formatter={(v) => formatearMoneda(v)}
                              className="text-[10px]"
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
