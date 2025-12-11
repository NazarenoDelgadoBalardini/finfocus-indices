import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  DollarSign,
  Percent,
  Info,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { FinancialData } from '@/entities/FinancialData';
import moment from 'moment';
import axios from 'axios';

// 📊 Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

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

function InputFinfocus({ icon, className = '', ...props }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </span>
      )}
      <Input
        {...props}
        className={`${icon ? 'pl-7' : 'pl-3'} text-right ${className}`}
      />
    </div>
  );
}

export default function CalculadoraAmortizacion({ toolId, toolName }) {
  // ---- Estados principales ----
  const [capitalInput, setCapitalInput] = useState('');
  const [inflacionMensualInput, setInflacionMensualInput] = useState('');
  const [numCuotas, setNumCuotas] = useState('12');
  const [sistema, setSistema] = useState('frances');

  const [schedule, setSchedule] = useState([]);
  const [mensajeCuotas, setMensajeCuotas] = useState('');
  const [totalAPagar, setTotalAPagar] = useState(null);

// REM / inflación esperada
const [loadingREM, setLoadingREM] = useState(true);
const [remInfo, setRemInfo] = useState(null);
const [errorREM, setErrorREM] = useState(null);

// ===== Guardar en juicio =====
const [saveDialogOpen, setSaveDialogOpen] = useState(false);
const [availableCases, setAvailableCases] = useState([]);
const [casesLoading, setCasesLoading] = useState(false);
const [loadCasesError, setLoadCasesError] = useState(null);

const [selectedCaseId, setSelectedCaseId] = useState('');
const [saveTitle, setSaveTitle] = useState('');
const [saveNotes, setSaveNotes] = useState('');
const [savingResult, setSavingResult] = useState(false);

// PDF
const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadREMData();
  }, []);

    // Cargar juicios del usuario cuando se abre el diálogo por primera vez
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
        console.error('Error cargando juicios para guardar amortización:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // ========= Helpers de formato =========

  const handleMontoChange = (setter) => (e) => {
    let value = e.target.value.replace(/[^0-9,]/g, '');
    const parts = value.split(',');
    let parteEntera = parts[0];

    if (parteEntera) {
      parteEntera = parteEntera.replace(/\./g, '');
      parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    let formattedValue = parteEntera;
    if (parts.length > 1) {
      formattedValue += ',' + (parts[1] || '');
    }

    setter(formattedValue);
  };

  const parseMonto = (value) => {
    if (!value) return null;
    const clean = value
      .replace(/[^0-9,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(clean);
    return Number.isNaN(num) ? null : num;
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  const formatearPorcentaje = (valor) => {
    return `${valor.toFixed(2).replace('.', ',')}%`;
  };

  const handleInflacionMensualChange = (e) => {
    // Sólo números y coma
    let val = e.target.value.replace(/[^0-9,]/g, '');
    const parts = val.split(',');
    if (parts.length > 2) {
      val = parts[0] + ',' + parts[1];
    }
    setInflacionMensualInput(val);
  };

  const parseInflacionMensual = (value) => {
    if (!value) return null;
    const clean = value.replace(/[^0-9,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return Number.isNaN(num) ? null : num / 100; // decimal mensual
  };

  // ========= Carga de REM desde FinancialData =========

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

      // Si no funcionan los headers, asumir [fecha, valor]
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

      if (fechaIdx === -1 || valorIdx === -1 || !Array.isArray(remRecord.data)) {
        setErrorREM('Estructura de datos REM no reconocida (se esperaba [fecha, valor]).');
        setRemInfo(null);
        return;
      }

      const parseNumberAR = (raw) => {
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

        const anual = parseNumberAR(valorRaw);
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
        inflAnual: last.inflAnual,
        inflMensual,
      };

      setRemInfo(info);

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

    // ========= Cálculo de amortización =========

  // Abrir diálogo de guardado
  const handleOpenSaveDialog = () => {
    if (!schedule || schedule.length === 0 || totalAPagar == null) {
      alert('Primero calculá la amortización para poder guardarla en un juicio.');
      return;
    }

    const defaultTitle =
      saveTitle || toolName || 'Simulación de cuotas con inflación esperada';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  // Confirmar guardado en juicio
  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    if (!schedule || schedule.length === 0 || totalAPagar == null) {
      alert('No hay cálculo para guardar.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const capitalNum = parseMonto(capitalInput) || 0;
      const tasaMensualDecimal = parseInflacionMensual(inflacionMensualInput);

      const payload = {
        tipo: 'amortizacion_cuotas',
        entrada: {
          capitalInput,
          inflacionMensualInput,
          numCuotas,
          sistema,
          capital: capitalNum,
          tasaMensualDecimal,
        },
        resultado: {
          totalAPagar,
          mensajeCuotas,
        },
        schedule,
        remInfo,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Calculadora de amortización',
        title:
          saveTitle ||
          toolName ||
          'Simulación de cuotas con inflación esperada',
        notes: saveNotes,
        data: payload,
      });

      alert('✅ Simulación guardada en el juicio.');
      setSaveDialogOpen(false);
    } catch (e) {
      console.error('Error guardando amortización en juicio:', e);
      alert('No se pudo guardar el resultado. Intenta nuevamente.');
    } finally {
      setSavingResult(false);
    }
  };

  // ========= Cálculo de amortización =========

  const calcularAmortizacion = () => {
    const C = parseMonto(capitalInput);
    const r = parseInflacionMensual(inflacionMensualInput); // tasa mensual
    const n = parseInt(numCuotas, 10);

    if (!C || C <= 0 || !n || n < 1) {
      alert('Ingrese un capital válido y un número de cuotas mayor a 0.');
      return;
    }

    if (r == null || r < 0) {
      alert('Ingrese una inflación / tasa mensual válida.');
      return;
    }

    const nuevaSchedule = [];
    let remaining = C;
    let mensaje = '';
    let total = 0;

    if (sistema === 'frances') {
      let pagoConst;
      if (r === 0) {
        pagoConst = C / n;
      } else {
        pagoConst = C * (r / (1 - Math.pow(1 + r, -n)));
      }

      for (let i = 1; i <= n; i++) {
        const interes = remaining * r;
        const amort = pagoConst - interes;
        remaining -= amort;
        const saldo = Math.max(remaining, 0);
        nuevaSchedule.push({
          periodo: i,
          pago: pagoConst,
          amort,
          interes,
          saldo,
        });
        total += pagoConst;
      }

      mensaje =
        n +
        ' cuotas de ' +
        formatearMoneda(pagoConst);
    } else {
      // Alemán: capital constante
      const amortConst = C / n;
      for (let i = 1; i <= n; i++) {
        const interes = remaining * r;
        const pago = amortConst + interes;
        remaining -= amortConst;
        const saldo = Math.max(remaining, 0);
        nuevaSchedule.push({
          periodo: i,
          pago,
          amort: amortConst,
          interes,
          saldo,
        });
        total += pago;
      }
      mensaje = ''; // en alemán no mostramos mensaje de cuota fija
    }

    setSchedule(nuevaSchedule);
    setMensajeCuotas(mensaje);
    setTotalAPagar(total);
  };

  // Datos para gráfico
  const chartData = schedule.map((row) => ({
    name: `C${row.periodo}`,
    capital: row.amort,
    interes: row.interes,
  }));

const barSize =
  chartData.length > 0
    ? Math.max(12, Math.min(40, 320 / chartData.length))
    : 18;


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const cap = payload.find((p) => p.dataKey === 'capital');
      const int = payload.find((p) => p.dataKey === 'interes');
      return (
        <div className="bg-white border border-gray-200 rounded-md p-2 shadow-sm text-xs">
          <p className="font-semibold mb-1">{label}</p>
          {cap && (
            <p className="text-[#0f2f4b]">
              Capital:{' '}
              {formatearMoneda(cap.value || 0)}
            </p>
          )}
          {int && (
            <p className="text-blue-600">
              Interés:{' '}
              {formatearMoneda(int.value || 0)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // ========= Exportar a PDF =========

  const exportarPDF = async () => {
    if (!schedule || schedule.length === 0) {
      alert('Primero calculá la amortización.');
      return;
    }

    setExportingPDF(true);
    try {
      const capital = parseMonto(capitalInput) || 0;
      const tasaMensual = parseInflacionMensual(inflacionMensualInput) || 0;
      const totalInteres = totalAPagar - capital;

      const filasSchedule = [
        ['Período', 'Cuota', 'Capital', 'Interés', 'Saldo'],
        ...schedule.map((r) => [
          r.periodo.toString(),
          formatearMoneda(r.pago),
          formatearMoneda(r.amort),
          formatearMoneda(r.interes),
          formatearMoneda(r.saldo),
        ]),
      ];

      const response = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/generate-pdf`,
        {
          content: [
            {
              type: 'heading',
              text: 'SIMULADOR DE CUOTAS CON INFLACIÓN ESPERADA',
              level: 1,
              alignment: 'center',
              color: '#2563eb',
            },
            {
              type: 'paragraph',
              text:
                'Cálculo de amortización con sistema ' +
                (sistema === 'frances' ? 'Francés (cuotas iguales)' : 'Alemán (capital constante)') +
                '.',
              alignment: 'center',
              size: 11,
              color: '#64748b',
            },
            { type: 'spacer', height: 20 },
            {
              type: 'table',
              border: true,
              widths: ['*', 'auto'],
              cellPadding: 10,
              headerStyle: {
                background: '#eff6ff',
                color: '#1e40af',
                bold: true,
              },
              rows: [
                ['Dato', 'Valor'],
                ['Capital inicial', formatearMoneda(capital)],
                [
                  'Inflación / tasa mensual utilizada',
                  formatearPorcentaje(tasaMensual * 100),
                ],
                [
                  'Sistema de amortización',
                  sistema === 'frances' ? 'Francés' : 'Alemán',
                ],
                ['Número de cuotas', numCuotas],
              ],
            },
            { type: 'spacer', height: 20 },
            {
              type: 'table',
              border: true,
              widths: ['*', 'auto'],
              cellPadding: 10,
              rows: [
                [
                  { text: 'Total a pagar', bold: true },
                  {
                    text: formatearMoneda(totalAPagar),
                    alignment: 'right',
                    size: 12,
                    bold: true,
                    color: '#2563eb',
                  },
                ],
                [
                  { text: 'Total de intereses', bold: true },
                  {
                    text: formatearMoneda(totalInteres),
                    alignment: 'right',
                    size: 12,
                    color: '#16a34a',
                  },
                ],
              ],
            },
            { type: 'spacer', height: 25 },
            {
              type: 'heading',
              text: 'Detalle del cronograma de pagos',
              level: 2,
              color: '#1e293b',
            },
            {
              type: 'table',
              border: true,
              widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
              cellPadding: 6,
              rows: filasSchedule,
            },
            { type: 'spacer', height: 25 },
            {
              type: 'paragraph',
              text: `Documento generado el ${moment().format(
                'DD/MM/YYYY [a las] HH:mm'
              )}`,
              alignment: 'center',
              size: 9,
              color: '#94a3b8',
            },
          ],
          fileName: `amortizacion-${moment().format('YYYY-MM-DD')}`,
        },
        {
          headers: {
            'x-api-key': window.config.apiKey,
          },
        }
      );

      const signedUrlResponse = await axios.get(
        `${process.env.PROXY_INTEGRATION_URL}/files/signed-url`,
        {
          params: {
            fileUrl: response.data.url,
          },
          headers: {
            'x-api-key': window.config.apiKey,
          },
        }
      );

      const link = document.createElement('a');
      link.href = signedUrlResponse.data.signedUrl;
      link.download = `amortizacion-${moment().format('YYYY-MM-DD')}.pdf`;
      link.click();
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            {toolName || 'Calculadora de amortización'}


          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Simula el cronograma de cuotas de un préstamo y calcula el total a pagar,
            usando como tasa la <strong>inflación mensual esperada (REM – BCRA)</strong>.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bloque REM / Inflación esperada */}
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
                  Podés ajustar manualmente la tasa mensual, partiendo de la REM.
                </p>
                <div className="mt-2 relative">
                  <Input
                    type="text"
                    value={inflacionMensualInput}
                    onChange={handleInflacionMensualChange}
                    placeholder="Ej: 2,00"
                    className="pr-10 text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario principal */}
<div className="space-y-2">
  <p className="text-sm font-semibold text-[#0f2f4b]">
    Datos del préstamo
  </p>

  <div className="md:col-span-2 flex flex-col md:flex-row md:gap-4 md:items-end">
    <div className="flex-1 space-y-1">
      <Label htmlFor="capital" className="flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Capital ($)
      </Label>
      <InputFinfocus
        id="capital"
        type="text"
        icon="$"
        value={capitalInput}
        onChange={handleMontoChange(setCapitalInput)}
        placeholder="100.000,00"
      />
    </div>

    <div className="flex-1 space-y-1">
      <Label htmlFor="numCuotas">Número de cuotas</Label>
      <select
        id="numCuotas"
        value={numCuotas}
        onChange={(e) => setNumCuotas(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
      >
        {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n} cuota{n > 1 ? 's' : ''}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="space-y-1">
    <Label htmlFor="sistema">Sistema de amortización</Label>
    <select
      id="sistema"
      value={sistema}
      onChange={(e) => setSistema(e.target.value)}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
    >
      <option value="frances">Francés (cuotas iguales)</option>
      <option value="aleman">Alemán (capital constante)</option>
    </select>
  </div>
</div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <div className="flex flex-col md:flex-row gap-3 md:items-center w-full">
                <Button
                  onClick={calcularAmortizacion}
                  className="w-full md:w-auto bg-[#0f2f4b] hover:bg-[#0b233a]"
                  size="lg"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  Calcular amortización
                </Button>

                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full md:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleOpenSaveDialog}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Guardar en juicio
                  </Button>
                </DialogTrigger>
              </div>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Guardar simulación en un juicio</DialogTitle>
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
                      placeholder="Ej: Simulación de oferta en cuotas"
                    />
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      value={saveNotes}
                      onChange={(e) => setSaveNotes(e.target.value)}
                      placeholder="Notas sobre la propuesta, supuestos, etc."
                      rows={3}
                    />
                  </div>

                  {/* Resumen breve */}
                  {totalAPagar != null && (
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2">
                      <p className="font-semibold mb-1">Resumen a guardar</p>
                      <p>
                        Total a pagar:{' '}
                        <span className="font-bold text-[#0f2f4b]">
                          {formatearMoneda(totalAPagar)}
                        </span>
                      </p>
                      {mensajeCuotas && (
                        <p className="mt-1">
                          {mensajeCuotas}
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
            </Dialog>

            {/* Botón de PDF se mantiene igual */}
            <Button
              onClick={exportarPDF}
              disabled={exportingPDF || schedule.length === 0}
              className="w-full md:w-auto"
              variant="outline"
            >
              {exportingPDF ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar a PDF
                </>
              )}
            </Button>
          </div>

          {/* Resultado */}
          {schedule.length > 0 && (
            <div className="space-y-4 mt-4">
              {mensajeCuotas && (
                <div className="bg-[#FEFCE8] px-4 py-2 rounded-md text-center font-semibold text-[#0f2f4b] text-sm">
                  {mensajeCuotas}
                </div>
              )}

              {totalAPagar != null && (
                <div className="bg-[#E8F4FB] px-4 py-2 rounded-md text-center font-semibold text-[#0f2f4b] text-sm">
                  Total a pagar: {formatearMoneda(totalAPagar)}
                </div>
              )}

              {/* Tabla */}
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-[#E8F4FB]/40">
                <table className="min-w-full text-xs md:text-sm text-center">
                  <thead className="bg-[#0f2f4b] text-white">
                    <tr>
                      <th className="px-2 py-2">Período</th>
                      <th className="px-2 py-2">
                        Valor cuota
                        <br />
                        (Capital + Interés)
                      </th>
                      <th className="px-2 py-2">Capital</th>
                      <th className="px-2 py-2">Interés</th>
                      <th className="px-2 py-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.periodo} className="odd:bg-white even:bg-slate-50">
                        <td className="px-2 py-1">{row.periodo}</td>
                        <td className="px-2 py-1">
                          {formatearMoneda(row.pago)}
                        </td>
                        <td className="px-2 py-1">
                          {formatearMoneda(row.amort)}
                        </td>
                        <td className="px-2 py-1">
                          {formatearMoneda(row.interes)}
                        </td>
                        <td className="px-2 py-1">
                          {formatearMoneda(row.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Gráfico */}
{chartData.length > 0 && (
  <Card className="mt-2 border border-blue-100">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold text-[#0f2f4b]">
        Descomposición de cada cuota (capital vs interés)
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis
              tickFormatter={(v) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`
              }
              tick={{ fontSize: 10 }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="capital"
              name="Capital"
              stackId="a"
              barSize={barSize}
              fill="#0f2f4b"      // azul FINFOCUS
            />
            <Bar
              dataKey="interes"
              name="Interés"
              stackId="a"
              barSize={barSize}
              fill="#5EA6D7"      // celeste FINFOCUS
            />
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