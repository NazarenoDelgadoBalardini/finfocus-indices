// src/components/FlujoFondos.jsx
import { FinancialData } from '@/entities/FinancialData';
import React, { useEffect, useState, useMemo } from 'react';

const AZUL = '#0f2f4b';

// Calendario de cupones (podés ir sumando)
const calendarioPagos = {
  TO26: [
    { fecha: '17/10/2025', monto: 7.75 },
    { fecha: '17/04/2026', monto: 7.75 },
    { fecha: '17/10/2026', monto: 107.75 },
  ],
};

// ================== Helpers genéricos ==================

const toNumberAR = (s) =>
  Number(String(s ?? '').replace(/\./g, '').replace(',', '.')) || 0;

const parseDMY = (s) => {
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const daysBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24);

function xnpv(rate, cashflows) {
  const t0 = cashflows[0].date;
  let sum = 0;
  for (const cf of cashflows) {
    const t = daysBetween(t0, cf.date) / 365;
    sum += cf.amount / Math.pow(1 + rate, t);
  }
  return sum;
}

function xirr(
  cashflows,
  { low = -0.9999, high = 5, tol = 1e-7, maxIter = 200 } = {}
) {
  let fLow = xnpv(low, cashflows);
  let fHigh = xnpv(high, cashflows);
  if (Number.isNaN(fLow) || Number.isNaN(fHigh))
    throw new Error('XIRR: NPV inválido');
  if (fLow * fHigh > 0) throw new Error('XIRR: sin cambio de signo');

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const fMid = xnpv(mid, cashflows);
    if (Math.abs(fMid) < tol) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

const equivRates = (rEA) => {
  const rDaily = Math.pow(1 + rEA, 1 / 365) - 1;
  const rMonthly = Math.pow(1 + rEA, 1 / 12) - 1;
  const TNA = rDaily * 365;
  const TEA = rEA;
  return { rDaily, rMonthly, TNA, TEA };
};

const formatARS = (n) =>
  '$ ' +
  (n ?? 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPct = (n) =>
  (n ?? 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';

// ====== APIs externas ======
async function obtenerAPI() {
  const [r1, r2] = await Promise.allSettled([
    fetch('https://data912.com/live/arg_notes', { mode: 'cors' }),
    fetch('https://data912.com/live/arg_bonds', { mode: 'cors' }),
  ]);
  const out = [];
  if (r1.status === 'fulfilled') out.push(...(await r1.value.json()));
  if (r2.status === 'fulfilled') out.push(...(await r2.value.json()));
  return out;
}

const tnaToTea = (tnaDec) =>
  Math.pow(1 + tnaDec / 365, 365) - 1;
const teaToDaily = (teaDec) =>
  Math.pow(1 + teaDec, 1 / 365) - 1;

// ================== Componente principal ==================
export default function FlujoFondos() {
  const [bonos, setBonos] = useState([]); // {tipo,ticker,vtoStr,pago,precio,ultimaFecha,monthKey}
  const [monthOptions, setMonthOptions] = useState([]); // {key,label}
  const [selectedMonth, setSelectedMonth] = useState('');
  const [mejor, setMejor] = useState(null);
  const [loading, setLoading] = useState(false);

  const [montoRaw, setMontoRaw] = useState('0'); // solo dígitos
  const [billeteras, setBilleteras] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletMeta, setWalletMeta] = useState('');
  const [resultadoRendimiento, setResultadoRendimiento] = useState(null);
  const [resultadoComparacion, setResultadoComparacion] = useState(null);

  const hoyStr = useMemo(
    () => new Date().toLocaleDateString('es-AR'),
    []
  );

  // -------- Helper formato input ARS --------
  const formatInputARS = (rawDigits) => {
    if (!rawDigits) return '$ 0,00';
    let s = rawDigits.replace(/\D/g, '');
    if (!s) s = '0';
    if (s.length === 1) s = '0' + s;
    if (s.length === 2) s = '0' + s;
    const entero = s.slice(0, -2);
    const decimal = s.slice(-2);
    return (
      '$ ' +
      parseInt(entero || '0', 10).toLocaleString('es-AR') +
      ',' +
      decimal
    );
  };

  const montoDisplay = useMemo(
    () => formatInputARS(montoRaw),
    [montoRaw]
  );

  const parseMonto = () =>
    parseFloat(
      formatInputARS(montoRaw)
        .replace(/[^\d,]/g, '')
        .replace(',', '.')
    ) || 0;

  // ================== Cargar billeteras ==================
  useEffect(() => {
    async function cargarBilleteras() {
      try {
        const [mmHoy, mmAyer, rf] = await Promise.all([
          fetch(
            'https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo'
          ).then((r) => r.json()),
          fetch(
            'https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/penultimo'
          ).then((r) => r.json()),
          fetch(
            'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo'
          ).then((r) => r.json()),
        ]);

        const fcimmFunds = [
          {
            id: 'mercadopago',
            nombre: 'Mercado Pago',
            fondo: 'Mercado Fondo - Clase A',
            logo: 'https://i.imgur.com/H6rTLFJ.png',
          },
          {
            id: 'galicia',
            nombre: 'Banco Galicia',
            fondo: 'Fima Premium - Clase A',
            logo: 'https://imgur.com/IwAZJ9X.png',
          },
          {
            id: 'personalpay',
            nombre: 'Personal Pay',
            fondo: 'Delta Pesos - Clase X',
            logo: 'https://i.imgur.com/4qaklHu.png',
          },
          {
            id: 'santander',
            nombre: 'Santander Río',
            fondo: 'Super Ahorro $ - Clase A',
            logo: 'https://imgur.com/ZmLAocs.png',
          },
          {
            id: 'macro',
            nombre: 'Banco Macro',
            fondo: 'Pionero Pesos - Clase A',
            logo: 'https://imgur.com/HTuQYtC.png',
          },
          {
            id: 'uala',
            nombre: 'Ualá',
            fondo: 'Ualintec Ahorro Pesos - Clase A',
            logo: 'https://i.imgur.com/ZNYmuaO.png',
          },
          {
            id: 'icbc',
            nombre: 'ICBC',
            fondo: 'Alpha Pesos - Clase A',
            logo: 'https://imgur.com/MYwWZHB.png',
          },
          {
            id: 'bbva',
            nombre: 'BBVA',
            fondo: 'FBA Renta Pesos - Clase A',
            logo: 'https://imgur.com/pSy8sOf.png',
          },
          {
            id: 'bna',
            nombre: 'Banco Nación',
            fondo: 'Pellegrini Renta Pesos - Clase A',
            logo: 'https://imgur.com/AaUAefk.png',
          },
        ];
        const rfFunds = [
          {
            id: 'naranjax',
            nombre: 'Naranja X',
            fondo: 'NARANJA X',
            logo: 'https://i.imgur.com/rWYpdZN.png',
          },
          {
            id: 'uala-rf',
            nombre: 'Ualá (RF)',
            fondo: 'UALA',
            logo: 'https://i.imgur.com/ZNYmuaO.png',
          },
          {
            id: 'supervielle',
            nombre: 'Supervielle',
            fondo: 'SUPERVIELLE',
            logo: 'https://imgur.com/gReN1K1.png',
          },
          {
            id: 'brubank',
            nombre: 'Brubank',
            fondo: 'BRUBANK',
            logo: 'https://imgur.com/GRIAF1O.png',
          },
        ];

        const billeterasCalc = [];
        const byFondoMMHoy = Object.fromEntries(
          mmHoy.map((d) => [d.fondo, d])
        );
        const byFondoMMAyer = Object.fromEntries(
          mmAyer.map((d) => [d.fondo, d])
        );

        for (const f of fcimmFunds) {
          const h = byFondoMMHoy[f.fondo];
          const a = byFondoMMAyer[f.fondo];
          if (h?.vcp && a?.vcp && h.fecha && a.fecha) {
            const dias =
              (new Date(h.fecha) - new Date(a.fecha)) /
              (1000 * 60 * 60 * 24);
            const rd = h.vcp / a.vcp - 1;
            const tna = rd * (365 / dias);
            if (isFinite(tna) && tna > 0) {
              billeterasCalc.push({
                id: f.id,
                nombre: f.nombre,
                logo: f.logo,
                tnaDec: tna,
                fuente: 'FCI MM (VCP hoy/ayer)',
                comentario: `Base ${new Date(
                  h.fecha
                ).toLocaleDateString('es-AR')}`,
                grupo: 'FCI',
              });
            }
          }
        }

        for (const f of rfFunds) {
          const dato = rf.find(
            (d) => d.fondo?.trim()?.toUpperCase() === f.fondo
          );
          if (dato?.tna != null) {
            billeterasCalc.push({
              id: f.id,
              nombre: f.nombre,
              logo: f.logo,
              tnaDec: Number(dato.tna),
              fuente: 'Otros (Renta Fija)',
              comentario: 'TNA provista por la API',
              grupo: 'RF',
            });
          }
        }

        setBilleteras(billeterasCalc);
      } catch (e) {
        console.error('Error billeteras:', e);
        setBilleteras([]);
      }
    }

    cargarBilleteras();
  }, []);

  // ================== Carga desde FinancialData + precios ==================
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Traer serie + cotizaciones en paralelo
        const [records, apiQuotes] = await Promise.all([
          FinancialData.filter(
            {
              category: 'letras_y_bonos_del_tesoro',
              isActive: true,
            },
            '-lastSync',
            1
          ),
          obtenerAPI(),
        ]);

        if (!records || !records.length) {
          console.warn('No se encontró la serie letras_y_bonos_del_tesoro');
          setBonos([]);
          setMonthOptions([]);
          setSelectedMonth('');
          return;
        }

        const fd = records[0];
        const headers = fd.headers || [];
        const headersLower = headers.map((h) =>
          (h || '').toString().toLowerCase()
        );

        // índices según ["Tipo","Ticker","Vto","Pago"]
        const tipoIdx = headersLower.findIndex((h) => h.includes('tipo'));
        const tickerIdx = headersLower.findIndex((h) => h.includes('ticker'));
        const vtoIdx = headersLower.findIndex(
          (h) => h.includes('vto') || h.includes('venc')
        );
        const pagoIdx = headersLower.findIndex((h) => h.includes('pago'));

        if (tickerIdx === -1 || vtoIdx === -1 || pagoIdx === -1) {
          console.error(
            'No se encontraron columnas esperadas en letras_y_bonos_del_tesoro'
          );
          setBonos([]);
          setMonthOptions([]);
          setSelectedMonth('');
          return;
        }

        const bonosTmp = [];

        for (const row of fd.data || []) {
          const tipo = tipoIdx >= 0 ? row[tipoIdx] : '';
          const tickerRaw = row[tickerIdx];
          const vtoStrRaw = row[vtoIdx];
          const pagoRaw = row[pagoIdx];

          const ticker = (tickerRaw || '').trim();
          if (!ticker) continue;

          const vtoStr = (vtoStrRaw || '').trim();
          const pago = toNumberAR(pagoRaw);
          const vtoDate = parseDMY(vtoStr);
          if (!vtoDate) continue;

          // precio desde data912 (ASK fallback LAST)
          const info = apiQuotes.find((x) => x.symbol === ticker);
          let precio = NaN;
          if (info) {
            const ask = Number(info.px_ask);
            const last = Number(info.c);
            if (Number.isFinite(ask) && ask > 0) {
              precio = ask;
            } else if (Number.isFinite(last) && last > 0) {
              precio = last;
            }
          }

          // última fecha (usa calendarioPagos si existe, sino el vto)
          let ultimaFechaStr = vtoStr;
          if (ticker && calendarioPagos[ticker]) {
            const ult =
              calendarioPagos[ticker][calendarioPagos[ticker].length - 1];
            if (ult?.fecha) ultimaFechaStr = ult.fecha;
          }
          const ultimaFecha = parseDMY(ultimaFechaStr);
          if (!ultimaFecha) continue;

          const year = ultimaFecha.getFullYear();
          const month = ultimaFecha.getMonth() + 1;
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;

          bonosTmp.push({
            tipo: tipo || '',
            ticker,
            vtoStr,
            pago,
            precio: Number.isFinite(precio) ? precio : null,
            ultimaFecha,
            monthKey,
          });
        }

        setBonos(bonosTmp);

        // Meses disponibles (igual que antes)
        const monthKeys = Array.from(
          new Set(bonosTmp.map((b) => b.monthKey))
        ).sort();
        const options = monthKeys.map((key) => {
          const [year, month] = key.split('-').map(Number);
          const d = new Date(year, month - 1);
          let label = d.toLocaleString('es-AR', {
            month: 'long',
            year: 'numeric',
          });
          label = label.charAt(0).toUpperCase() + label.slice(1);
          return { key, label };
        });

        setMonthOptions(options);

        // Seleccionar mes actual o el primero
        const hoy = new Date();
        const mesActualKey = `${hoy.getFullYear()}-${String(
          hoy.getMonth() + 1
        ).padStart(2, '0')}`;
        const existeMesActual = options.some((o) => o.key === mesActualKey);
        setSelectedMonth(
          existeMesActual && mesActualKey ? mesActualKey : options[0]?.key || ''
        );
      } catch (e) {
        console.error('Error cargando desde FinancialData:', e);
        setBonos([]);
        setMonthOptions([]);
        setSelectedMonth('');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ================== Recalcular "mejor instrumento" ==================
  useEffect(() => {
    if (!selectedMonth || !bonos.length) {
      setMejor(null);
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    function buildCashflows(ticker, precio) {
      const cfs = [{ date: hoy, amount: -precio }];
      if (calendarioPagos[ticker]) {
        calendarioPagos[ticker].forEach((p) =>
          cfs.push({ date: parseDMY(p.fecha), amount: p.monto })
        );
      } else {
        const row = bonos.find((b) => b.ticker === ticker);
        if (row) {
          const pago = row.pago;
          const f = parseDMY(row.vtoStr);
          if (pago > 0 && f) {
            cfs.push({ date: f, amount: pago });
          }
        }
      }
      cfs.sort((a, b) => a.date - b.date);
      return cfs;
    }

    let mejorLocal = null;

    bonos
      .filter((b) => b.monthKey === selectedMonth)
      .forEach((b) => {
        if (!b.precio || b.precio <= 0) return;
        const cfs = buildCashflows(b.ticker, b.precio);
        const lastDate = cfs[cfs.length - 1].date;
        if (lastDate <= hoy) return;

        try {
          const rEA = xirr(cfs);
          const { rMonthly, TNA, TEA } = equivRates(rEA);
          const dias = Math.ceil(daysBetween(hoy, lastDate));
          if (!mejorLocal || rMonthly > mejorLocal.tasaMensual) {
            mejorLocal = {
              ticker: b.ticker,
              precio: b.precio,
              vtoFinal: lastDate,
              dias,
              tasaMensual: rMonthly,
              TNA,
              TEA,
              rEA,
              cashflows: cfs,
            };
          }
        } catch (e) {
          // ignoramos si no converge
        }
      });

    setMejor(mejorLocal);
    setResultadoRendimiento(null);
    setResultadoComparacion(null);
  }, [selectedMonth, bonos]);

  // ================== Handlers UI ==================
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleMontoChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setMontoRaw(digits || '0');
  };

  const handleWalletChange = (e) => {
    const id = e.target.value;
    setSelectedWallet(id);
    const b = billeteras.find((x) => x.id === id);
    if (b) {
      setWalletMeta(
        `${b.fuente}. ${b.comentario}`
      );
    } else {
      setWalletMeta('');
    }
  };

  const handleCalcularRendimiento = () => {
    if (!mejor) return;
    const inv = parseMonto();
    if (!inv || inv <= 0) return;

    const unidades = inv / mejor.precio;
    const r = mejor.rEA;
    const fEnd = mejor.vtoFinal;

    const FV_por_unidad = mejor.cashflows
      .filter((cf) => cf.amount > 0)
      .reduce(
        (acc, cf) =>
          acc +
          cf.amount *
            Math.pow(
              1 + r,
              daysBetween(cf.date, fEnd) / 365
            ),
        0
      );

    const FV_total = FV_por_unidad * unidades;
    const retornoTotal = FV_total / inv - 1;
    const { TNA, TEA, rMonthly } = equivRates(r);

    setResultadoRendimiento({
      FV_total,
      retornoTotal,
      TNA,
      TEA,
      rMonthly,
    });
  };

  const handleComparar = () => {
    if (!mejor) return;
    const inv = parseMonto();
    if (!inv || inv <= 0) return;

    const hoy = new Date();
    const dias = Math.ceil(
      (mejor.vtoFinal - hoy) / (1000 * 60 * 60 * 24)
    );

    const r = mejor.rEA;
    const fEnd = mejor.vtoFinal;
    const unidades = inv / mejor.precio;
    const fvUnit = mejor.cashflows
      .filter((cf) => cf.amount > 0)
      .reduce(
        (acc, cf) =>
          acc +
          cf.amount *
            Math.pow(
              1 + r,
              (fEnd - cf.date) /
                (1000 * 60 * 60 * 24) /
                365
            ),
        0
      );
    const fvBono = fvUnit * unidades;

    // Billetera
    let filaBilletera = null;
    let fvWallet = null;
    let billeteraElegida = null;
    if (selectedWallet && billeteras.length) {
      const b = billeteras.find((x) => x.id === selectedWallet);
      if (b?.tnaDec >= 0) {
        const tea = tnaToTea(b.tnaDec);
        const rDaily = teaToDaily(tea);
        fvWallet = inv * Math.pow(1 + rDaily, dias);
        billeteraElegida = b;
        filaBilletera = {
          nombre: b.nombre,
          logo: b.logo,
          tna: b.tnaDec,
          tea,
          fv: fvWallet,
          delta: fvWallet - fvBono,
        };
      }
    }

    // TNA manual
    const tnaManualInput =
      document.getElementById('tna-manual')?.value || '';
    const tnaMan =
      Number(tnaManualInput.replace(',', '.')) / 100;
    let filaManual = null;
    let fvManual = null;
    if (isFinite(tnaMan) && tnaMan > 0) {
      const teaM = tnaToTea(tnaMan);
      const rDailyM = teaToDaily(teaM);
      fvManual = inv * Math.pow(1 + rDailyM, dias);
      filaManual = {
        tna: tnaMan,
        tea: teaM,
        fv: fvManual,
        delta: fvManual - fvBono,
      };
    }

    let mejorNombre = `Instrumento sugerido (${mejor.ticker})`;
    let mejorValor = fvBono;
    if (fvWallet != null && fvWallet > mejorValor) {
      mejorValor = fvWallet;
      mejorNombre =
        billeteraElegida?.nombre ?? 'Billetera seleccionada';
    }
    if (fvManual != null && fvManual > mejorValor) {
      mejorValor = fvManual;
      mejorNombre = 'TNA manual';
    }

    setResultadoComparacion({
      dias,
      fvBono,
      filaBilletera,
      filaManual,
      mejorNombre,
    });
  };

  // ================== Render ==================
  // Flujo de fondos (tabla) en base a mejor
  const flujoFondosRows = useMemo(() => {
    if (!mejor) return [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return mejor.cashflows.map((cf, idx) => {
      const esPasado = cf.date < hoy;
      const baseColor =
        cf.amount < 0 ? 'text-red-600' : 'text-green-700';
      const montoClass = esPasado
        ? 'text-gray-400'
        : baseColor;
      const rowClass = esPasado ? 'text-gray-400' : '';
      return {
        key: idx,
        fecha: cf.date.toLocaleDateString('es-AR'),
        amount: cf.amount,
        rowClass,
        montoClass,
      };
    });
  }, [mejor]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      {/* estilos locales para card / btn / hero */}
      <style>{`
        .card {
          background:#fff;
          border-radius:0.5rem;
          box-shadow:0 2px 4px rgba(0,0,0,0.1);
          padding:1rem;
          margin-bottom:1rem;
        }
        .btn-fijo{
          background-color:${AZUL};
          color:#fff;
        }
        .hero {
          background: linear-gradient(135deg, #0f2f4b 0%, #1a4f72 60%, #0f2f4b 100%);
          color: #fff;
          border-radius: 20px;
          box-shadow: 0 10px 24px rgba(15,47,75,.25);
          padding: 1.25rem 1.5rem;
          border: 1px solid rgba(255,255,255,.08);
        }
        .hero-row {
          display: grid;
          grid-template-columns: 1fr 220px;
          align-items: center;
          gap: 1rem;
        }
        .hero-label {
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,.7);
        }
        .hero-kpi-tag {
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,.6);
          margin-bottom: 0.2rem;
        }
        .hero-kpi-val {
          font-weight: 900;
          font-size: 2rem;
          line-height: 1;
        }
        .hero-note {
          margin-top: 0.5rem;
          font-size: 0.7rem;
          color: rgba(255,255,255,.6);
        }
        @media (max-width: 640px) {
          .hero-row{ grid-template-columns:1fr; text-align:left; }
        }
      `}</style>

      {/* Título */}
      <div className="text-center mb-6">
        <h1 className="text-base md:text-lg font-bold text-[#0f2f4b] inline-block bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 shadow-sm">
          Elige la fecha de vencimiento 🏖️
        </h1>
      </div>

      {/* Selector de mes */}
      <div className="card mb-6">
        <div className="inline-block mr-4 align-top">
          <label
            htmlFor="mes-vto"
            className="mb-2 font-medium block"
          >
            Mes de vencimiento:
          </label>
          <select
            id="mes-vto"
            className="border px-2 py-1 rounded min-w-[220px]"
            value={selectedMonth}
            onChange={handleMonthChange}
          >
            {!monthOptions.length && (
              <option value="">
                {loading
                  ? 'Cargando...'
                  : 'No hay meses disponibles'}
              </option>
            )}
            {monthOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zona de sugerencia */}
      <div className="mb-6">
        {mejor ? (
          <>
            {/* HERO sugerido */}
            <div className="hero mb-3">
              <div className="hero-row">
                <div>
                  <div className="hero-label">
                    Instrumento sugerido
                  </div>
                  <div className="text-lg md:text-xl font-extrabold text-white mt-1">
                    {mejor.ticker}
                    <span className="ml-1 text-white/80 font-semibold">
                      (vto{' '}
                      {mejor.vtoFinal.toLocaleDateString(
                        'es-AR'
                      )}
                      )
                    </span>
                  </div>
                  <div className="text-sm text-white/80 mt-1">
                    Tasa efectiva mensual (XIRR):{' '}
                    <span className="font-semibold text-white">
                      {formatPct(mejor.tasaMensual * 100)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="hero-kpi-tag">
                    RENTABILIDAD ESTIMADA
                  </div>
                  <div className="hero-kpi-val">
                    {formatPct(mejor.TEA * 100)}
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    TNA aprox:{' '}
                    <strong>
                      {formatPct(mejor.TNA * 100)}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="hero-note">
                Flujo de fondos actualizado al {hoyStr}
              </div>
            </div>

            {/* Tabla de flujo de fondos */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="font-semibold text-[#0f2f4b] mb-2">
                Flujo de fondos proyectado
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1 text-left">
                      Fecha
                    </th>
                    <th className="px-3 py-1 text-right">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {flujoFondosRows.map((row) => (
                    <tr key={row.key} className={row.rowClass}>
                      <td className="px-3 py-1">
                        {row.fecha}
                      </td>
                      <td
                        className={`px-3 py-1 text-right ${row.montoClass}`}
                      >
                        {formatARS(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-yellow-600 text-sm">
            {loading
              ? 'Cargando instrumentos...'
              : 'No hay instrumentos válidos para ese mes.'}
          </p>
        )}
      </div>

      {/* Card rendimiento (monto) */}
      {mejor && (
        <div id="rendimiento-card" className="card">
          <div className="mb-4">
            <label
              htmlFor="monto-invertir"
              className="mb-1 font-medium block"
            >
              Monto a invertir (ARS):
            </label>
            <input
              id="monto-invertir"
              type="text"
              className="border px-2 py-1 rounded w-48 text-left"
              value={montoDisplay}
              onChange={handleMontoChange}
              inputMode="decimal"
              autoComplete="off"
            />
          </div>
          <button
            className="btn-fijo px-4 py-2 rounded text-sm font-semibold"
            onClick={handleCalcularRendimiento}
          >
            Calcular rendimiento
          </button>

          {resultadoRendimiento && (
            <div className="mt-4 bg-white rounded-xl shadow-md p-4 border-l-4 border-[#0f2f4b]">
              <div className="text-xs text-gray-500">
                Valor futuro estimado al vencimiento (reinvierte
                cupones a la TIR)
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2f4b] mt-1 mb-3">
                {formatARS(resultadoRendimiento.FV_total)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-50">
                  <div className="text-xs text-green-700">
                    Retorno total
                  </div>
                  <div className="text-xl font-semibold text-green-800">
                    {formatPct(
                      resultadoRendimiento.retornoTotal * 100
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <div className="text-xs text-blue-700">
                    TEA (XIRR)
                  </div>
                  <div className="text-xl font-semibold text-blue-800">
                    {formatPct(
                      resultadoRendimiento.TEA * 100
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50">
                  <div className="text-xs text-yellow-700">
                    TNA aprox
                  </div>
                  <div className="text-xl font-semibold text-yellow-800">
                    {formatPct(
                      resultadoRendimiento.TNA * 100
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                Mensual equivalente:{' '}
                <span className="font-semibold">
                  {formatPct(
                    resultadoRendimiento.rMonthly * 100
                  )}
                </span>
                <span className="mx-2 text-gray-300">•</span>
                Vto final:{' '}
                <span className="font-medium">
                  {mejor.vtoFinal.toLocaleDateString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparador billeteras / TNA manual */}
      {mejor && (
        <div id="comparador-card" className="card mt-4">
          <h2 className="font-semibold mb-2">
            Comparar con billeteras (TNA) o TNA manual
          </h2>

          {/* selector billetera */}
          <div className="mb-3">
            <label
              htmlFor="wallet-select"
              className="mb-1 font-medium block"
            >
              Billetera / Fondo (TNA estimada):
            </label>
            <select
              id="wallet-select"
              className="border px-2 py-1 rounded w-full sm:w-96"
              value={selectedWallet}
              onChange={handleWalletChange}
            >
              <option value="">
                — Elegí una billetera (opcional) —
              </option>
              {['FCI', 'RF'].map((grupo) => {
                const items = billeteras.filter(
                  (b) => b.grupo === grupo
                );
                if (!items.length) return null;
                return (
                  <optgroup
                    key={grupo}
                    label={
                      grupo === 'FCI'
                        ? 'Cuentas remuneradas (FCI MM)'
                        : 'Otros – Renta Fija'
                    }
                  >
                    {items.map((b) => (
                      <option key={b.id} value={b.id}>
                        {`${b.nombre} — ${formatPct(
                          b.tnaDec * 100
                        )} TNA`}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {!!walletMeta && (
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                {selectedWallet && (
                  <img
                    src={
                      billeteras.find(
                        (b) => b.id === selectedWallet
                      )?.logo
                    }
                    alt=""
                    className="w-5 h-5 rounded-full bg-white border"
                  />
                )}
                <span>{walletMeta}</span>
              </div>
            )}
          </div>

          {/* TNA manual */}
          <div className="mb-4">
            <label
              htmlFor="tna-manual"
              className="mb-1 font-medium block"
            >
              % TNA manual (opcional):
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tna-manual"
                type="number"
                step="0.01"
                min="0"
                className="border px-2 py-1 rounded w-40"
                placeholder="ej: 80"
              />
              <span className="text-xs text-gray-500">
                Nominal anual
              </span>
            </div>
          </div>

          <button
            className="btn-fijo px-4 py-2 rounded text-sm font-semibold"
            onClick={handleComparar}
          >
            Comparar rendimientos
          </button>

          {resultadoComparacion && (
            <div className="mt-4 bg-white rounded-xl shadow-md p-4 border-l-4 border-[#0f2f4b]">
              <div className="text-sm text-gray-600 mb-2">
                Comparación hasta{' '}
                <span className="font-semibold">
                  {mejor.vtoFinal.toLocaleDateString('es-AR')}
                </span>{' '}
                ({resultadoComparacion.dias} días)
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-gray-50">
                      <th className="px-3 py-2">Alternativa</th>
                      <th className="px-3 py-2 text-right">TNA</th>
                      <th className="px-3 py-2 text-right">
                        TEA (comp. diaria)
                      </th>
                      <th className="px-3 py-2 text-right">
                        Valor futuro
                      </th>
                      <th className="px-3 py-2 text-right">
                        Δ vs Bono
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-[#0f2f4b]">
                        Instrumento sugerido ({mejor.ticker})
                      </td>
                      <td className="px-3 py-2 text-right">
                        —
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatPct(mejor.TEA * 100)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatARS(resultadoComparacion.fvBono)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        —
                      </td>
                    </tr>

                    {resultadoComparacion.filaBilletera && (
                      <tr className="border-t">
                        <td className="px-3 py-2 flex items-center gap-2">
                          <img
                            src={
                              resultadoComparacion
                                .filaBilletera.logo
                            }
                            alt=""
                            className="w-5 h-5 rounded-full bg-white border"
                          />
                          {
                            resultadoComparacion.filaBilletera
                              .nombre
                          }
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPct(
                            resultadoComparacion
                              .filaBilletera.tna * 100
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPct(
                            resultadoComparacion
                              .filaBilletera.tea * 100
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatARS(
                            resultadoComparacion.filaBilletera
                              .fv
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${
                            resultadoComparacion.filaBilletera
                              .delta > 0
                              ? 'text-red-600'
                              : 'text-green-700'
                          }`}
                        >
                          {formatARS(
                            resultadoComparacion.filaBilletera
                              .delta
                          )}
                        </td>
                      </tr>
                    )}

                    {resultadoComparacion.filaManual && (
                      <tr className="border-t">
                        <td className="px-3 py-2">
                          TNA manual
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPct(
                            resultadoComparacion.filaManual.tna *
                              100
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPct(
                            resultadoComparacion.filaManual.tea *
                              100
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatARS(
                            resultadoComparacion.filaManual.fv
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${
                            resultadoComparacion.filaManual.delta >
                            0
                              ? 'text-red-600'
                              : 'text-green-700'
                          }`}
                        >
                          {formatARS(
                            resultadoComparacion.filaManual
                              .delta
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 mt-3">
                Nota: TEA = (1 + TNA/365)
                <sup>365</sup> − 1; se capitaliza por{' '}
                {resultadoComparacion.dias} días.
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded text-blue-800 font-semibold">
                Bajo estos supuestos, conviene{' '}
                <strong>
                  {resultadoComparacion.mejorNombre}
                </strong>
                .
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
