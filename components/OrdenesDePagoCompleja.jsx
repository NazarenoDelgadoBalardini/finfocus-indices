// src/components/OrdenesDePagoCompleja.jsx
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, RefreshCw } from 'lucide-react';

const AZUL = '#0f2f4b';

// =========================
// Helpers de formato
// =========================

// Formatea en vivo "$ 1.234.567,89"
function formatearMonedaInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const numero = parseFloat(digits) / 100;
  if (isNaN(numero)) return '';
  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

// "$1.200.000,00" -> 1200000
function parseMoney(str) {
  if (!str) return 0;
  const limpio = String(str)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

// "10,00%" -> 10
function parsePercentage(str) {
  if (!str) return 0;
  const limpio = String(str)
    .replace(/[^\d,]/g, '')
    .replace(',', '.');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

// 123456.7 -> "$1.234.567,70"
function formatMoney(num) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
}

// =========================
// SMVM – helpers y fetch
// =========================

const mesesSmvm = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const SHEET_ID_SMVM   = '1ht4HGOwtgY19IA2Si40v6Kx1LGlv4jG6inFqOMZALNQ';
const SHEET_NAME_SMVM = 'SMVM';

// Normaliza "sept-24" -> "sep-24"
function normalizeMesKey(k) {
  if (k == null) return null;
  let s = String(k).trim().toLowerCase();
  s = s.replace('sept', 'sep');
  if (s.includes('-')) {
    const [m, yy] = s.split('-');
    return `${m.slice(0, 3)}-${yy}`;
  }
  return s;
}

// "315.000,00" → 315000.00
function parseNumberAR(v) {
  if (typeof v === 'number') return v;
  if (v == null) return null;
  const s = String(v).replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function claveADate(clave) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) return new Date(clave);
  const [m, yy] = normalizeMesKey(clave).split('-');
  const y = 2000 + parseInt(yy, 10);
  const mi = mesesSmvm.indexOf(m);
  return new Date(y, mi, 1);
}

function keyFromDate(date) {
  const m = mesesSmvm[date.getMonth()];
  const yy = String(date.getFullYear()).slice(-2);
  return `${m}-${yy}`;
}

// busca el SMVM vigente a una fecha (retrocede hasta 24 meses si falta)
function smvmVigente(dic, fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  for (let i = 0; i < 24; i++) {
    const k = keyFromDate(d);
    if (dic[k] != null) return { clave: k, valor: dic[k] };
    d.setMonth(d.getMonth() - 1);
  }
  return { clave: null, valor: null };
}

async function fetchSMVMFromSheet() {
  const tq = 'select A,B where A is not null and B is not null offset 1';
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID_SMVM}/gviz/tq` +
    `?sheet=${encodeURIComponent(SHEET_NAME_SMVM)}` +
    `&tqx=out:json&tq=${encodeURIComponent(tq)}`;

  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      if (!txt.includes('google.visualization.Query.setResponse')) {
        throw new Error('Respuesta no GViz');
      }
      const json = JSON.parse(
        txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1)
      );
      const rows = json.table?.rows || [];
      const out = {};
      for (const r of rows) {
        const k = normalizeMesKey(r?.c?.[0]?.v ?? r?.c?.[0]?.f);
        const v = parseNumberAR(r?.c?.[1]?.v ?? r?.c?.[1]?.f);
        if (k && v != null) out[k] = v;
      }
      return out;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200 * i));
    }
  }
  throw new Error('No se pudo obtener SMVM del Sheet');
}

export default function OrdenesDePagoCompleja() {
  const [capitalDisponible, setCapitalDisponible] = useState('$1.200.000,00');
  const [smvmValor, setSmvmValor] = useState(0);
  const [smvmLabel, setSmvmLabel] = useState('SMVM');
  const [loadingSmvm, setLoadingSmvm] = useState(false);

  const [actores, setActores] = useState([]);
  const [abogadosActores, setAbogadosActores] = useState([]);
  const [abogadosDemandados, setAbogadosDemandados] = useState([]);
  const [peritos, setPeritos] = useState([]);

  const [htmlResultado, setHtmlResultado] = useState('');
  const [calculando, setCalculando] = useState(false);

  // Cargar SMVM vigente e inicializar bloques
  useEffect(() => {
    let isMounted = true;

    async function initSmvm() {
      try {
        setLoadingSmvm(true);
        const indices = await fetchSMVMFromSheet();
        const { clave, valor } = smvmVigente(indices, new Date());
        if (!isMounted) return;
        if (clave && valor != null) {
          const [m, yy] = clave.split('-');
          setSmvmLabel(`SMVM (${m.toUpperCase()}-${yy})`);
          setSmvmValor(valor);
        }
      } catch (e) {
        console.error('Error cargando SMVM', e);
      } finally {
        if (isMounted) setLoadingSmvm(false);
      }
    }

    // bloques de ejemplo como en la versión HTML
    setActores([
      { id: 1, nombre: 'Actor 1', monto: '$500.000,00' },
      { id: 2, nombre: 'Actor 2', monto: '$500.000,00' },
    ]);

    setAbogadosActores([
      {
        id: 1,
        nombre: 'Abogado Actor',
        base: '$250.000,00',
        porcentajeCostas: '10,00%',
        responsable: true,
        retencionAportes: true,
        aportePartes: '10,00%',
        aporteProfesional: '8,00%',
      },
    ]);

    setAbogadosDemandados([
      {
        id: 1,
        nombre: 'Abogado Demandado',
        base: '$200.000,00',
        porcentajeCostas: '20,00%',
        responsable: true,
        retencionAportes: true,
        aportePartes: '10,00%',
        aporteProfesional: '8,00%',
      },
    ]);

    setPeritos([
      {
        id: 1,
        nombre: 'Perito',
        base: '$30.000,00',
        porcentajeCostas: '10,00%',
        aportePartes: '0,00%',
        aportePerito: '0,00%',
        responsable: true,
        retencionAportes: true,
      },
    ]);

    initSmvm();

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================
  // Handlers de inputs
  // =========================

  const handleCapitalChange = (e) => {
    setCapitalDisponible(formatearMonedaInput(e.target.value));
  };

  // ---- Actores ----
  const addActor = () => {
    setActores((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: 'Actor',
        monto: '$500.000,00',
      },
    ]);
  };

  const updateActor = (id, field, value) => {
    setActores((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              [field]:
                field === 'monto'
                  ? formatearMonedaInput(value)
                  : value,
            }
          : a
      )
    );
  };

  const removeActor = (id) => {
    setActores((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Abogados actores ----
  const addAbogadoActor = () => {
    setAbogadosActores((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: 'Abogado Actor',
        base: '$250.000,00',
        porcentajeCostas: '10,00%',
        responsable: true,
        retencionAportes: true,
        aportePartes: '10,00%',
        aporteProfesional: '8,00%',
      },
    ]);
  };

  const updateAbogadoActor = (id, field, value) => {
    setAbogadosActores((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              [field]:
                field === 'base'
                  ? formatearMonedaInput(value)
                  : field === 'porcentajeCostas' ||
                    field === 'aportePartes' ||
                    field === 'aporteProfesional'
                  ? (() => {
                      const digits = String(value || '').replace(
                        /\D/g,
                        ''
                      );
                      if (!digits) return '';
                      const num = parseFloat(digits) / 100;
                      return `${num
                        .toFixed(2)
                        .replace('.', ',')}%`;
                    })()
                  : value,
            }
          : a
      )
    );
  };

  const removeAbogadoActor = (id) => {
    setAbogadosActores((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Abogados demandados ----
  const addAbogadoDemandado = () => {
    setAbogadosDemandados((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: 'Abogado Demandado',
        base: '$200.000,00',
        porcentajeCostas: '20,00%',
        responsable: true,
        retencionAportes: true,
        aportePartes: '10,00%',
        aporteProfesional: '8,00%',
      },
    ]);
  };

  const updateAbogadoDemandado = (id, field, value) => {
    setAbogadosDemandados((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              [field]:
                field === 'base'
                  ? formatearMonedaInput(value)
                  : field === 'porcentajeCostas' ||
                    field === 'aportePartes' ||
                    field === 'aporteProfesional'
                  ? (() => {
                      const digits = String(value || '').replace(
                        /\D/g,
                        ''
                      );
                      if (!digits) return '';
                      const num = parseFloat(digits) / 100;
                      return `${num
                        .toFixed(2)
                        .replace('.', ',')}%`;
                    })()
                  : value,
            }
          : a
      )
    );
  };

  const removeAbogadoDemandado = (id) => {
    setAbogadosDemandados((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Peritos ----
  const addPerito = () => {
    setPeritos((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: 'Perito',
        base: '$30.000,00',
        porcentajeCostas: '10,00%',
        aportePartes: '0,00%',
        aportePerito: '0,00%',
        responsable: true,
        retencionAportes: true,
      },
    ]);
  };

  const updatePerito = (id, field, value) => {
    setPeritos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === 'base'
                  ? formatearMonedaInput(value)
                  : field === 'porcentajeCostas' ||
                    field === 'aportePartes' ||
                    field === 'aportePerito'
                  ? (() => {
                      const digits = String(value || '').replace(
                        /\D/g,
                        ''
                      );
                      if (!digits) return '';
                      const num = parseFloat(digits) / 100;
                      return `${num
                        .toFixed(2)
                        .replace('.', ',')}%`;
                    })()
                  : value,
            }
          : p
      )
    );
  };

  const removePerito = (id) => {
    setPeritos((prev) => prev.filter((p) => p.id !== id));
  };

  // =========================
  // Handler principal: Calcular
  // =========================

  const handleCalcular = () => {
    try {
      setCalculando(true);

      const html = calcularOrdenesDePago({
        capitalDisponible: parseMoney(capitalDisponible),
        smvm: smvmValor,
        actores,
        abogadosActores,
        abogadosDemandados,
        peritos,
      });

      setHtmlResultado(html);
    } catch (e) {
      console.error(e);
      alert('Ocurrió un error al calcular las órdenes de pago.');
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1300px] mx-auto">
      {/* Datos generales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-6 w-6" color={AZUL} />
              Calculadora de Órdenes de Pago
            </span>
            {loadingSmvm ? (
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cargando SMVM...
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                {smvmLabel}: {formatMoney(smvmValor)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Capital disponible + SMVM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capitalDisponible">
                💰 Capital disponible
              </Label>
              <Input
                id="capitalDisponible"
                dir="ltr"
                value={capitalDisponible}
                onChange={handleCapitalChange}
                placeholder="$ 0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="smvm">{smvmLabel}</Label>
              <Input
                id="smvm"
                value={formatMoney(smvmValor)}
                readOnly
                className="mt-1 bg-slate-50"
              />
            </div>
          </div>

          {/* Actores */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-800">
                Actores
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addActor}
              >
                + Agregar actor
              </Button>
            </div>
            <div className="space-y-3">
              {actores.map((actor) => (
                <div
                  key={actor.id}
                  className="border rounded-lg p-3 bg-slate-50/100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>👤 Nombre y apellido (opcional)</Label>
                      <Input
                        value={actor.nombre}
                        className="mt-1 bg-white text-[#0f2f4b]"
                        onChange={(e) =>
                          updateActor(actor.id, 'nombre', e.target.value)
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>💵 Monto</Label>
                      <Input
                        dir="ltr"
                        value={actor.monto}
                        onChange={(e) =>
                          updateActor(actor.id, 'monto', e.target.value)
                        }
                        placeholder="$0,00"
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => removeActor(actor.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Abogados actores */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-800">
                Abogados actores
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAbogadoActor}
              >
                + Agregar abogado actor
              </Button>
            </div>
            <div className="space-y-3">
              {abogadosActores.map((ab) => (
                <div
                  key={ab.id}
                  className="border rounded-lg p-3 bg-green-50/100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>👤 Nombre</Label>
                      <Input
                        value={ab.nombre}
                        onChange={(e) =>
                          updateAbogadoActor(ab.id, 'nombre', e.target.value)
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>💵 Honorarios regulados</Label>
                      <Input
                        dir="ltr"
                        value={ab.base}
                        onChange={(e) =>
                          updateAbogadoActor(ab.id, 'base', e.target.value)
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>⚖️ Costas a cargo del actor (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.porcentajeCostas}
                        onChange={(e) =>
                          updateAbogadoActor(
                            ab.id,
                            'porcentajeCostas',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={ab.responsable}
                        onChange={(e) =>
                          updateAbogadoActor(
                            ab.id,
                            'responsable',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">Responsable inscripto</span>
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={ab.retencionAportes}
                        onChange={(e) =>
                          updateAbogadoActor(
                            ab.id,
                            'retencionAportes',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">Retención aportes actor</span>
                    </div>
                    <div>
                      <Label>🤝 Ap. a cargo de las partes (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.aportePartes}
                        onChange={(e) =>
                          updateAbogadoActor(
                            ab.id,
                            'aportePartes',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>🤝 Ap. a cargo del profesional (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.aporteProfesional}
                        onChange={(e) =>
                          updateAbogadoActor(
                            ab.id,
                            'aporteProfesional',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => removeAbogadoActor(ab.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Abogados demandados */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-800">
                Abogados demandados
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAbogadoDemandado}
              >
                + Agregar abogado demandado
              </Button>
            </div>
            <div className="space-y-3">
              {abogadosDemandados.map((ab) => (
                <div
                  key={ab.id}
                  className="border rounded-lg p-3 bg-yellow-50/100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>👤 Nombre</Label>
                      <Input
                        value={ab.nombre}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'nombre',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>💵 Honorarios regulados</Label>
                      <Input
                        dir="ltr"
                        value={ab.base}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'base',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>⚖️ Costas a cargo del actor (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.porcentajeCostas}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'porcentajeCostas',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={ab.responsable}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'responsable',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">Responsable inscripto</span>
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={ab.retencionAportes}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'retencionAportes',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">Retención aportes actor</span>
                    </div>
                    <div>
                      <Label>🤝 Ap. a cargo de las partes (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.aportePartes}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'aportePartes',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>🤝 Ap. a cargo del profesional (%)</Label>
                      <Input
                        dir="ltr"
                        value={ab.aporteProfesional}
                        onChange={(e) =>
                          updateAbogadoDemandado(
                            ab.id,
                            'aporteProfesional',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => removeAbogadoDemandado(ab.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peritos */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-800">
                Peritos
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPerito}
              >
                + Agregar perito
              </Button>
            </div>
            <div className="space-y-3">
              {peritos.map((p) => (
                <div
                  key={p.id}
                  className="border rounded-lg p-3 bg-violet-50/100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>👤 Nombre</Label>
                      <Input
                        value={p.nombre}
                        onChange={(e) =>
                          updatePerito(p.id, 'nombre', e.target.value)
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>💵 Honorarios regulados</Label>
                      <Input
                        dir="ltr"
                        value={p.base}
                        onChange={(e) =>
                          updatePerito(p.id, 'base', e.target.value)
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>⚖️ Costas a cargo del actor (%)</Label>
                      <Input
                        dir="ltr"
                        value={p.porcentajeCostas}
                        onChange={(e) =>
                          updatePerito(
                            p.id,
                            'porcentajeCostas',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <Label>🤝 Ap. a cargo de las partes (%)</Label>
                      <Input
                        dir="ltr"
                        value={p.aportePartes}
                        onChange={(e) =>
                          updatePerito(
                            p.id,
                            'aportePartes',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div>
                      <Label>🤝 Ap. a cargo del perito (%)</Label>
                      <Input
                        dir="ltr"
                        value={p.aportePerito}
                        onChange={(e) =>
                          updatePerito(
                            p.id,
                            'aportePerito',
                            e.target.value
                          )
                        }
                        className="mt-1 bg-white text-[#0f2f4b]"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={p.responsable}
                        onChange={(e) =>
                          updatePerito(
                            p.id,
                            'responsable',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">Responsable inscripto</span>
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={p.retencionAportes}
                        onChange={(e) =>
                          updatePerito(
                            p.id,
                            'retencionAportes',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-xs">
                        Retención aportes al actor
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => removePerito(p.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón calcular */}
          <div className="mt-6">
            <Button
              className="w-full bg-[#0f2f4b] hover:bg-[#0c243b]"
              size="lg"
              onClick={handleCalcular}
              disabled={calculando}
            >
              {calculando ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5 mr-2" />
                  Calcular órdenes de pago
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado renderizado desde HTML */}
{htmlResultado && (
  <Card className="border-2 border-slate-200 w-full max-w-[1200px] mx-auto">
    <CardHeader>
      <CardTitle className="text-sm font-semibold text-slate-800">
        Resultado
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div
        className="prose prose-sm max-w-none overflow-x-auto min-w-[1100px] text-xs"
        dangerouslySetInnerHTML={{ __html: htmlResultado }}
      />
    </CardContent>
  </Card>
)}
    </div>
  );
}

// =========================
// LÓGICA DE CÁLCULO
// (se usa desde handleCalcular)
// =========================

function calcularHonorariosAbogado(
  base,
  porcentajeCostas,
  responsable,
  retencionAportes,
  aportePartes
) {
  const montoActor = base * (porcentajeCostas / 100);
  const aporteActor = retencionAportes ? montoActor * (aportePartes / 100) : 0;
  const IVA = responsable ? montoActor * 0.21 : 0;
  const aporteDemandado =
    base * (1 - porcentajeCostas / 100) * (aportePartes / 100);
  const theoretical = montoActor + aporteActor + IVA;
  return { montoActor, aporteActor, aporteDemandado, IVA, theoretical };
}

function calcularHonorariosPerito(
  base,
  porcentajeCostas,
  responsable,
  retencionAportes,
  porcentajePartes
) {
  const montoActor = base * (porcentajeCostas / 100);
  const aporteActor = retencionAportes
    ? montoActor * (porcentajePartes / 100)
    : 0;
  const IVA = responsable ? montoActor * 0.21 : 0;
  const theoretical = montoActor + aporteActor + IVA;
  const aporteDemandado =
    base * (1 - porcentajeCostas / 100) * (porcentajePartes / 100);
  return { montoActor, aporteActor, aporteDemandado, IVA, theoretical };
}

function calcularDesgloseAbogado(prof) {
  const iva = prof.responsable ? 0.21 : 0;
  const aportesAct = prof.retencionAportes ? prof.aportePartes / 100 : 0;
  const aportesPart = prof.aportePartes / 100;

  const factorA = 1 + iva + aportesAct;
  const baseA = prof.actualRetencion / factorA;

  const factorB = 1 + iva + aportesPart;
  const baseB = prof.capitalPago / factorB;

  const baseCalculada = baseA + baseB;

  const aporteActor = prof.retencionAportes ? baseA * aportesPart : 0;
  const aporteDemandado = baseB * aportesPart;
  const aportePartesTotal = aporteActor + aporteDemandado;

  const aporteProfesional = baseCalculada * (prof.aporte / 100);
  const totalAportes = aportePartesTotal + aporteProfesional;
  const neto = baseCalculada - aporteProfesional;
  const IVAcal = iva * baseCalculada;

  return {
    baseCalculada,
    IVA: IVAcal,
    aportePartes: aportePartesTotal,
    aporteProfesional,
    totalAportes,
    neto,
    netoMasIVA: neto + IVAcal,
  };
}

// Versión especial para "solo retenciones" o "solo capital" en peritos
function calcularDesglosePerito(prof) {
  const iva = prof.responsable ? 0.21 : 0;

  const aportesAct = prof.retencionAportes ? prof.aportePartes / 100 : 0;
  const aportesPart = prof.aportePartes / 100;

  const factorA = 1 + iva + aportesAct;
  const baseA = prof.actualRetencion / factorA;

  const factorB = 1 + iva + aportesPart;
  const baseB = prof.capitalPago / factorB;

  const baseCalculada = baseA + baseB;

  const aporteActora = prof.retencionAportes ? baseA * aportesPart : 0;
  const aporteDemandado = baseB * aportesPart;
  const aportePartesTotal = aporteActora + aporteDemandado;

  const aporteProfesional = baseCalculada * (prof.aportePerito / 100);
  const totalAportes = aportePartesTotal + aporteProfesional;
  const neto = baseCalculada - aporteProfesional;
  const IVAcalculado = iva * baseCalculada;

  return {
    baseCalculada,
    IVA: IVAcalculado,
    aportePartes: aportePartesTotal,
    aporteProfesional,
    totalAportes,
    neto,
    netoMasIVA: neto + IVAcalculado,
  };
}

function calcularOrdenesDePago({
  capitalDisponible,
  smvm,
  actores,
  abogadosActores,
  abogadosDemandados,
  peritos,
}) {
  // ===== 1) Normalizar datos de entrada =====

  const actoresData = (actores || []).map((a) => ({
    nombre: a.nombre || 'Actor',
    monto: parseMoney(a.monto),
  }));

  const totalActores = actoresData.reduce((sum, a) => sum + a.monto, 0);

  const profesionales = [];

  const abogadosActoresData = (abogadosActores || []).map((ab) => {
    const base = parseMoney(ab.base);
    const porcentajeCostas = parsePercentage(ab.porcentajeCostas);
    const aportePartes = parsePercentage(ab.aportePartes);
    const aporte = parsePercentage(ab.aporteProfesional);
    const responsable = !!ab.responsable;
    const retencionAportes = !!ab.retencionAportes;

    const calc = calcularHonorariosAbogado(
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes
    );

    const factorExtra =
      (responsable ? 0.21 : 0) + aportePartes / 100;

    const orderTotalCapital =
      base *
      (1 - porcentajeCostas / 100) *
      (1 + factorExtra);

    const out = {
      tipo: 'actor',
      nombre: ab.nombre || 'Abogado Actor',
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes,
      aporte,
      montoActor: calc.montoActor,
      aporteActor: calc.aporteActor,
      aporteDemandado: calc.aporteDemandado,
      theoreticalRetencion: calc.theoretical,
      orderTotalCapital,
    };

    profesionales.push(out);
    return out;
  });

  const abogadosDemandadosData = (abogadosDemandados || []).map((ab) => {
    const base = parseMoney(ab.base);
    const porcentajeCostas = parsePercentage(ab.porcentajeCostas);
    const aportePartes = parsePercentage(ab.aportePartes);
    const aporte = parsePercentage(ab.aporteProfesional);
    const responsable = !!ab.responsable;
    const retencionAportes = !!ab.retencionAportes;

    const calc = calcularHonorariosAbogado(
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes
    );

    const out = {
      tipo: 'demandado',
      nombre: ab.nombre || 'Abogado Demandado',
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes,
      aporte,
      montoActor: calc.montoActor,
      aporteActor: calc.aporteActor,
      aporteDemandado: calc.aporteDemandado,
      theoreticalRetencion: calc.theoretical,
      orderTotalCapital: 0,
    };

    profesionales.push(out);
    return out;
  });

  const peritosData = (peritos || []).map((p) => {
    const base = parseMoney(p.base);
    const porcentajeCostas = parsePercentage(p.porcentajeCostas);
    const aportePartes = parsePercentage(p.aportePartes);
    const aportePerito = parsePercentage(p.aportePerito);
    const responsable = !!p.responsable;
    const retencionAportes = !!p.retencionAportes;

    const calc = calcularHonorariosPerito(
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes
    );

    const orderTotalCapital =
      base *
      (1 - porcentajeCostas / 100) *
      (1 + (responsable ? 0.21 : 0) + aportePartes / 100);

    const out = {
      tipo: 'perito',
      nombre: p.nombre || 'Perito',
      base,
      porcentajeCostas,
      responsable,
      retencionAportes,
      aportePartes,
      aportePerito,
      montoActor: calc.montoActor,
      aporteActor: calc.aporteActor,
      aporteDemandado: calc.aporteDemandado,
      theoreticalRetencion: calc.theoretical,
      orderTotalCapital,
    };

    profesionales.push(out);
    return out;
  });

  // ===== 2) Retenciones teóricas y prorrateo sobre actores =====

  const totalTheoreticalRetencionesActores = profesionales.reduce(
    (sum, prof) =>
      prof.tipo === 'actor' ||
      prof.tipo === 'perito' ||
      prof.tipo === 'demandado'
        ? sum + (prof.theoreticalRetencion || 0)
        : sum,
    0
  );

  let totalActorMontoUsado = 0;
  if (capitalDisponible < totalActores) {
    const factorProrrateo =
      totalActores > 0 ? capitalDisponible / totalActores : 0;
    actoresData.forEach((actor) => {
      actor.montoBruto = actor.monto;
      actor.montoProrrateado = actor.montoBruto * factorProrrateo;
      totalActorMontoUsado += actor.montoProrrateado;
    });
  } else {
    actoresData.forEach((actor) => {
      actor.montoBruto = actor.monto;
      actor.montoProrrateado = actor.montoBruto;
      totalActorMontoUsado += actor.montoProrrateado;
    });
  }

  if (actoresData.length === 0) {
    profesionales.forEach((prof) => {
      prof.theoreticalRetencion = 0;
      prof.actualRetencion = 0;
      prof.finalTotal = prof.capitalPago || 0;
    });
  }

  const desiredGlobalRetPercent =
    totalActorMontoUsado > 0
      ? totalTheoreticalRetencionesActores / totalActorMontoUsado
      : 0;

  actoresData.forEach((actor) => {
    const maxAllowed =
      actor.montoProrrateado >= 2 * smvm ? 0.2 : 0.1;
    actor.retencionNecesaria = desiredGlobalRetPercent;
    actor.retencionAplicada = Math.min(
      desiredGlobalRetPercent,
      maxAllowed
    );
    actor.tope = actor.montoProrrateado * actor.retencionAplicada;
    actor.montoFinal = actor.montoProrrateado - actor.tope;
  });

  const totalTheoreticalRetenciones = profesionales.reduce(
    (sum, prof) => sum + (prof.theoreticalRetencion || 0),
    0
  );
  const totalActorRetenciones = actoresData.reduce(
    (sum, actor) => sum + (actor.tope || 0),
    0
  );

  let factorRetencion =
    totalTheoreticalRetenciones > 0
      ? totalActorRetenciones / totalTheoreticalRetenciones
      : 1;
  if (factorRetencion > 1) factorRetencion = 1;

  profesionales.forEach((prof) => {
    prof.actualRetencion = Math.min(
      prof.theoreticalRetencion || 0,
      (prof.theoreticalRetencion || 0) * factorRetencion
    );
  });

  // ===== 3) Capital disponible para profesionales =====

  if (capitalDisponible < totalActores) {
    profesionales.forEach((prof) => {
      prof.capitalPago = 0;
      prof.finalTotal = prof.actualRetencion || 0;
    });
  } else {
    const capitalProfesionales = Math.max(
      capitalDisponible - totalActores,
      0
    );
    const totalOrderCapital = profesionales.reduce(
      (sum, prof) => sum + (prof.orderTotalCapital || 0),
      0
    );
    profesionales.forEach((prof) => {
      if (prof.orderTotalCapital > 0 && totalOrderCapital > 0) {
        const pagoCalculado =
          (prof.orderTotalCapital / totalOrderCapital) *
          capitalProfesionales;
        prof.capitalPago = Math.min(
          pagoCalculado,
          prof.orderTotalCapital
        );
      } else {
        prof.capitalPago = 0;
      }
      prof.finalTotal =
        (prof.actualRetencion || 0) + (prof.capitalPago || 0);
    });
  }

  if (actoresData.length === 0) {
    profesionales.forEach((prof) => {
      prof.theoreticalRetencion = 0;
      prof.actualRetencion = 0;
      prof.finalTotal = prof.capitalPago || 0;
    });
  }

  profesionales.forEach((prof) => {
    if (prof.tipo === 'actor' || prof.tipo === 'demandado') {
      prof.desglose = calcularDesgloseAbogado(prof);
    } else if (prof.tipo === 'perito') {
      prof.desglose = calcularDesglosePerito(prof);
    }
  });

  const totalActualRet = profesionales.reduce(
    (sum, prof) => sum + (prof.actualRetencion || 0),
    0
  );

  const capitalProfesionales = Math.max(
    capitalDisponible - totalActores,
    0
  );

  // =========================
  // 4) Construcción de HTML “lindo”
  // =========================

  let html = `
  <div class="space-y-6 text-xs md:text-sm text-slate-800">
    <h2 class="text-base md:text-lg font-semibold text-[#0f2f4b] mb-1">
      Resultado
    </h2>
  `;

  // --- Tabla Actores ---
  html += `
    <section class="space-y-2">
      <h3 class="text-sm md:text-base font-semibold text-[#0f2f4b]">
        Actores
      </h3>
      <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full border-collapse text-[11px]">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Nombre</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Monto Bruto</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Monto Prorrateado</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">% Retención necesaria</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">% Retención aplicada</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Monto retenido</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Monto a recibir</th>
            </tr>
          </thead>
          <tbody>
  `;

  actoresData.forEach((actor, idx) => {
    const porcentajeNecesaria =
      (actor.retencionNecesaria * 100).toFixed(2).replace('.', ',') + '%';
    const porcentajeAplicada =
      (actor.retencionAplicada * 100).toFixed(2).replace('.', ',') + '%';

    const rowBg =
      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

    html += `
      <tr class="border-t border-slate-100 ${rowBg}">
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${actor.nombre}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(actor.montoBruto)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(actor.montoProrrateado)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${porcentajeNecesaria}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${porcentajeAplicada}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(actor.tope)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap font-semibold text-[#0f2f4b]">${formatMoney(actor.montoFinal)}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;

  // --- Profesionales (resumen) ---
  html += `
    <section class="space-y-2">
      <h3 class="text-sm md:text-base font-semibold text-[#0f2f4b]">
        Profesionales
      </h3>
      <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full border-collapse text-[11px]">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Nombre</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Tipo</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Theoretical Ret.</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Actual Ret.</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Capital Pago</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Total a cobrar</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Base calculada</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Aporte prof.</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto + IVA</th>
            </tr>
          </thead>
          <tbody>
  `;

  profesionales.forEach((prof, idx) => {
    const tipoTexto =
      prof.tipo === 'actor'
        ? 'Abogado Actor'
        : prof.tipo === 'demandado'
        ? 'Abogado Demandado'
        : 'Perito';

    const rowBg =
      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

    html += `
      <tr class="border-t border-slate-100 ${rowBg}">
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${prof.nombre}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${tipoTexto}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.theoreticalRetencion)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.actualRetencion)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.capitalPago)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap font-semibold text-[#0f2f4b]">${formatMoney(prof.finalTotal)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.baseCalculada)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.aporteProfesional)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.neto)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.netoMasIVA)}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;

  // --- Detalle de profesionales (incluye lo retenido) ---
  html += `
    <section class="space-y-2">
      <h3 class="text-sm md:text-base font-semibold text-[#0f2f4b]">
        Detalle de Profesionales (incluye lo retenido)
      </h3>
      <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full border-collapse text-[11px]">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Nombre</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Tipo</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Base calculada</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">IVA</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. partes</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. profesional</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Total aportes</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto + IVA</th>
            </tr>
          </thead>
          <tbody>
  `;

  profesionales.forEach((prof, idx) => {
    const tipoTexto =
      prof.tipo === 'actor'
        ? 'Abogado Actor'
        : prof.tipo === 'demandado'
        ? 'Abogado Demandado'
        : 'Perito';

    const rowBg =
      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

    html += `
      <tr class="border-t border-slate-100 ${rowBg}">
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${prof.nombre}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${tipoTexto}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.baseCalculada)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.IVA)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.aportePartes)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.aporteProfesional)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.totalAportes)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.neto)}</td>
        <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(prof.desglose.netoMasIVA)}</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </section>
  `;

  // --- Solo retenciones ---
  html += `
    <section class="space-y-2">
      <details class="rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2">
        <summary class="cursor-pointer text-xs md:text-sm font-semibold text-[#0f2f4b]">
          Ver detalle de lo retenido a el/los actor/es destinado a honorarios
        </summary>
        <div class="mt-3 overflow-x-auto rounded-lg border border-slate-100">
          <table class="min-w-full border-collapse text-[11px]">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Nombre</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Tipo</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Honorarios</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">IVA</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. partes</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. profesional</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Total aportes</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto + IVA</th>
              </tr>
            </thead>
            <tbody>
  `;

  profesionales.forEach((prof, idx) => {
    let desg;
    if (prof.tipo === 'perito') {
      desg = calcularDesglosePerito({
        responsable: prof.responsable,
        retencionAportes: prof.retencionAportes,
        aportePartes: prof.aportePartes,
        aportePerito: prof.aportePerito,
        actualRetencion: prof.actualRetencion,
        capitalPago: 0,
      });
    } else {
      desg = calcularDesgloseAbogado({
        responsable: prof.responsable,
        retencionAportes: prof.retencionAportes,
        aportePartes: prof.aportePartes,
        aporte: prof.aporte,
        actualRetencion: prof.actualRetencion,
        capitalPago: 0,
      });
    }

    const tipoTexto =
      prof.tipo === 'perito'
        ? 'Perito'
        : prof.tipo === 'actor'
        ? 'Abogado Actor'
        : 'Abogado Demandado';

    const rowBg =
      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

    html += `
        <tr class="border-t border-slate-100 ${rowBg}">
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${prof.nombre}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${tipoTexto}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.baseCalculada)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.IVA)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.aportePartes)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.aporteProfesional)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.totalAportes)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.neto)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.netoMasIVA)}</td>
        </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>
      </details>
    </section>
  `;

  // --- Solo capital disponible ---
  html += `
    <section class="space-y-2">
      <details class="rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2">
        <summary class="cursor-pointer text-xs md:text-sm font-semibold text-[#0f2f4b]">
          Ver detalle del capital sobrante destinado a honorarios
        </summary>
        <div class="mt-3 overflow-x-auto rounded-lg border border-slate-100">
          <table class="min-w-full border-collapse text-[11px]">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Nombre</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Tipo</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Honorarios</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">IVA</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. partes</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Ap. profesional</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Total aportes</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600">Neto + IVA</th>
              </tr>
            </thead>
            <tbody>
  `;

  profesionales.forEach((prof, idx) => {
    let desg;
    if (prof.tipo === 'perito') {
      desg = calcularDesglosePerito({
        responsable: prof.responsable,
        retencionAportes: prof.retencionAportes,
        aportePartes: prof.aportePartes,
        aportePerito: prof.aportePerito,
        actualRetencion: 0,
        capitalPago: prof.capitalPago,
      });
    } else {
      desg = calcularDesgloseAbogado({
        responsable: prof.responsable,
        retencionAportes: prof.retencionAportes,
        aportePartes: prof.aportePartes,
        aporte: prof.aporte,
        actualRetencion: 0,
        capitalPago: prof.capitalPago,
      });
    }

    const tipoTexto =
      prof.tipo === 'perito'
        ? 'Perito'
        : prof.tipo === 'actor'
        ? 'Abogado Actor'
        : 'Abogado Demandado';

    const rowBg =
      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

    html += `
        <tr class="border-t border-slate-100 ${rowBg}">
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${prof.nombre}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${tipoTexto}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.baseCalculada)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.IVA)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.aportePartes)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.aporteProfesional)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.totalAportes)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.neto)}</td>
          <td class="px-3 py-1.5 text-center whitespace-nowrap">${formatMoney(desg.netoMasIVA)}</td>
        </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>
      </details>
    </section>
  `;

  // --- KPIs finales ---
  html += `
    <section class="space-y-1 text-xs md:text-sm">
      <p><strong>💰 Capital Disponible:</strong> ${formatMoney(
        capitalDisponible
      )}</p>
      <p><strong>👩‍⚖️ Capital para Profesionales</strong> (Capital disponible – suma de montos de actores): ${formatMoney(
        capitalProfesionales
      )}</p>
      <p><strong>🔒 Total teórico de retenciones:</strong> ${formatMoney(
        totalTheoreticalRetenciones
      )}</p>
      <p><strong>🔒 Total real de retenciones (de actores):</strong> ${formatMoney(
        totalActorRetenciones
      )}</p>
      <p><strong>⚙️ Factor de ajuste para retenciones:</strong> ${factorRetencion.toFixed(
        4
      )}</p>
    </section>
  </div>
  `;

  return html;
}
