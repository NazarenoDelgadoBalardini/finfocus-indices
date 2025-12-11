import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefreshCw, Activity, ArrowLeftRight } from 'lucide-react';

// ================== Config APIs ==================

const API_URLS = {
  oficial: 'https://dolarapi.com/v1/dolares/oficial',
  blue: 'https://dolarapi.com/v1/dolares/blue',
  mep: 'https://dolarapi.com/v1/dolares/bolsa',
  ccl: 'https://dolarapi.com/v1/dolares/contadoconliqui',
  tarjeta: 'https://dolarapi.com/v1/dolares/tarjeta',
  Euro: 'https://dolarapi.com/v1/cotizaciones/eur',
  Real: 'https://dolarapi.com/v1/cotizaciones/brl',
  'Peso Chileno': 'https://dolarapi.com/v1/cotizaciones/clp',
  'Peso Uruguayo': 'https://dolarapi.com/v1/cotizaciones/uyu',
};

// Para las tarjetas de arriba
const GRID_ITEMS = [
  { id: 'oficial', label: 'USD Oficial' },
  { id: 'blue', label: 'USD Blue' },
  { id: 'mep', label: 'USD MEP' },
  { id: 'ccl', label: 'USD CCL' },
  { id: 'tarjeta', label: 'USD Tarjeta' },
  { id: 'Euro', label: 'Euro (EUR)' },
  { id: 'Real', label: 'Real (BRL)' },
  { id: 'Peso Chileno', label: 'Peso Chileno (CLP)' },
  { id: 'Peso Uruguayo', label: 'Peso Uruguayo (UYU)' },
];

// Opciones de la calculadora
const OPCIONES = [
  { id: 'Pesos', label: 'Pesos', badge: 'ARS' },
  { id: 'oficial', label: 'Dólar Oficial', badge: 'USD' },
  { id: 'blue', label: 'Dólar Blue', badge: 'USD' },
  { id: 'mep', label: 'Dólar MEP', badge: 'USD' },
  { id: 'ccl', label: 'Dólar CCL', badge: 'USD' },
  { id: 'tarjeta', label: 'Dólar Tarjeta', badge: 'USD' },
  { id: 'Euro', label: 'Euro', badge: 'EUR' },
  { id: 'Real', label: 'Real', badge: 'BRL' },
  { id: 'Peso Chileno', label: 'Peso Chileno', badge: 'CLP' },
  { id: 'Peso Uruguayo', label: 'Peso Uruguayo', badge: 'UYU' },
];

const NOMBRES_MONEDAS = {
  Pesos: 'Pesos (ARS)',
  oficial: 'USD Oficial',
  blue: 'Dólar Blue',
  mep: 'Dólar MEP',
  ccl: 'Dólar CCL',
  tarjeta: 'Dólar Tarjeta',
  Euro: 'Euro (EUR)',
  Real: 'Real (BRL)',
  'Peso Chileno': 'Peso Chileno (CLP)',
  'Peso Uruguayo': 'Peso Uruguayo (UYU)',
};

// ================== Helpers numéricos ==================

const parseNumber = (raw) => {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

const formatARS = (valor) => {
  if (valor == null || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
};

const cleanDigits = (str) => {
  const d = (str || '').replace(/\D/g, '');
  return d.replace(/^0+(?=\d)/, '');
};

const formatMontoFromDigits = (input) => {
  let digits = cleanDigits(input);
  if (!digits) return '';
  const dec = digits.slice(-2).padStart(2, '0');
  let intRaw = digits.slice(0, -2);
  if (!intRaw) intRaw = '0';
  const intFmt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intFmt},${dec}`;
};

const parseMonto = (value) => {
  if (!value) return NaN;
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};

// ================== Componente principal ==================

export default function ComparaMonedas({ toolName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // arsPorUnidad[idMoneda] = número
  const [arsPorUnidad, setArsPorUnidad] = useState({});
  const [fechas, setFechas] = useState({});

  const [montoStr, setMontoStr] = useState('');
  const montoInputRef = useRef(null);

  const [selectedDesde, setSelectedDesde] = useState(
    () => localStorage.getItem('fx_desde') || 'Pesos'
  );
  const [selectedHasta, setSelectedHasta] = useState(
    () => localStorage.getItem('fx_hasta') || 'Pesos'
  );

  const hoyStr = useMemo(() => {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  // ---------- Fetch de cotizaciones ----------

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          respOficial,
          respBlue,
          respMep,
          respCcl,
          respTarjeta,
          respEur,
          respBrl,
          respClp,
          respUyu,
        ] = await Promise.all([
          fetch(API_URLS.oficial),
          fetch(API_URLS.blue),
          fetch(API_URLS.mep),
          fetch(API_URLS.ccl),
          fetch(API_URLS.tarjeta),
          fetch(API_URLS.Euro),
          fetch(API_URLS.Real),
          fetch(API_URLS['Peso Chileno']),
          fetch(API_URLS['Peso Uruguayo']),
        ]);

        if (
          !respOficial.ok ||
          !respBlue.ok ||
          !respMep.ok ||
          !respCcl.ok ||
          !respTarjeta.ok ||
          !respEur.ok ||
          !respBrl.ok ||
          !respClp.ok ||
          !respUyu.ok
        ) {
          throw new Error('Error al consultar APIs de cotizaciones');
        }

        const [
          oficialData,
          blueData,
          mepData,
          cclData,
          tarjetaData,
          eurData,
          brlData,
          clpData,
          uyuData,
        ] = await Promise.all([
          respOficial.json(),
          respBlue.json(),
          respMep.json(),
          respCcl.json(),
          respTarjeta.json(),
          respEur.json(),
          respBrl.json(),
          respClp.json(),
          respUyu.json(),
        ]);

        const oficialVenta = parseNumber(oficialData.venta);
        const mepVenta = parseNumber(mepData.venta);

        let ratioMEP = 1;
        if (mepVenta && oficialVenta && mepVenta > oficialVenta) {
          ratioMEP = mepVenta / oficialVenta;
        }

        const nuevoArsPorUnidad = {
          Pesos: 1,
          oficial: oficialVenta,
          blue: parseNumber(blueData.venta),
          mep: mepVenta,
          ccl: parseNumber(cclData.venta),
          tarjeta: parseNumber(tarjetaData.venta),
          Euro: parseNumber(eurData.venta) * ratioMEP,
          Real: parseNumber(brlData.venta) * ratioMEP,
          'Peso Chileno': parseNumber(clpData.venta) * ratioMEP,
          'Peso Uruguayo': parseNumber(uyuData.venta) * ratioMEP,
        };

        const nuevoFechas = {
          oficial: oficialData.fechaActualizacion,
          blue: blueData.fechaActualizacion,
          mep: mepData.fechaActualizacion,
          ccl: cclData.fechaActualizacion,
          tarjeta: tarjetaData.fechaActualizacion,
          Euro: eurData.fechaActualizacion,
          Real: brlData.fechaActualizacion,
          'Peso Chileno': clpData.fechaActualizacion,
          'Peso Uruguayo': uyuData.fechaActualizacion,
        };

        setArsPorUnidad(nuevoArsPorUnidad);
        setFechas(nuevoFechas);
      } catch (e) {
        console.error('Error cargando cotizaciones:', e);
        setError('No se pudieron cargar las cotizaciones. Intenta nuevamente más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------- Lógica calculadora ----------

  const montoNumero = useMemo(() => parseMonto(montoStr), [montoStr]);
  const tasaDesde = arsPorUnidad[selectedDesde];
  const tasaHasta = arsPorUnidad[selectedHasta];

  const resultado = useMemo(() => {
    if (!montoNumero || montoNumero <= 0) return null;
    if (!tasaDesde || !tasaHasta) return null;

    const montoOrigenFmt = montoNumero.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const nombreOrigen = NOMBRES_MONEDAS[selectedDesde] || selectedDesde;
    const nombreDestino = NOMBRES_MONEDAS[selectedHasta] || selectedHasta;

    if (selectedDesde === selectedHasta) {
      return {
        origen: `${montoOrigenFmt} ${nombreOrigen}`,
        destino: `${montoOrigenFmt} ${nombreDestino}`,
      };
    }

    const montoEnARS = montoNumero * tasaDesde;
    const montoDestino = montoEnARS / tasaHasta;

    const montoDestinoFmt = montoDestino.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      origen: `${montoOrigenFmt} ${nombreOrigen}`,
      destino: `${montoDestinoFmt} ${nombreDestino}`,
    };
  }, [montoNumero, tasaDesde, tasaHasta, selectedDesde, selectedHasta]);

  const cotizacionesUsadas = useMemo(() => {
    if (!tasaDesde || !tasaHasta) return null;
    return {
      desde: {
        nombre: NOMBRES_MONEDAS[selectedDesde] || selectedDesde,
        ars: tasaDesde,
      },
      hasta: {
        nombre: NOMBRES_MONEDAS[selectedHasta] || selectedHasta,
        ars: tasaHasta,
      },
    };
  }, [tasaDesde, tasaHasta, selectedDesde, selectedHasta]);

  // ---------- Handlers UI ----------

  const handleMontoChange = (e) => {
    const formatted = formatMontoFromDigits(e.target.value);
    setMontoStr(formatted);
  };

  const handleMontoBlur = (e) => {
    const formatted = formatMontoFromDigits(e.target.value);
    setMontoStr(formatted || '');
  };

  const handleSelectDesde = (id) => {
    setSelectedDesde(id);
    localStorage.setItem('fx_desde', id);
  };

  const handleSelectHasta = (id) => {
    setSelectedHasta(id);
    localStorage.setItem('fx_hasta', id);
  };

  const handleSwap = () => {
    const tmp = selectedDesde;
    setSelectedDesde(selectedHasta);
    setSelectedHasta(tmp);
    localStorage.setItem('fx_desde', selectedHasta);
    localStorage.setItem('fx_hasta', tmp);
  };

  const formatFecha = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-AR');
  };

  // ================== UI ==================

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            {toolName || 'Cotizaciones y calculadora de monedas'}
            <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
              Fuente: dolarapi.com · Actualizado al {hoyStr}
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Consulta las principales <strong>cotizaciones de monedas</strong> y utiliza la
            <strong> calculadora</strong> para convertir entre pesos, dólares (oficial, blue, MEP, CCL, tarjeta)
            y otras monedas (EUR, BRL, CLP, UYU).
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando cotizaciones...
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 text-center">
              {error}
            </p>
          )}

          {/* GRID DE COTIZACIONES */}
          {!loading && !error && (
            <>
              <div className="text-center text-xs text-gray-600 mb-1">
                Valores expresados en ARS por unidad de moneda.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
                {GRID_ITEMS.map((item) => {
                  const valor = arsPorUnidad[item.id];
                  const fecha = fechas[item.id];
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-4 shadow-sm text-center transition transform hover:-translate-y-0.5 hover:shadow-md hover:bg-blue-50"
                    >
                      <div className="font-semibold text-sm mb-1">
                        {item.label}
                      </div>
                      <div className="text-xl font-extrabold">
                        {formatARS(valor)}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {fecha ? formatFecha(fecha) : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* CALCULADORA */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-[#0f2f4b] mb-2 text-center">
              Calculadora de conversión de monedas
            </p>

            {/* Monto */}
            <div className="max-w-xl mx-auto space-y-4">
              <div className="space-y-1">
                <Label htmlFor="monto">Monto a convertir</Label>
                <div className="relative">
                  <Input
                    id="monto"
                    ref={montoInputRef}
                    type="text"
                    value={montoStr}
                    onChange={handleMontoChange}
                    onBlur={handleMontoBlur}
                    placeholder="10.000,00"
                    className="text-right pr-3"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Moneda de origen */}
              <div>
                <p className="text-xs font-semibold text-[#0f2f4b] mb-1">
                  Moneda de origen
                </p>
                <div
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Moneda de origen"
                >
                  {OPCIONES.map((opt) => {
                    const active = opt.id === selectedDesde;
                    return (
                      <button
                        key={opt.id + '-desde'}
                        type="button"
                        onClick={() => handleSelectDesde(opt.id)}
                        className={[
                          'currency-card px-2 py-2 rounded-lg border text-xs md:text-sm',
                          active
                            ? 'bg-[#0f2f4b] text-white border-[#0f2f4b] shadow-md'
                            : 'bg-white text-[#0f2f4b] border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span>{opt.label}</span>
                        <span className="ml-1 text-[10px] font-bold opacity-80">
                          {opt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón swap */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-[#0f2f4b] hover:bg-slate-100 shadow-sm"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  Intercambiar
                </button>
              </div>

              {/* Moneda de destino */}
              <div>
                <p className="text-xs font-semibold text-[#0f2f4b] mb-1">
                  Moneda de destino
                </p>
                <div
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Moneda de destino"
                >
                  {OPCIONES.map((opt) => {
                    const active = opt.id === selectedHasta;
                    return (
                      <button
                        key={opt.id + '-hasta'}
                        type="button"
                        onClick={() => handleSelectHasta(opt.id)}
                        className={[
                          'currency-card px-2 py-2 rounded-lg border text-xs md:text-sm',
                          active
                            ? 'bg-[#0f2f4b] text-white border-[#0f2f4b] shadow-md'
                            : 'bg-white text-[#0f2f4b] border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <span>{opt.label}</span>
                        <span className="ml-1 text-[10px] font-bold opacity-80">
                          {opt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resultado */}
              <div
                id="resultado"
                className="result-card bg-gradient-to-b from-[#ecf5ff] to-[#dff0ff] text-center rounded-2xl border border-[#cfe3f7] shadow-md px-4 py-5"
              >
                {resultado ? (
                  <>
                    <div className="text-sm text-slate-600 mb-1">
                      Resultado de la conversión
                    </div>
                    <div className="text-base font-semibold text-slate-700">
                      {resultado.origen}
                    </div>
                    <div className="text-xs text-slate-500 my-1">equivalen a</div>
                    <div className="text-xl md:text-2xl font-extrabold text-[#0b375a]">
                      {resultado.destino}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">
                    Ingresá un monto y elegí monedas de origen y destino para ver el resultado.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cotizaciones usadas */}
          <div className="quote-card mt-3 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div className="font-semibold text-[#0f2f4b] mb-1">
              Cotizaciones utilizadas
            </div>
            {cotizacionesUsadas ? (
              <>
                <div>
                  1 <b>{cotizacionesUsadas.desde.nombre}</b> ={' '}
                  <b>{formatARS(cotizacionesUsadas.desde.ars)}</b>
                </div>
                <div>
                  1 <b>{cotizacionesUsadas.hasta.nombre}</b> ={' '}
                  <b>{formatARS(cotizacionesUsadas.hasta.ars)}</b>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Valores expresados en pesos argentinos (ARS) por cada unidad de moneda.
                </div>
              </>
            ) : (
              <div className="text-[11px] text-slate-500">
                Cargando tasas de las monedas seleccionadas...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
