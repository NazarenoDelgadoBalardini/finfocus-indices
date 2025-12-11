import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, Percent, Banknote } from 'lucide-react';

// -------------------- Config estática de fondos --------------------

const fcimmFunds = [
  { nombre: 'Mercado Pago',   fondoApi: 'Mercado Fondo - Clase A',          logo: 'https://i.imgur.com/H6rTLFJ.png', url: 'https://www.mercadopago.com.ar/' },
  { nombre: 'Banco Galicia',  fondoApi: 'Fima Premium - Clase A',           logo: 'https://imgur.com/IwAZJ9X.png',   url: 'https://www.bancogalicia.com.ar/' },
  { nombre: 'Personal Pay',   fondoApi: 'Delta Pesos - Clase X',            logo: 'https://i.imgur.com/4qaklHu.png', url: 'https://www.personalpay.com.ar/' },
  { nombre: 'Santander Río',  fondoApi: 'Super Ahorro $ - Clase A',         logo: 'https://imgur.com/ZmLAocs.png',   url: 'https://www.santander.com.ar/' },
  { nombre: 'Banco Macro',    fondoApi: 'Pionero Pesos - Clase A',          logo: 'https://imgur.com/HTuQYtC.png',   url: 'https://www.macro.com.ar/' },
  { nombre: 'Ualá',           fondoApi: 'Ualintec Ahorro Pesos - Clase A',  logo: 'https://i.imgur.com/ZNYmuaO.png', url: 'https://www.uala.com.ar/' },
  { nombre: 'ICBC',           fondoApi: 'Alpha Pesos - Clase A',            logo: 'https://imgur.com/MYwWZHB.png',   url: 'https://www.icbc.com.ar/' },
  { nombre: 'BBVA',           fondoApi: 'FBA Renta Pesos - Clase A',        logo: 'https://imgur.com/pSy8sOf.png',   url: 'https://www.bbva.com.ar/' },
  { nombre: 'Banco Nación',   fondoApi: 'Pellegrini Renta Pesos - Clase A', logo: 'https://imgur.com/AaUAefk.png',   url: 'https://www.bna.com.ar/' },
];

const rfFunds = [
  { nombre: 'Naranja X',   fondoApi: 'NARANJA X',   logo: 'https://i.imgur.com/rWYpdZN.png', url: 'https://www.naranjax.com/' },
  { nombre: 'Ualá',        fondoApi: 'UALA',        logo: 'https://i.imgur.com/ZNYmuaO.png', url: 'https://www.uala.com.ar/' },
  { nombre: 'Supervielle', fondoApi: 'SUPERVIELLE', logo: 'https://imgur.com/gReN1K1.png',   url: 'https://www.supervielle.com.ar/' },
  { nombre: 'Brubank',     fondoApi: 'BRUBANK',     logo: 'https://imgur.com/GRIAF1O.png',   url: 'https://www.brubank.com.ar/' },
];

// -------------------- Helpers numéricos / formato --------------------

const parseNumber = (raw) => {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

const formatPercent = (valor) => {
  if (valor == null || Number.isNaN(valor)) return '—';
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
};

const formatPercentFromUnit = (raw) => {
  const n = parseNumber(raw);
  if (n == null) return '—';
  return (n * 100).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
};

const calcularTNA = (vcpHoy, fechaHoy, vcpAyer, fechaAyer) => {
  const vHoy = parseNumber(vcpHoy);
  const vAyer = parseNumber(vcpAyer);
  if (vHoy == null || vAyer == null || vAyer === 0) return null;

  const dHoy = new Date(fechaHoy);
  const dAyer = new Date(fechaAyer);
  const dias = (dHoy - dAyer) / (1000 * 60 * 60 * 24);
  if (!dias || dias <= 0) return null;

  const rd = vHoy / vAyer - 1; // rendimiento diario
  const tna = rd * (365 / dias) * 100;
  return tna;
};

// ====================== Componente principal ======================

export default function TasasBilleterasPlazos({ toolName }) {
  const [activeTab, setActiveTab] = useState('fcimm'); // 'fcimm' | 'rf' | 'pf'
  const [fcimmUltimo, setFcimmUltimo] = useState([]);
  const [fcimmPenultimo, setFcimmPenultimo] = useState([]);
  const [otrosUltimo, setOtrosUltimo] = useState([]);
  const [plazos, setPlazos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fecha de actualización (tomamos hoy)
  const hoyStr = useMemo(() => {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          respFcimmUltimo,
          respFcimmPenultimo,
          respOtrosUltimo,
          respPlazos,
        ] = await Promise.all([
          fetch('https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo'),
          fetch('https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/penultimo'),
          fetch('https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo'),
          fetch('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo'),
        ]);

        if (
          !respFcimmUltimo.ok ||
          !respFcimmPenultimo.ok ||
          !respOtrosUltimo.ok ||
          !respPlazos.ok
        ) {
          throw new Error('Error al consultar alguna de las APIs de tasas');
        }

        const [
          dataFcimmUltimo,
          dataFcimmPenultimo,
          dataOtrosUltimo,
          dataPlazos,
        ] = await Promise.all([
          respFcimmUltimo.json(),
          respFcimmPenultimo.json(),
          respOtrosUltimo.json(),
          respPlazos.json(),
        ]);

        setFcimmUltimo(Array.isArray(dataFcimmUltimo) ? dataFcimmUltimo : []);
        setFcimmPenultimo(Array.isArray(dataFcimmPenultimo) ? dataFcimmPenultimo : []);
        setOtrosUltimo(Array.isArray(dataOtrosUltimo) ? dataOtrosUltimo : []);

        if (Array.isArray(dataPlazos)) {
          setPlazos(dataPlazos);
        } else {
          setPlazos([]);
        }
      } catch (e) {
        console.error('Error cargando tasas:', e);
        setError('No se pudieron cargar las tasas. Intenta nuevamente más tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============= Secciones =============

  const renderFCIMM = () => (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Tasas nominales anuales calculadas a partir del valor cuota parte de los
        fondos de mercado de dinero asociados a billeteras virtuales y bancos.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fcimmFunds.map((fondo) => {
          const hoy = fcimmUltimo.find((d) => d.fondo === fondo.fondoApi);
          const ayer = fcimmPenultimo.find((d) => d.fondo === fondo.fondoApi);

          let tna = null;
          if (hoy && ayer && hoy.vcp != null && ayer.vcp != null && hoy.fecha && ayer.fecha) {
            tna = calcularTNA(hoy.vcp, hoy.fecha, ayer.vcp, ayer.fecha);
          }

          const tnaText = formatPercent(tna);

          return (
            <a
              key={fondo.nombre}
              href={fondo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div
                className="
                  bg-white rounded-xl shadow p-4 flex items-center justify-between border
                  transition transform duration-200
                  hover:scale-105 hover:shadow-lg hover:border-indigo-600
                  group-hover:bg-[#0f2f4b]
                "
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={fondo.logo}
                    alt={fondo.nombre}
                    className="
                      w-10 h-10 rounded-full object-contain bg-white
                      group-hover:ring-2 group-hover:ring-white
                    "
                  />
                  <div className="font-semibold text-lg group-hover:text-white">
                    {fondo.nombre}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600 group-hover:text-[#8dd8f8]">
                    {tnaText}
                  </div>
                  <div className="text-sm text-gray-500 group-hover:text-white">
                    TNA
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );

  const renderRF = () => (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Fondos comunes de renta fija / otros fondos ofrecidos por billeteras y bancos.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rfFunds.map((fondo) => {
          const dato = otrosUltimo.find(
            (d) =>
              (d.fondo || '').trim().toUpperCase() === fondo.fondoApi
          );

          const tnaText = dato ? formatPercentFromUnit(dato.tna) : '—';

          return (
            <a
              key={fondo.nombre}
              href={fondo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div
                className="
                  bg-white rounded-xl shadow p-4 flex items-center justify-between border
                  transition transform duration-200
                  hover:scale-105 hover:shadow-lg hover:border-indigo-600
                  group-hover:bg-[#0f2f4b]
                "
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={fondo.logo}
                    alt={fondo.nombre}
                    className="
                      w-10 h-10 rounded-full object-contain bg-white
                      group-hover:ring-2 group-hover:ring-white
                    "
                  />
                  <div className="font-semibold text-lg group-hover:text-white">
                    {fondo.nombre}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600 group-hover:text-[#8dd8f8]">
                    {tnaText}
                  </div>
                  <div className="text-sm text-gray-500 group-hover:text-white">
                    TNA estimada
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );

  const renderPlazosFijos = () => {
    if (!Array.isArray(plazos) || plazos.length === 0) {
      return (
        <p className="text-sm text-gray-600">
          No se encontraron datos de plazos fijos en este momento.
        </p>
      );
    }

    const rows = plazos.map((item, idx) => {
      const entidad = item.entidad || '—';
      const rawCli = item.tnaClientes ?? item.tna_cliente;
      const tnaNum = parseNumber(rawCli);
      const tnaCli = formatPercentFromUnit(rawCli);
      return { id: idx, entidad, tnaNum, tnaCli };
    });

    const maxTna = rows.reduce(
      (acc, r) => (r.tnaNum != null && r.tnaNum > acc ? r.tnaNum : acc),
      -Infinity
    );

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Tasas nominales anuales de plazos fijos tradicionales para clientes
          minoristas, según la entidad financiera.
        </p>
        <div className="overflow-auto rounded-xl shadow border border-gray-200">
          <table className="min-w-full text-sm bg-white">
            <thead>
              <tr className="text-left bg-[#0f2f4b] text-white">
                <th className="px-4 py-2">Banco</th>
                <th className="px-4 py-2">TNA Clientes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const destacado = r.tnaNum != null && r.tnaNum === maxTna;
                return (
                  <tr
                    key={r.id}
                    className={[
                      'cursor-pointer hover:bg-blue-50 transition',
                      destacado ? 'bg-blue-50 font-semibold' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      window.open(
                        'https://www.google.com/search?q=' +
                          encodeURIComponent(r.entidad),
                        '_blank'
                      );
                    }}
                  >
                    <td className="px-4 py-2 border-b border-gray-200">
                      {r.entidad}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200">
                      {r.tnaCli}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ====================== UI principal ======================

  const descripcionTab =
    activeTab === 'fcimm'
      ? 'Cuentas remuneradas vinculadas a fondos de mercado de dinero (FCI MM).'
      : activeTab === 'rf'
      ? 'Otros fondos de renta fija ofrecidos por billeteras y bancos.'
      : 'Tasas de plazos fijos tradicionales por banco.';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-600" />
            {toolName || 'Tasas de billeteras y plazos fijos'}
            <span className="ml-auto text-xs md:text-sm font-normal text-[#0f2f4b] bg-[#e6f1f9] px-3 py-1 rounded-full border border-[#0f2f4b22]">
              Datos: Argentina Datos · Actualizado al {hoyStr}
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Compará rápidamente las <strong>mejores tasas en billeteras virtuales</strong> y
            <strong> plazos fijos bancarios</strong>, agrupadas por tipo de instrumento.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tabs índices */}
          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center gap-2 border-b border-gray-200 pb-2">
              {[
                { key: 'fcimm', label: 'Billeteras · FCI MM', icon: Wallet },
                { key: 'rf', label: 'Fondos renta fija', icon: Percent },
                { key: 'pf', label: 'Plazos fijos', icon: Banknote },
              ].map((tab) => {
                const active = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={[
                      'px-3 py-1.5 text-xs md:text-sm font-semibold rounded-t-xl border inline-flex items-center gap-1',
                      active
                        ? 'bg-white border-gray-300 border-b-white text-[#0f2f4b]'
                        : 'bg-gray-50 border-transparent text-[#0f2f4b]/70 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center">{descripcionTab}</p>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cargando tasas...
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 text-center">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              {activeTab === 'fcimm' && renderFCIMM()}
              {activeTab === 'rf' && renderRF()}
              {activeTab === 'pf' && renderPlazosFijos()}
            </>
          )}

          {/* Botón simple por si querés imprimir / exportar */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => window.print?.()}
              className="bg-[#0f2f4b] hover:bg-[#0b233a] text-white flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Imprimir / guardar como PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
