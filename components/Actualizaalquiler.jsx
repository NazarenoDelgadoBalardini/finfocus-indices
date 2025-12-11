import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialData } from '@/entities/FinancialData';
import {
  Calculator,
  Home,
  RefreshCw,
  FileText,
} from 'lucide-react';
import moment from 'moment';

// ====================== Helpers generales ======================

const formatearMoneda = (valor) => {
  if (valor == null || Number.isNaN(valor)) return '$ 0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
};

const formatearPorcentaje = (valor) => {
  if (valor == null || Number.isNaN(valor)) return '0,00%';
  return `${valor.toFixed(2).replace('.', ',')}%`;
};

// Parseo robusto de números con formato AR (7.314,0 → 7314.0)
const parseNumberAR = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Elimina puntos de mil, reemplaza coma decimal por punto
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
};

const handleMontoChangeFactory = (setter) => (e) => {
  let value = e.target.value.replace(/[^0-9,]/g, '');
  const parts = value.split(',');
  let parteEntera = parts[0];

  if (parteEntera) {
    parteEntera = parteEntera.replace(/\./g, '');
    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  let formattedValue = parteEntera || '';
  if (parts.length > 1) {
    formattedValue += ',' + (parts[1] || '');
  }

  setter(formattedValue);
};

const parseMonto = (value) => {
  if (!value) return null;
  const clean = value.replace(/[^0-9,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return Number.isNaN(num) ? null : num;
};

// Parsear "mmm-yy" para que devuelva el ÚLTIMO día del mes (ej: oct-25 -> 31/10/2025)
const parseFechaIPC = (fechaStr) => {
  try {
    const meses = {
      ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
      jul: 6, ago: 7, sep: 8, set: 8, sept: 8, oct: 9, nov: 10, dic: 11,
      jan: 0, apr: 3, aug: 7, dec: 11, // inglés
    };

    // Limpieza básica
    const cleanStr = fechaStr.replace('/', '-').replace(' ', '-');
    const parts = cleanStr.split('-');
    
    if (parts.length >= 2) {
      const mesStr = parts[0].toLowerCase().trim();
      const yearStr = parts[1].trim();
      const mes = meses[mesStr];
      
      if (mes !== undefined) {
        let year = parseInt(yearStr, 10);
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        // CORRECCIÓN AQUÍ:
        // new Date(año, mes + 1, 0) devuelve el último día del mes 'mes'.
        // Ejemplo: mes 9 (Oct), mes+1 = 10 (Nov), día 0 de Nov es 31 de Oct.
        const fecha = new Date(year, mes + 1, 0);
        return fecha;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Convierte Date a "YYYY-MM-DD"
const toISODate = (date) => {
  return moment(date).format('YYYY-MM-DD');
};

// Suma meses usando moment
const addMonths = (dateStr, months) => {
  return moment(dateStr).add(months, 'months').toDate();
};

// Parsear fecha diaria "YYYY-MM-DD"
const parseDailyDate = (fechaRaw) => {
  if (!fechaRaw) return null;
  const m = moment(fechaRaw);
  return m.isValid() ? m.toDate() : null;
};

// Obtiene valor en una serie (ordenada por fecha ascendente) en la fecha indicada
// Si no hay valor exacto, toma el último anterior (<=)
const getValorAlOCercanoAnterior = (serie, fechaISO) => {
  if (!serie || serie.length === 0 || !fechaISO) return NaN;
  const target = moment(fechaISO);

  // Buscar desde el final hacia atrás
  for (let i = serie.length - 1; i >= 0; i--) {
    const current = moment(serie[i].date);
    // Si la fecha del dato es menor o igual a la target
    if (current.isSameOrBefore(target, 'day')) {
      return serie[i].value;
    }
  }
  return NaN;
};

// ====================== Componente principal ======================

export default function ActualizacionAlquileres({ toolName }) {
  const [monto, setMonto] = useState('');
  const [fechaCorte, setFechaCorte] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('cer'); // Default tab
  
  const [indices, setIndices] = useState({
    cer: [],
    uva: [],
    uvi: [],
    icl: [],
    ipc: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ------------------------ Carga y Procesamiento de Datos ------------------------

  // Función genérica para procesar datos buscando columnas dinámicamente
  const processDataGeneric = (recordArr, type = 'daily') => {
    if (!recordArr || recordArr.length === 0) return [];
    
    const record = recordArr[0];
    if (!record.data || !Array.isArray(record.data)) return [];

    const headers = record.headers || [];
    const headersLower = headers.map(h => (h || '').toString().toLowerCase());

    // 1. Encontrar índice de FECHA
    let fechaIdx = headersLower.findIndex(h => 
      h.includes('fecha') || h.includes('periodo') || h.includes('período') || h.includes('mes')
    );
    // Fallback: si no hay headers, asumir col 0
    if (fechaIdx === -1) fechaIdx = 0;

    // 2. Encontrar índice de VALOR
    let indiceIdx = -1;

    if (type === 'ipc') {
        indiceIdx = headersLower.findIndex(h => 
            (h.includes('indice') || h.includes('índice') || h.includes('nivel') || h.includes('ipc')) &&
            !h.includes('variación') && !h.includes('mensual') && !h.includes('interanual') && !h.includes('%')
        );
    } else {
        indiceIdx = headersLower.findIndex(h => 
            h.includes('valor') || h.includes('cotizacion') || h.includes('indice') || h.includes('precio')
        );
    }

    // Fallback valor: si no encuentra header, asumir col 1
    if (indiceIdx === -1) indiceIdx = 1;

    const out = [];

    for (const row of record.data) {
        if (!row) continue;
        
        const fechaRaw = row[fechaIdx];
        const valorRaw = row[indiceIdx];

        if (!fechaRaw || valorRaw == null) continue;

        let dateObj = null;
        if (type === 'ipc') {
            // Usamos la función corregida que devuelve fin de mes
            dateObj = parseFechaIPC(fechaRaw.toString());
        } else {
            dateObj = parseDailyDate(fechaRaw);
        }

        if (!dateObj) continue;

        const val = parseNumberAR(valorRaw);
        if (val === null) continue;

        out.push({
            date: dateObj,
            iso: toISODate(dateObj),
            value: val
        });
    }

    out.sort((a, b) => a.date - b.date);
    return out;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [cerRec, uvaRec, uviRec, iclRec, ipcRec] = await Promise.all([
          FinancialData.filter({ category: 'cer', isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: 'uva', isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: 'uvi', isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: 'icl', isActive: true }, '-lastSync', 1),
          FinancialData.filter({ category: 'ipc_nivel_general', isActive: true }, '-lastSync', 1),
        ]);

        const cerData = processDataGeneric(cerRec, 'daily');
        const uvaData = processDataGeneric(uvaRec, 'daily');
        const uviData = processDataGeneric(uviRec, 'daily');
        const iclData = processDataGeneric(iclRec, 'daily');
        const ipcData = processDataGeneric(ipcRec, 'ipc');

        setIndices({
          cer: cerData,
          uva: uvaData,
          uvi: uviData,
          icl: iclData,
          ipc: ipcData,
        });

        // Lógica de fecha de corte inicial
        const allLastDates = [
            cerData.at(-1)?.iso, 
            uvaData.at(-1)?.iso, 
            ipcData.at(-1)?.iso
        ].filter(Boolean).sort();
        
        // Si hay datos, poner la fecha más reciente encontrada como default
        if (allLastDates.length > 0 && !fechaCorte) {
             setFechaCorte(allLastDates[allLastDates.length - 1]);
        }

      } catch (err) {
        console.error('Error cargando índices:', err);
        setError('No se pudieron cargar los índices.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ------------------------ Lógica de métricas ------------------------

  const capitalNumero = useMemo(() => parseMonto(monto) || 0, [monto]);

  const calcularMetricasParaIndice = (key) => {
    const serie = indices[key];

    if (!serie || serie.length === 0 || !fechaCorte) {
      return {
        interanual: { pct: null, amt: null },
        semestral: { pct: null, amt: null },
        cuatrimestral: { pct: null, amt: null },
        trimestral: { pct: null, amt: null },
        mensual: { pct: null, amt: null },
      };
    }

    const fechaRef = moment(fechaCorte).toDate();
    const valorActual = getValorAlOCercanoAnterior(serie, toISODate(fechaRef));

    if (Number.isNaN(valorActual)) {
        return {
            interanual: { pct: null, amt: null },
            semestral: { pct: null, amt: null },
            cuatrimestral: { pct: null, amt: null },
            trimestral: { pct: null, amt: null },
            mensual: { pct: null, amt: null },
        };
    }

    const periodos = {
      interanual: 12,
      semestral: 6,
      cuatrimestral: 4,
      trimestral: 3,
      mensual: 1,
    };

    const resultado = {};

    Object.entries(periodos).forEach(([nombre, meses]) => {
      const fechaIni = addMonths(fechaRef, -meses);
      
      const v0 = getValorAlOCercanoAnterior(serie, toISODate(fechaIni));
      const v1 = valorActual;

      if (Number.isNaN(v0) || Number.isNaN(v1) || v0 === 0) {
        resultado[nombre] = { pct: null, amt: null };
      } else {
        const pct = ((v1 / v0) - 1) * 100;
        const amt =
          capitalNumero && capitalNumero > 0
            ? capitalNumero * (1 + pct / 100)
            : null;

        resultado[nombre] = { pct, amt };
      }
    });

    return resultado;
  };

  const metricas = useMemo(
    () => calcularMetricasParaIndice(selectedIndex),
    [selectedIndex, indices, fechaCorte, capitalNumero]
  );

  const ultimaFechaISO = useMemo(() => {
    const serie = indices[selectedIndex];
    if (!serie || serie.length === 0) return '';
    return serie[serie.length - 1].iso;
  }, [selectedIndex, indices]);

  const formatFechaCorta = (iso) => {
    if (!iso) return '';
    return moment(iso).format('DD/MM/YYYY');
  };

  const getLabel = (k) => {
      switch(k) {
          case 'cer': return 'CER';
          case 'uva': return 'UVA';
          case 'uvi': return 'UVI';
          case 'ipc': return 'IPC Nivel General';
          case 'icl': return 'ICL';
          default: return k.toUpperCase();
      }
  };
  
  const indiceLabel = getLabel(selectedIndex);

  const badgeTexto = [
    `Índice: ${indiceLabel}`,
    fechaCorte ? `Corte: ${formatFechaCorta(fechaCorte)}` : null,
    capitalNumero ? `Monto: ${formatearMoneda(capitalNumero)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const onChangeTab = (key) => {
    setSelectedIndex(key);
    const serie = indices[key];
    if (serie && serie.length > 0) {
      setFechaCorte(serie[serie.length - 1].iso);
    }
  };

  const onExportPDF = () => {
    window.print?.();
  };

  // ------------------------ UI ------------------------

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            {toolName || 'Actualización de alquileres'}
            <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
               Índices: CER · UVA · UVI · IPC · ICL
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Calcula cómo se actualizaría un alquiler indexado según{' '}
            <strong>CER, UVA, UVI, IPC Nivel General o ICL</strong>,
            mostrando variaciones interanuales, semestrales, cuatrimestrales,
            trimestrales y mensuales respecto a la fecha de corte.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#0f2f4b22] bg-[#e6f1f9] px-3 py-2 text-xs md:text-sm text-[#0f2f4b] max-w-full overflow-hidden">
            {badgeTexto || 'Selecciona un índice, un monto y una fecha de corte.'}
          </div>

          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 border-b border-gray-200 pb-2">
              {[
                { key: 'cer', label: 'CER' },
                { key: 'uva', label: 'UVA' },
                { key: 'uvi', label: 'UVI' },
                { key: 'ipc', label: 'IPC Nivel General' },
                { key: 'icl', label: 'ICL' },
              ].map((tab) => {
                const active = selectedIndex === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onChangeTab(tab.key)}
                    className={[
                      'px-3 py-1.5 text-xs md:text-sm font-semibold rounded-t-xl border',
                      active
                        ? 'bg-white border-gray-300 border-b-white text-[#0f2f4b]'
                        : 'bg-gray-50 border-transparent text-[#0f2f4b]/70 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="montoAlquiler">Valor último de alquiler</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="montoAlquiler"
                  type="text"
                  value={monto}
                  onChange={handleMontoChangeFactory(setMonto)}
                  placeholder="100.000,00"
                  className="pl-7 text-right"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fechaCorte">Fecha de corte</Label>
              <Input
                id="fechaCorte"
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
              />
              {ultimaFechaISO && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Último dato disponible de {indiceLabel}:{' '}
                  <span className="font-semibold">
                    {formatFechaCorta(ultimaFechaISO)}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col justify-end items-stretch md:items-end gap-2">
              <Button
                type="button"
                onClick={onExportPDF}
                className="w-full md:w-auto bg-[#0f2f4b] hover:bg-[#0b233a] text-white flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Exportar resultados en PDF
              </Button>
              {loading && (
                <div className="flex items-center text-xs text-gray-500 gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Cargando índices...
                </div>
              )}
              {error && (
                <p className="text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Los porcentajes indican cuánto habría variado el alquiler ajustado por <strong>{indiceLabel}</strong> desde hace X meses hasta la fecha de corte.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricBox 
                  label="Interanual" 
                  data={metricas.interanual} 
                  colorClass="bg-red-50" 
              />
              <MetricBox 
                  label="Semestral" 
                  data={metricas.semestral} 
                  colorClass="bg-purple-50" 
              />
              <MetricBox 
                  label="Cuatrimestral" 
                  data={metricas.cuatrimestral} 
                  colorClass="bg-amber-50" 
              />
              <MetricBox 
                  label="Trimestral" 
                  data={metricas.trimestral} 
                  colorClass="bg-green-50" 
              />
              <MetricBox 
                  label="Mensual" 
                  data={metricas.mensual} 
                  colorClass="bg-blue-50" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({ label, data, colorClass }) {
    return (
        <div className={`rounded-xl p-3 text-center ${colorClass} text-[#0f2f4b] shadow-sm`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide">
              {label}
            </p>
            <p className="text-lg md:text-xl font-extrabold mt-1">
              {data.pct != null ? formatearPorcentaje(data.pct) : '--'}
            </p>
            <p className="text-[11px] md:text-xs mt-1">
              {data.amt != null ? formatearMoneda(data.amt) : '—'}
            </p>
        </div>
    );
}
