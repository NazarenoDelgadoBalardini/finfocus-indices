import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  Info,
  PiggyBank,
} from 'lucide-react';
import { FinancialData } from '@/entities/FinancialData';
import moment from 'moment';

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

// 📊 Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export default function ContadoOCuotas({ toolName }) {
  const [montoPrestamo, setMontoPrestamo] = useState('');
  const [valorCuota, setValorCuota] = useState('');
  const [cantidadCuotas, setCantidadCuotas] = useState('');
  const [inflacionMensualInput, setInflacionMensualInput] = useState(''); // texto, ej "2,50"
  const [resultado, setResultado] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loadingREM, setLoadingREM] = useState(true);
  const [remInfo, setRemInfo] = useState(null); // {fecha, inflAnual, inflMensual}
  const [errorREM, setErrorREM] = useState(null);

  useEffect(() => {
    loadREMData();
  }, []);

  // ========= Helpers de formato =========

  // Formato moneda AR estilo FINFOCUS
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
    // Sólo números y coma, sin símbolo %
    let val = e.target.value.replace(/[^0-9,]/g, '');

    // Si el usuario mete más de una coma, nos quedamos con la primera
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
    return Number.isNaN(num) ? null : num / 100; // devolver en decimal
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

      // 🧠 1) Intentar usar headers si existen
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

      // 🧠 2) Si NO hay headers útiles, asumir estructura [fecha, valor]
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

      // Si aún así no tenemos índices válidos → error
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

        const anual = parseNumberAR(valorRaw); // interpretamos como inflación anual (en %)
        if (anual == null) continue;

        registros.push({ fecha, inflAnual: anual });
      }

      if (registros.length === 0) {
        setErrorREM('No se pudo leer la inflación anual esperada.');
        setRemInfo(null);
        return;
      }

      // Ordenar por fecha y tomar el último dato
      registros.sort((a, b) => a.fecha - b.fecha);
      const last = registros[registros.length - 1];

      const inflMensual = Math.pow(1 + last.inflAnual / 100, 1 / 12) - 1;

      const info = {
        fecha: last.fecha,
        inflAnual: last.inflAnual,
        inflMensual,
      };

      setRemInfo(info);

      // Prefill del input de inflación mensual si estaba vacío
      if (!inflacionMensualInput) {
        const valorTxt = (info.inflMensual * 100).toFixed(2).replace('.', ',');
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

  // ========= Cálculos financieros =========

  const calcularTasaAnualImplicita = (precioContado, precioCuota, nCuotas) => {
    // Si las cuotas son simplemente precioContado/n, la tasa es 0
    const teorica = precioContado / nCuotas;
    if (Math.abs(precioCuota - teorica) < 0.0001) return 0;

    let low = 0;
    let high = 1; // 100% mensual como techo inicial
    let mid = 0;

    for (let i = 0; i < 50; i++) {
      mid = (low + high) / 2;
      const pv =
        (precioCuota * (1 - Math.pow(1 + mid, -nCuotas))) / mid;
      if (pv > precioContado) {
        low = mid;
      } else {
        high = mid;
      }
    }
    const tasaMensual = mid;
    const tasaAnual = Math.pow(1 + tasaMensual, 12) - 1;
    return tasaAnual;
  };

  const calcularConveniencia = () => {
    const monto = parseMonto(montoPrestamo);
    const cuota = parseMonto(valorCuota);
    const nCuotas = parseInt(cantidadCuotas, 10);
    const inflMensual = parseInflacionMensual(inflacionMensualInput);

    if (!monto || !cuota || !nCuotas || nCuotas <= 0 || inflMensual == null) {
      alert('Por favor completa todos los campos con valores válidos.');
      return;
    }

    // Valor presente de las cuotas, descontando a inflación mensual
    let vp = 0;
    const valoresCuotas = [];
    for (let i = 0; i < nCuotas; i++) {
      const cuotaVP = cuota / Math.pow(1 + inflMensual, i + 1);
      vp += cuotaVP;
      valoresCuotas.push({
        label: `Cuota ${i + 1}`,
        valorActual: Math.round(cuotaVP * 100) / 100,
      });
    }

    setChartData(
      valoresCuotas.map((c, idx) => ({
        name: `C${idx + 1}`,
        valorActual: c.valorActual,
      }))
    );

    let mensaje;
    let esConveniente;
    if (vp > monto) {
      mensaje = '❌ No te conviene sacar el préstamo (es mejor pagar al contado).';
      esConveniente = false;
    } else {
      mensaje =
        '😲 Te conviene sacar el préstamo (las cuotas valen menos en términos reales).';
      esConveniente = true;
    }

    // Tasa de interés implícita del préstamo
    const tasaAnual = calcularTasaAnualImplicita(monto, cuota, nCuotas);
    const tasaMensualEquivalente =
      Math.pow(1 + tasaAnual, 1 / 12) - 1;

    setResultado({
      monto,
      cuota,
      nCuotas,
      inflMensual,
      valorPresenteCuotas: vp,
      diferencia: vp - monto,
      mensaje,
      esConveniente,
      tasaAnual,
      tasaMensualEquivalente,
      timestamp: new Date().toISOString(),
    });
  };

  // Tooltip gráfico
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-md p-2 shadow-sm text-xs">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-blue-700">
            Valor actual:{' '}
            {formatearMoneda(p.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-blue-600" />
            {toolName || 'Contado o en cuotas'}
            <span className="ml-auto text-sm font-normal text-green-600 bg-green-50 px-3 py-1 rounded-full">
              ✨ Herramienta Gratuita
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Compara el <strong>valor presente </strong> del préstamo con el valor
            de tener <strong>disponible</strong> hoy el dinero.
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
                              {formatearPorcentaje(
                                remInfo.inflMensual * 100
                              )}
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
                  Podés ajustar la inflación mensual, parte de la
                  REM pero editable.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <p className="text-sm font-semibold text-[#0f2f4b]">
                Datos del préstamo / compra
              </p>
            </div>

<div className="md:col-span-3 flex flex-col md:flex-row md:gap-4 md:items-end">
  <div className="flex-1 space-y-1">
    <Label
      htmlFor="montoPrestamo"
      className="flex items-center gap-2"
    >
      <DollarSign className="h-4 w-4" />
      Monto del préstamo / precio contado
    </Label>
    <InputFinfocus
      id="montoPrestamo"
      type="text"
      icon="$"
      value={montoPrestamo}
      onChange={handleMontoChange(setMontoPrestamo)}
      placeholder="100.000,00"
    />
  </div>

  <div className="flex-1 space-y-1">
    <Label htmlFor="valorCuota">
      Valor de cada cuota
    </Label>
    <InputFinfocus
      id="valorCuota"
      type="text"
      icon="$"
      value={valorCuota}
      onChange={handleMontoChange(setValorCuota)}
      placeholder="10.000,00"
    />
  </div>

  <div className="flex-1 space-y-1">
    <Label htmlFor="cantidadCuotas">
      Cantidad de cuotas
    </Label>
    <InputFinfocus
      id="cantidadCuotas"
      type="number"
      min={1}
      value={cantidadCuotas}
      onChange={(e) => setCantidadCuotas(e.target.value)}
      placeholder="12"
    />
  </div>
</div>
          </div>

          <Button
            onClick={calcularConveniencia}
            className="w-full bg-[#0f2f4b] hover:bg-[#0b233a]"
            size="lg"
          >
            <PiggyBank className="h-5 w-5 mr-2" />
            Calcular conveniencia
          </Button>

          {/* Resultado */}
          {resultado && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              {/* Resumen numérico */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-[#0f2f4b]">
                    <TrendingUp className="h-5 w-5" />
                    Resultado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p
                    className={`text-sm font-semibold ${
                      resultado.esConveniente
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}
                  >
                    {resultado.mensaje}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500">
                        Pagar al contado hoy
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatearMoneda(resultado.monto)}
                      </p>
                    </div>
<div className="rounded-xl p-3 shadow-md bg-gradient-to-br from-[#e3eff7] to-[#cfe4f2] border border-[#0f2f4b]/20">
  <p className="text-xs text-[#0f2f4b]/80 font-semibold">
    Valor presente de las cuotas
  </p>
  <p className="text-xl font-extrabold text-[#0f2f4b] mt-1">
    {formatearMoneda(resultado.valorPresenteCuotas)}
  </p>
</div>
                  </div>

                  <div className="bg-[#0f2f4b] text-white rounded-lg p-3">
                    <p className="text-xs text-white/80 mb-1">
                      Diferencia (VP cuotas – contado)
                    </p>
                    <p className="text-2xl font-bold">
                      {formatearMoneda(resultado.diferencia)}
                    </p>
                    <p className="text-[11px] text-white/80 mt-1">
                      Un valor negativo indica que las cuotas,
                      traídas a valor presente, son más “baratas” que
                      pagar hoy al contado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500">
                        Tasa de interés anual implícita del crédito
                      </p>
                      <p className="text-lg font-bold text-[#0f2f4b]">
                        {formatearPorcentaje(
                          resultado.tasaAnual * 100
                        )}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500">
                        Inflación mensual “de equilibrio”
                      </p>
                      <p className="text-lg font-bold text-[#0f2f4b]">
                        {formatearPorcentaje(
                          resultado.tasaMensualEquivalente * 100
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Si la inflación mensual efectiva es mayor a
                        este valor, conviene financiarse.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico VP de cada cuota */}
              {chartData && chartData.length > 0 && (
                <Card className="border border-blue-100 bg-white">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-semibold text-[#0f2f4b]">
                      Valor actual de cada cuota
                    </CardTitle>
                    <p className="text-[11px] text-gray-500">
                      Cada barra muestra cuánto vale hoy cada cuota,
                      descontada por la inflación mensual elegida.
                    </p>
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

  {/* Barra sin etiquetas arriba */}
  <Bar dataKey="valorActual" barSize={18} />
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
