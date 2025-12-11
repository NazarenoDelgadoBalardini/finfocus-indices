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
  Trash2,
  FileText,
} from 'lucide-react';
import { FinancialData } from '@/entities/FinancialData';
import moment from 'moment';
import axios from 'axios';

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

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

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
        className={`${icon ? 'pl-7' : 'pl-3'} text-left ${className}`}
      />
    </div>
  );
}

export default function ValorPresenteCuotas({ toolId, toolName }) {
  // ------- Estados principales -------
  const [capitalAdeudadoInput, setCapitalAdeudadoInput] = useState('');
  const [inflacionMensualInput, setInflacionMensualInput] = useState('');
  const [numCuotasAgregar, setNumCuotasAgregar] = useState('1');
  const [montoCuotaInput, setMontoCuotaInput] = useState('');

  const [cuotas, setCuotas] = useState([]); // array de montos (números)
  const [detalleCuotas, setDetalleCuotas] = useState([]); // [{numero,monto,valorPresente}]
  const [resultado, setResultado] = useState(null); // {valorPresenteTotal, porcentajeCapital, capitalAdeudado}


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
        console.error('Error cargando juicios para guardar cálculo:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);


  // ======== Helpers de formato ========

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

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);

  const formatearPorcentaje = (valor) =>
    `${valor.toFixed(2).replace('.', ',')}%`;

  const handleInflacionMensualChange = (e) => {
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

  // ========= Carga REM desde FinancialData =========

  const loadREMData = async () => {
    setLoadingREM(true);
    setErrorREM(null);
    try {
      const remRecords = await FinancialData.filter(
        { category: 'inflacion_esperada', isActive: true },
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
        setErrorREM(
          'Estructura de datos REM no reconocida (se esperaba [fecha, valor]).'
        );
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

  // ========= Gestión de cuotas =========

  const labelMontoCuota = `Monto de la cuota ${cuotas.length + 1} ($)`;

  const agregarCuota = () => {
    const monto = parseMonto(montoCuotaInput) || 0;
    const repeticiones = parseInt(numCuotasAgregar, 10) || 1;

    if (monto <= 0 || repeticiones < 1) {
      alert('Ingrese un monto válido y una cantidad de cuotas ≥ 1.');
      return;
    }

    const nuevas = [...cuotas];
    for (let i = 0; i < repeticiones; i++) {
      nuevas.push(monto);
    }
    setCuotas(nuevas);
    setMontoCuotaInput('');
    setNumCuotasAgregar('1');
    setResultado(null);
    setDetalleCuotas([]);
  };

  const eliminarCuota = (idx) => {
    const nuevas = cuotas.filter((_, i) => i !== idx);
    setCuotas(nuevas);
    setResultado(null);
    setDetalleCuotas([]);
  };

  // ===== Guardar en juicio: abrir diálogo =====
  const handleOpenSaveDialog = () => {
    if (!resultado) {
      alert('Primero calculá el valor presente para poder guardarlo en un juicio.');
      return;
    }

    const defaultTitle = saveTitle || (toolName || 'Valor presente de cuotas');
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  // ===== Guardar en juicio: confirmar =====
  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    if (!resultado) {
      alert('No hay cálculo para guardar.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      // Armamos payload con todo lo necesario para reconstruir
      const payload = {
        tipo: 'valor_presente_cuotas',
        entrada: {
          capitalAdeudadoInput,
          inflacionMensualInput,
          capitalAdeudado: parseMonto(capitalAdeudadoInput) || 0,
          inflacionMensualDecimal: parseInflacionMensual(inflacionMensualInput),
          cuotas,
        },
        resultado,
        detalleCuotas,
        remInfo,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Valor presente de cuotas',
        title: saveTitle || (toolName || 'Valor presente de cuotas'),
        notes: saveNotes,
        data: payload,
      });

      alert('✅ Resultado guardado en el juicio.');
      setSaveDialogOpen(false);
    } catch (e) {
      console.error('Error guardando resultado en juicio:', e);
      alert('No se pudo guardar el resultado. Intenta nuevamente.');
    } finally {
      setSavingResult(false);
    }
  };

  // ========= Cálculo Valor Presente =========

  const calcularValorPresente = () => {
    if (cuotas.length === 0) {
      alert('Debe agregar al menos una cuota.');
      return;
    }

    const r = parseInflacionMensual(inflacionMensualInput);
    if (r == null || r < 0) {
      alert("Ingrese una tasa de descuento válida, en formato 'XX,XX'.");
      return;
    }

    const capitalAdeudado = parseMonto(capitalAdeudadoInput) || 0;

    const detalle = [];
    let sumaTotal = 0;
    cuotas.forEach((monto, i) => {
      const periodo = i + 1;
      const vp = monto / Math.pow(1 + r, periodo);
      detalle.push({
        numero: periodo,
        monto,
        valorPresente: vp,
      });
      sumaTotal += vp;
    });

    let porcentajeCapital = null;
    if (capitalAdeudado > 0) {
      porcentajeCapital = (sumaTotal / capitalAdeudado) * 100;
    }

    setDetalleCuotas(detalle);
    setResultado({
      valorPresenteTotal: sumaTotal,
      porcentajeCapital,
      capitalAdeudado,
    });
  };

  // ========= Datos gráfico =========

  const chartData = detalleCuotas.map((c) => ({
    name: `Cuota ${c.numero}`,
    valorPresente: c.valorPresente,
  }));

  const barSize =
    chartData.length > 0
      ? Math.max(12, Math.min(40, 320 / chartData.length))
      : 18;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-white border border-gray-200 rounded-md p-2 shadow-sm text-xs">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-[#0f2f4b]">
            Valor presente: {formatearMoneda(p.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  // ========= Exportar a PDF (vía backend) =========

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" />
            {toolName || 'Valor presente de cuotas'}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Calcula el <strong>valor presente</strong> de una serie de cuotas
            descontadas a una tasa de <strong>inflación mensual estimada</strong>
            y compara el resultado con un capital adeudado.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bloque REM / Inflación esperada (vertical hero) */}
          <div className="space-y-3">
            <Card className="border border-blue-100 bg-gradient-to-br from-[#0f2f4b] via-[#1b446d] to-[#0f2f4b] text-white shadow-md">
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Info className="h-6 w-6 text-blue-100" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-100">
                        Inflación esperada · REM
                      </p>
                      {loadingREM ? (
                        <p className="text-xs text-blue-100 mt-2 flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Cargando expectativas de mercado...
                        </p>
                      ) : errorREM ? (
                        <p className="text-xs text-red-100 mt-2">
                          {errorREM}
                        </p>
                      ) : remInfo ? (
                        <>
                          <p className="text-xs text-blue-100/80 mt-1">
                            Última actualización:{' '}
                            <span className="font-semibold">
                              {moment(remInfo.fecha).format('DD/MM/YYYY')}
                            </span>
                          </p>
                          <p className="text-[11px] text-blue-100/80 mt-1">
                            Proyección anual de inflación del mercado, con su
                            equivalente mensual.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-blue-100 mt-2">
                          No se pudo obtener la inflación esperada.
                        </p>
                      )}
                    </div>
                  </div>

                  {remInfo && !loadingREM && !errorREM && (
                    <div className="grid grid-cols-2 gap-4 md:w-64">
                      <div className="bg-white/10 rounded-xl px-3 py-2 text-center border border-white/20">
                        <p className="text-[10px] uppercase tracking-wide text-blue-100/80">
                          Inflación anual esperada
                        </p>
                        <p className="text-2xl font-extrabold leading-tight">
                          {formatearPorcentaje(remInfo.inflAnual)}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl px-3 py-2 text-center text-[#0f2f4b] shadow-sm">
                        <p className="text-[10px] uppercase tracking-wide text-[#0f2f4b]/70">
                          Equivalente mensual
                        </p>
                        <p className="text-2xl font-extrabold leading-tight">
                          {formatearPorcentaje(remInfo.inflMensual * 100)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inflación mensual a usar */}
            <Card className="border border-indigo-100 bg-indigo-50/70">
              <CardContent className="py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Inflación mensual a usar
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Podés ajustar la tasa mensual que usarás para descontar las
                  cuotas, partiendo de la REM.
                </p>
                <div className="mt-2 relative max-w-xs">
                  <Input
                    type="text"
                    value={inflacionMensualInput}
                    onChange={handleInflacionMensualChange}
                    placeholder="Ej: 2,00"
                    className="pr-10 text-left bg-white border border-indigo-200 shadow-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Datos principales (capital + cuotas) */}
          <div className="space-y-4">
            {/* Capital adeudado */}
            <div className="space-y-1 max-w-md">
              <Label
                htmlFor="capitalAdeudado"
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Capital adeudado ($) (opcional)
              </Label>
              <InputFinfocus
                id="capitalAdeudado"
                type="text"
                icon="$"
                value={capitalAdeudadoInput}
                onChange={handleMontoChange(setCapitalAdeudadoInput)}
                placeholder="0,00"
              />
            </div>

{/* Monto de cuota + cantidad de cuotas + botón agregar */}
<div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">

  {/* Monto de la cuota (40%) */}
  <div className="w-full md:w-[40%] space-y-1">
    <Label htmlFor="montoCuota">{labelMontoCuota}</Label>
    <InputFinfocus
      id="montoCuota"
      type="text"
      icon="$"
      value={montoCuotaInput}
      onChange={handleMontoChange(setMontoCuotaInput)}
      placeholder="0,00"
    />
  </div>

  {/* Cantidad de cuotas (40%) */}
  <div className="w-full md:w-[40%] space-y-1">
    <Label htmlFor="numCuotasAgregar">Cantidad de cuotas a agregar</Label>
    <Input
      id="numCuotasAgregar"
      type="number"
      min={1}
      value={numCuotasAgregar}
      onChange={(e) => setNumCuotasAgregar(e.target.value)}
    />
  </div>

  {/* Botón agregar (20%) */}
  <div className="w-full md:w-[20%] flex md:justify-end">
    <Button
      onClick={agregarCuota}
      className="w-full md:w-full bg-[#0f2f4b] hover:bg-[#0b233a]"
    >
      + Agregar cuota
    </Button>
  </div>

</div>
</div>

          {/* Botones principales + Guardar en juicio */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <div className="pt-2 flex flex-col md:flex-row gap-3">
              <Button
                onClick={calcularValorPresente}
                className="w-full md:w-auto bg-[#0f2f4b] hover:bg-[#0b233a]"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
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
                <DialogTitle>Guardar valor presente en un juicio</DialogTitle>
                <DialogDescription>
                  Seleccioná el juicio donde querés guardar este cálculo y agregá un título y notas.
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
                    placeholder="Ej: Valor presente de oferta en cuotas"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Notas sobre el contexto de la oferta, supuestos, etc."
                    rows={3}
                  />
                </div>

                {/* Resumen breve del resultado */}
                {resultado && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2">
                    <p className="font-semibold mb-1">Resumen a guardar</p>
                    <p>
                      Valor presente total:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {formatearMoneda(resultado.valorPresenteTotal)}
                      </span>
                    </p>
                    {resultado.porcentajeCapital != null && (
                      <p>
                        Cubre aproximadamente{' '}
                        <span className="font-bold">
                          {formatearPorcentaje(resultado.porcentajeCapital)}
                        </span>{' '}
                        del capital adeudado.
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

          {/* Tabla de cuotas: se ve apenas agregás cuotas */}
          {cuotas.length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-[#E8F4FB]/40">
                <table className="min-w-full text-xs md:text-sm text-center">
                  <thead className="bg-[#0f2f4b] text-white">
                    <tr>
                      <th className="px-2 py-2"># Cuota</th>
                      <th className="px-2 py-2">Monto ($)</th>
                      {resultado && (
                        <th className="px-2 py-2">Valor presente ($)</th>
                      )}
                      <th className="px-2 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuotas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={resultado ? 4 : 3}
                          className="px-2 py-3 text-gray-500 text-sm"
                        >
                          Todavía no agregaste cuotas.
                        </td>
                      </tr>
                    ) : (
                      cuotas.map((monto, index) => {
                        const vp =
                          resultado && detalleCuotas[index]
                            ? detalleCuotas[index].valorPresente
                            : null;

                        return (
                          <tr
                            key={index}
                            className="odd:bg-white even:bg-slate-50"
                          >
                            <td className="px-2 py-1">{index + 1}</td>
                            <td className="px-2 py-1">
                              {formatearMoneda(monto)}
                            </td>

                            {resultado && (
                              <td className="px-2 py-1">
                                {vp != null ? formatearMoneda(vp) : '-'}
                              </td>
                            )}

                            <td className="px-2 py-1">
                              <button
                                type="button"
                                onClick={() => eliminarCuota(index)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white"
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado + gráfico: solo después de Calcular */}
          {resultado && (
            <div className="space-y-4 mt-4">
              {/* Resultado HERO */}
              <div className="rounded-2xl p-6 text-center shadow-md border border-blue-200 
                              bg-gradient-to-br from-[#0f2f4b] via-[#1b446d] to-[#0f2f4b] text-white">
                <p className="text-xl md:text-2xl font-bold tracking-wide">
                  Valor presente total:{' '}
                  <span className="font-extrabold text-white drop-shadow-sm">
                    {formatearMoneda(resultado.valorPresenteTotal)}
                  </span>
                </p>

                {resultado.porcentajeCapital != null && (
                  <p className="text-sm md:text-base mt-3 text-blue-100 leading-relaxed">
                    🎯 El monto ofrecido, en términos actuales, cubre el{' '}
                    <span className="font-semibold text-white">
                      {formatearPorcentaje(resultado.porcentajeCapital)}
                    </span>{' '}
                    del capital adeudado.
                  </p>
                )}
              </div>

              {/* Gráfico */}
              {chartData.length > 0 && (
                <Card className="border border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#0f2f4b]">
                      Valor presente de cada cuota
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
                              v >= 1000
                                ? `$${(v / 1000).toFixed(0)}k`
                                : `$${v.toFixed(0)}`
                            }
                            tick={{ fontSize: 10 }}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="valorPresente"
                            name="Valor presente"
                            barSize={barSize}
                            fill="#0f2f4b"
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
