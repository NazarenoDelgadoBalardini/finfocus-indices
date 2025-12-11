import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialData } from '@/entities/FinancialData';
import {
  Calculator,
  Percent,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText,
} from 'lucide-react';
import moment from 'moment';
import axios from 'axios';

// 📊 Recharts
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from 'recharts';

export default function AjustePorInflacion({ toolId, toolName }) {
  const [ipcData, setIpcData] = useState([]);
  const [inflationChartData, setInflationChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [montoInicial, setMontoInicial] = useState('');
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadIPCData();
  }, []);

  // Parseo robusto de números con formato AR (7.314,0 → 7314.0)
  const parseNumberAR = (value) => {
    if (value == null) return null;
    const str = String(value).trim();
    if (!str) return null;
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isNaN(n) ? null : n;
  };

  // Carga y procesamiento de IPC desde FinancialData
  const loadIPCData = async () => {
    setLoading(true);
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
        console.warn('⚠️ No se encontraron datos de IPC');
        setIpcData([]);
        setInflationChartData([]);
        return;
      }

      const ipcRecord = allData[0];

      const processedData = [];
      if (ipcRecord.data && Array.isArray(ipcRecord.data)) {
        const headers = ipcRecord.headers || [];
        const headersLower = headers.map((h) =>
          (h || '').toString().toLowerCase()
        );

        // Índices de columnas
        const fechaIdx = headersLower.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('periodo') ||
            h.includes('período') ||
            h.includes('mes')
        );

        const indiceIdx = headersLower.findIndex(
          (h) =>
            // tratar de agarrar el índice de nivel general, evitando variaciones
            (h.includes('indice') || h.includes('índice') || h.includes('nivel') || h.includes('ipc')) &&
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

        const interanualIdx = headersLower.findIndex(
          (h) =>
            h.includes('interanual') ||
            h.includes('inter anual') ||
            h.includes('12 meses') ||
            (h.includes('anual') && !h.includes('mensual'))
        );

        if (fechaIdx === -1) {
          console.error('No se encontró columna de fecha en IPC');
        }

        // Parsear filas
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

          if (interanualIdx !== -1 && row[interanualIdx] != null) {
            registro.inflInteranual = parseNumberAR(row[interanualIdx]);
          }

          processedData.push(registro);
        }
      }

      // Ordenar por fecha
      processedData.sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

      setIpcData(processedData);

      // Construir datos para los gráficos
      let seriesConInflacion = [];

      if (
        processedData.length > 0 &&
        processedData.some(
          (d) =>
            d.inflMensual != null &&
            d.inflInteranual != null
        )
      ) {
        // Caso 1: ya tenemos variaciones mensual e interanual en la BD
        seriesConInflacion = processedData.filter(
          (d) =>
            d.inflMensual != null &&
            !Number.isNaN(d.inflMensual) &&
            d.inflInteranual != null &&
            !Number.isNaN(d.inflInteranual)
        );
      } else if (
        processedData.length > 1 &&
        processedData.every((d) => d.indice != null)
      ) {
        // Caso 2: solo tenemos índice → calculamos variaciones
        seriesConInflacion = processedData
          .map((item, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const prevYear = idx >= 12 ? arr[idx - 12] : null;

            const inflMensual =
              prev != null && prev.indice
                ? ((item.indice / prev.indice) - 1) * 100
                : null;

            const inflInteranual =
              prevYear != null && prevYear.indice
                ? ((item.indice / prevYear.indice) - 1) * 100
                : null;

            return {
              ...item,
              inflMensual,
              inflInteranual,
            };
          })
          .filter(
            (d) =>
              d.inflMensual != null &&
              !Number.isNaN(d.inflMensual) &&
              d.inflInteranual != null &&
              !Number.isNaN(d.inflInteranual)
          );
      }

      const last12 = seriesConInflacion.slice(-12);

      const chartData = last12.map((d) => ({
        name: moment(d.fecha).format('MM/YY'),
        inflMensual: Number(d.inflMensual.toFixed(2)),
        inflInteranual: Number(d.inflInteranual.toFixed(2)),
      }));

      setInflationChartData(chartData);

      console.log(
        '📊 IPC cargado:',
        processedData.length,
        'registros. Puntos para gráfico:',
        chartData.length
      );
    } catch (error) {
      console.error('Error cargando IPC:', error);
    } finally {
      setLoading(false);
    }
  };

  // Parsear "mmm-yy" (ej: "feb-13" = febrero 2013)
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

  // Variantes comunes
  set: 8,       // Portugués ("setembro")
  sept: 8,      // Español extendido (“septiembre”)

  // Inglés
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
      console.error('Error parseando fecha:', fechaStr, error);
      return null;
    }
  };

  // Cálculo del ajuste
  const calcularAjuste = () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor ingresa ambas fechas');
      return;
    }

    const montoParseado = parseFloat(
      montoInicial
        .replace(/[^0-9,]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    );

    if (!montoInicial || isNaN(montoParseado) || montoParseado <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    const monto = montoParseado;

    const indiceInicio = buscarIndicePorMes(fechaInicio);
    const indiceFin = buscarIndicePorMes(fechaFin);

    if (!indiceInicio || !indiceFin) {
      alert(
        'No se encontraron datos de IPC para alguna de las fechas seleccionadas (mes/año).'
      );
      return;
    }

    const variacion =
      ((indiceFin.indice - indiceInicio.indice) /
        indiceInicio.indice) *
      100;
    const montoAjustado =
      monto * (indiceFin.indice / indiceInicio.indice);
    const diferencia = montoAjustado - monto;

    const nuevoResultado = {
      fechaInicio,
      fechaFin,
      indiceInicio: indiceInicio.indice,
      indiceFin: indiceFin.indice,
      variacion,
      montoInicial: monto,
      montoAjustado,
      diferencia,
      timestamp: new Date().toISOString(),
    };

    setResultado(nuevoResultado);
    setHistorial([nuevoResultado, ...(historial || [])]);
  };

  // Busca índice por coincidencia EXACTA de mes/año
  const buscarIndicePorMes = (fechaISO) => {
    if (ipcData.length === 0) return null;

    const [yearBuscado, mesBuscado] = fechaISO
      .split('-')
      .map(Number);

    return (
      ipcData.find((item) => {
        const fechaItem = new Date(item.fecha);
        return (
          fechaItem.getFullYear() === yearBuscado &&
          fechaItem.getMonth() === mesBuscado - 1
        );
      }) || null
    );
  };

// Variación para un período de N meses hacia atrás tomando como final el ÚLTIMO dato de IPC
const calcularVariacionPeriodoMeses = (mesesAtras) => {
  if (!ipcData || ipcData.length === 0) return null;

  const idxFin = ipcData.length - 1; // último registro disponible
  const idxIni = idxFin - mesesAtras;

  if (idxIni < 0) return null;

  const regFin = ipcData[idxFin];
  const regIni = ipcData[idxIni];

  if (!regFin?.indice || !regIni?.indice) return null;

  const variacion =
    ((regFin.indice / regIni.indice) - 1) * 100;

  return variacion; // en %
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

  const handleMontoChange = (e) => {
    let value = e.target.value.replace(/[^0-9,]/g, '');
    const parts = value.split(',');
    let parteEntera = parts[0];
    const parteDecimal = parts[1];

    if (parteEntera) {
      parteEntera = parteEntera.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        '.'
      );
    }

    let formattedValue = parteEntera;
    if (parts.length > 1) {
      formattedValue += ',' + (parteDecimal || '');
    }

    setMontoInicial(formattedValue);
  };

  const exportarPDF = async () => {
    if (!resultado) return;

    setExportingPDF(true);
    try {
      const response = await axios.post(
        `${process.env.PROXY_INTEGRATION_URL}/documents/generate-pdf`,
        {
          content: [
            {
              type: 'heading',
              text: 'AJUSTE POR INFLACIÓN',
              level: 1,
              alignment: 'center',
              color: '#2563eb',
            },
            {
              type: 'paragraph',
              text: 'IPC Nivel General - INDEC',
              alignment: 'center',
              size: 12,
              color: '#64748b',
            },
            { type: 'spacer', height: 30 },
            {
              type: 'table',
              border: true,
              headerStyle: {
                background: '#eff6ff',
                color: '#1e40af',
                bold: true,
              },
              widths: ['*', '*'],
              cellPadding: 12,
              rows: [
                ['Período', 'Valor'],
                [
                  { text: 'Fecha Inicial', bold: true },
                  moment(resultado.fechaInicio).format(
                    'DD/MM/YYYY'
                  ),
                ],
                [
                  'Índice Inicial',
                  resultado.indiceInicio.toFixed(2),
                ],
                [
                  { text: 'Fecha Final', bold: true },
                  moment(resultado.fechaFin).format(
                    'DD/MM/YYYY'
                  ),
                ],
                [
                  'Índice Final',
                  resultado.indiceFin.toFixed(2),
                ],
              ],
            },
            { type: 'spacer', height: 20 },
            {
              type: 'table',
              border: false,
              alignment: 'center',
              widths: ['*'],
              rows: [
                [
                  {
                    type: 'stack',
                    stack: [
                      {
                        text: 'VARIACIÓN DEL IPC',
                        size: 12,
                        color: '#64748b',
                        alignment: 'center',
                      },
                      {
                        text: formatearPorcentaje(
                          resultado.variacion
                        ),
                        size: 32,
                        bold: true,
                        color: '#2563eb',
                        alignment: 'center',
                        margin: [0, 5, 0, 0],
                      },
                    ],
                  },
                ],
              ],
            },
            { type: 'spacer', height: 30 },
            {
              type: 'heading',
              text: 'Cálculo del Ajuste',
              level: 2,
              color: '#1e293b',
            },
            { type: 'spacer', height: 10 },
            {
              type: 'table',
              border: true,
              widths: ['*', 'auto'],
              cellPadding: 12,
              rows: [
                [
                  { text: 'Monto Inicial', bold: true },
                  {
                    text: formatearMoneda(
                      resultado.montoInicial
                    ),
                    alignment: 'right',
                    size: 12,
                  },
                ],
                [
                  {
                    text: 'Monto Ajustado',
                    bold: true,
                    color: '#2563eb',
                  },
                  {
                    text: formatearMoneda(
                      resultado.montoAjustado
                    ),
                    alignment: 'right',
                    bold: true,
                    size: 14,
                    color: '#2563eb',
                  },
                ],
                [
                  {
                    text: 'Diferencia',
                    bold: true,
                    color: '#16a34a',
                  },
                  {
                    text:
                      '+ ' +
                      formatearMoneda(resultado.diferencia),
                    alignment: 'right',
                    bold: true,
                    size: 12,
                    color: '#16a34a',
                  },
                ],
              ],
            },
            { type: 'spacer', height: 40 },
            {
              type: 'paragraph',
              text: `Documento generado el ${moment().format(
                'DD/MM/YYYY [a las] HH:mm'
              )}`,
              alignment: 'center',
              size: 9,
              color: '#94a3b8',
            },
            {
              type: 'paragraph',
              text:
                'Los datos utilizados provienen del INDEC (Instituto Nacional de Estadística y Censos)',
              alignment: 'center',
              size: 8,
              color: '#cbd5e1',
              margin: [0, 5, 0, 0],
            },
          ],
          fileName: `ajuste-inflacion-${moment().format(
            'YYYY-MM-DD'
          )}`,
          spacing: {
            paragraph: 12,
            heading: 20,
            afterHeading: 15,
            table: 15,
            cellPadding: 10,
          },
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
      link.download = `ajuste-inflacion-${moment().format(
        'YYYY-MM-DD'
      )}.pdf`;
      link.click();

      console.log('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert(
        'Error al generar el PDF. Por favor intenta nuevamente.'
      );
    } finally {
      setExportingPDF(false);
    }
  };

  // Tooltip custom para los gráficos
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const mensual = payload.find(
        (p) => p.dataKey === 'inflMensual'
      );
      const interanual = payload.find(
        (p) => p.dataKey === 'inflInteranual'
      );
      return (
        <div className="bg-white border border-gray-200 rounded-md p-2 shadow-sm text-xs">
          <p className="font-semibold mb-1">{label}</p>
          {mensual && (
            <p className="text-blue-600">
              Mensual:{' '}
              {formatearPorcentaje(mensual.value || 0)}
            </p>
          )}
          {interanual && (
            <p className="text-amber-600">
              Interanual:{' '}
              {formatearPorcentaje(interanual.value || 0)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">
            Cargando datos de IPC...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (ipcData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 font-semibold mb-2">
            ⚠️ No hay datos de IPC disponibles
          </p>
          <p className="text-gray-600 text-sm">
            Por favor verifica que los datos financieros estén
            sincronizados correctamente.
          </p>
          <Button onClick={loadIPCData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

const fechaMinima = ipcData[0]?.fecha;
const fechaMaxima = ipcData[ipcData.length - 1]?.fecha;

// Cuadros de inflación informativos, respecto del ÚLTIMO IPC
const cuadrosInflacion = ipcData && ipcData.length > 12
  ? {
      interanual:    calcularVariacionPeriodoMeses(12),
      semestral:     calcularVariacionPeriodoMeses(6),
      cuatrimestral: calcularVariacionPeriodoMeses(4),
      trimestral:    calcularVariacionPeriodoMeses(3),
      mensual:       calcularVariacionPeriodoMeses(1),
    }
  : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-6 w-6 text-blue-600" />
            {toolName || 'Ajuste por Inflación'}
            <span className="ml-auto text-sm font-normal text-green-600 bg-green-50 px-3 py-1 rounded-full">
              ✨ Herramienta Gratuita
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Calcula el ajuste por inflación utilizando el IPC Nivel
            General. Datos disponibles desde{' '}
            {moment(fechaMinima).format('MM/YYYY')} hasta{' '}
            {moment(fechaMaxima).format('MM/YYYY')}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

{/* 🔹 CUADROS DE INFLACIÓN – SIEMPRE ARRIBA */}
{cuadrosInflacion && (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

    {/* Interanual */}
    <div className="rounded-xl p-3 text-center bg-red-50 text-[#0f2f4b]">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Interanual</p>
      <p className="text-xl font-extrabold mt-1">
        {formatearPorcentaje(cuadrosInflacion.interanual)}
      </p>
    </div>

    {/* Semestral */}
    <div className="rounded-xl p-3 text-center bg-purple-50 text-[#0f2f4b]">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Semestral</p>
      <p className="text-xl font-extrabold mt-1">
        {formatearPorcentaje(cuadrosInflacion.semestral)}
      </p>
    </div>

    {/* Cuatrimestral */}
    <div className="rounded-xl p-3 text-center bg-amber-50 text-[#0f2f4b]">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Cuatrimestral</p>
      <p className="text-xl font-extrabold mt-1">
        {formatearPorcentaje(cuadrosInflacion.cuatrimestral)}
      </p>
    </div>

    {/* Trimestral */}
    <div className="rounded-xl p-3 text-center bg-green-50 text-[#0f2f4b]">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Trimestral</p>
      <p className="text-xl font-extrabold mt-1">
        {formatearPorcentaje(cuadrosInflacion.trimestral)}
      </p>
    </div>

    {/* Mensual */}
    <div className="rounded-xl p-3 text-center bg-blue-50 text-[#0f2f4b]">
      <p className="text-[11px] font-semibold uppercase tracking-wide">Mensual</p>
      <p className="text-xl font-extrabold mt-1">
        {formatearPorcentaje(cuadrosInflacion.mensual)}
      </p>
    </div>

  </div>
)}

          {/* 📊 Gráficos inflación últimos 12 meses */}
          {inflationChartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gráfico inflación mensual */}
              <Card className="border border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-600" />
                    Inflación mensual – últimos 12 meses
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    Variación % de un mes a otro (IPC Nivel General).
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full h-64">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart data={inflationChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            `${v.toFixed(0)}%`
                          }
                          tick={{ fontSize: 10 }}
                        />
                        <RechartsTooltip
                          content={<CustomTooltip />}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 10 }}
                        />
                        <Bar
                          dataKey="inflMensual"
                          name="Mensual"
                          barSize={18}
                        >
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
                </CardContent>
              </Card>

              {/* Gráfico inflación interanual */}
              <Card className="border border-amber-100 bg-amber-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-amber-600" />
                    Inflación interanual – últimos 12 meses
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    Variación % contra el mismo mes del año anterior.
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="w-full h-64">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart data={inflationChartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            `${v.toFixed(0)}%`
                          }
                          tick={{ fontSize: 10 }}
                        />
                        <RechartsTooltip
                          content={<CustomTooltip />}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 10 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="inflInteranual"
                          name="Interanual"
                          dot={{ r: 2 }}
                          activeDot={{ r: 3 }}
                        >
                          <LabelList
                            dataKey="inflInteranual"
                            position="top"
                            formatter={(v) =>
                              `${Number(v).toFixed(1)}%`
                            }
                            className="text-[10px]"
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

{/* Formulario de cálculo */}
<div className="flex flex-col gap-4">

  <div className="space-y-2">
    <Label htmlFor="montoInicial" className="flex items-center gap-2">
      <DollarSign className="h-4 w-4" />
      Monto inicial ($)
    </Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
        $
      </span>
      <Input
        id="montoInicial"
        type="text"
        placeholder="100.000,00"
        value={montoInicial}
        onChange={handleMontoChange}
        className="text-lg pl-8"
      />
    </div>
    <p className="text-xs text-gray-500">Formato: 100.000,00</p>
  </div>

  <div className="space-y-2">
    <Label htmlFor="fechaInicio" className="flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Fecha inicial
    </Label>
    <Input
      id="fechaInicio"
      type="date"
      value={fechaInicio}
      onChange={(e) => setFechaInicio(e.target.value)}
      min={fechaMinima?.split('T')[0]}
      max={fechaMaxima?.split('T')[0]}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="fechaFin" className="flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Fecha final
    </Label>
    <Input
      id="fechaFin"
      type="date"
      value={fechaFin}
      onChange={(e) => setFechaFin(e.target.value)}
      min={fechaMinima?.split('T')[0]}
      max={fechaMaxima?.split('T')[0]}
    />
  </div>

</div>

<Button
  onClick={calcularAjuste}
  className="w-full bg-[#0f2f4b] hover:bg-[#0d263d]"
  size="lg"
>
            <Percent className="h-5 w-5 mr-2" />
            Calcular Ajuste
          </Button>

          {/* Resultado */}
          {resultado && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Percent className="h-5 w-5" />
                  Resultado del Ajuste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">
                      Fecha inicial
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {moment(resultado.fechaInicio).format(
                        'DD/MM/YYYY'
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Índice:{' '}
                      {resultado.indiceInicio.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 mb-1">
                      Fecha final
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {moment(resultado.fechaFin).format(
                        'DD/MM/YYYY'
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Índice:{' '}
                      {resultado.indiceFin.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-600 text-white p-4 rounded-lg">
                  <p className="text-sm opacity-90 mb-1">
                    Variación del IPC
                  </p>
                  <p className="text-3xl font-bold">
                    {formatearPorcentaje(resultado.variacion)}
                  </p>
                </div>

                <div className="space-y-2 bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      Monto inicial:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatearMoneda(resultado.montoInicial)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-600">
                      Monto ajustado:
                    </span>
                    <span className="font-bold text-blue-600">
                      {formatearMoneda(
                        resultado.montoAjustado
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">
                      Diferencia:
                    </span>
                    <span className="font-semibold text-green-600">
                      +{' '}
                      {formatearMoneda(
                        resultado.diferencia
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={exportarPDF}
                  disabled={exportingPDF}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          {historial.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Historial de Cálculos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {historial.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setResultado(item)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">
                            {moment(item.fechaInicio).format(
                              'MM/YYYY'
                            )}{' '}
                            →{' '}
                            {moment(item.fechaFin).format(
                              'MM/YYYY'
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatearMoneda(
                              item.montoInicial
                            )}{' '}
                            →{' '}
                            {formatearMoneda(
                              item.montoAjustado
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">
                            {formatearPorcentaje(
                              item.variacion
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {moment(item.timestamp).format(
                              'DD/MM HH:mm'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
