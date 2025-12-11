import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Textarea } from '@/components/ui/textarea';

// src/components/CalculadoraActualizacion.jsx
import React, { useEffect, useState } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { FinancialData } from '@/entities/FinancialData';
import { Calculator, FileText, RefreshCw, DollarSign, Calendar as CalendarIcon, Percent } from 'lucide-react';
import axios from 'axios';

// ========= Helpers formato FINFOCUS =========

function formatFechaDDMMYYYY(fechaStr) {
  if (!fechaStr) return fechaStr;
  const [yyyy, mm, dd] = fechaStr.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function formatearMontoARS(numero) {
  if (isNaN(numero) || numero === null) return '$ 0,00';
  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatearPorcentajeNumero(numero) {
  if (numero === null || numero === undefined || isNaN(numero)) return '0,00%';
  return (
    numero.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '%'
  );
}

// parsea "$ 1.234,56" -> 1234.56
function parseMontoARS(texto) {
  if (!texto) return 0;
  const limpio = texto
    .toString()
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

// ========= Fechas / claves =========

// "2024-03-15" -> "2024-03"
function claveMensual(fechaIso) {
  if (!fechaIso) return null;
  const [y, m] = fechaIso.split('-');
  return `${y}-${m}`;
}

// Parseo robusto para fechas de IPC tipo "ene-24", "sept-21", "jan-19", etc.
function parseFechaIPC(fechaStr) {
  try {
    if (!fechaStr) return null;
    const str = fechaStr.toString().trim().toLowerCase();

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
      set: 8,   // Portugués ("setembro")
      sept: 8,  // "septiembre"

      // Inglés
      jan: 0,
      apr: 3,
      aug: 7,
      dec: 11,
    };

    const parts = str.split('-');

    // Caso "ene-24", "sep-21", "jan-19", etc.
    if (parts.length === 2 && meses[parts[0]] !== undefined) {
      const mesStr = parts[0];
      const yearStr = parts[1];

      const mes = meses[mesStr];
      let year = parseInt(yearStr, 10);

      if (Number.isNaN(year)) return null;

      // Dos dígitos → siglo
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      const fecha = new Date(year, mes, 1);
      return fecha.toISOString();
    }

    // Fallback: "YYYY-MM-DD"
    let match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const fecha = new Date(year, month, 1);
      return fecha.toISOString();
    }

    // Fallback: solo "YYYY-MM"
    match = str.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const fecha = new Date(year, month, 1);
      return fecha.toISOString();
    }

    return null;
  } catch (error) {
    console.error('Error parseando fecha IPC:', fechaStr, error);
    return null;
  }
}

function diasEntre(f1, f2) {
  const d1 = new Date(f1);
  const d2 = new Date(f2);
  return (d2 - d1) / (1000 * 60 * 60 * 24);
}

function formatearFechaArg(fechaISO) {
  if (!fechaISO) return '';
  const [a, m, d] = fechaISO.split('-');
  return `${d}/${m}/${a}`;
}

// ========= Helpers resumen de índices =========

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function formatearMesAnioDesdeClave(claveYYYYMM) {
  if (!claveYYYYMM) return '';
  const [y, m] = claveYYYYMM.split('-').map(Number);
  const nombreMes = MESES_CORTOS[(m || 1) - 1] || '';
  return `${nombreMes} ${y}`;
}

function mesesDeVentana(valorVentana) {
  switch (valorVentana) {
    case '1m':
      return 1;
    case '3m':
      return 3;
    case '6m':
      return 6;
    case '1y':
      return 12;
    case '3y':
      return 36;
    case '5y':
      return 60;
    default:
      return 12;
  }
}

function labelVentanaResumen(valorVentana) {
  switch (valorVentana) {
    case '1m':
      return 'Último mes';
    case '3m':
      return 'Último trimestre';
    case '6m':
      return 'Último semestre';
    case '1y':
      return 'Último año';
    case '3y':
      return 'Últimos 3 años';
    case '5y':
      return 'Últimos 5 años';
    default:
      return 'Último año';
  }
}

function restarMesesClaveMensual(claveYYYYMM, meses) {
  if (!claveYYYYMM) return null;
  const [y, m] = claveYYYYMM.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  d.setMonth(d.getMonth() - meses);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function restarMesesFechaISO(fechaISO, meses) {
  if (!fechaISO) return null;
  const [y, m, d] = fechaISO.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setMonth(date.getMonth() - meses);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function encontrarClaveAnteriorOMisma(claves, objetivo) {
  if (!claves || claves.length === 0 || !objetivo) return null;
  const ordenadas = [...claves].sort();
  let candidata = null;
  for (const k of ordenadas) {
    if (k <= objetivo) candidata = k;
    else break;
  }
  return candidata;
}

function labelIndiceResumen(tipo) {
  return (
    {
      activa: 'Tasa Activa BNA',
      pasiva: 'Tasa Pasiva promedio BCRA',
      cer: 'CER',
      inflacion: 'IPC Nivel General',
      smvm: 'SMVM',
      ripte: 'RIPTE',
    }[tipo] || tipo
  );
}

function formatearValorIndice(tipo, valor) {
  if (valor == null || isNaN(valor)) return '—';

  if (tipo === 'activa' || tipo === 'pasiva') {
    // Mostrar solo número, sin %
    return valor.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (tipo === 'smvm') {
    // Salario mínimo en pesos
    return formatearMontoARS(valor);
  }

  // CER, IPC, RIPTE: número simple con 2 decimales
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Calcula para un tipo de índice: última fecha, último valor y variación en la ventana
function calcularResumenIndice(tipo, indices, ventana) {
  if (!indices) return null;

  const mesesVentana = mesesDeVentana(ventana);
  const esMensual = ['inflacion', 'smvm', 'ripte'].includes(tipo);
  const datos = indices[tipo] || {};
  const claves = Object.keys(datos);
  if (!claves.length) return null;

  const clavesOrdenadas = [...claves].sort();
  const claveUltima = clavesOrdenadas[clavesOrdenadas.length - 1];
  const valorUltimo = datos[claveUltima];

  let claveInicio = null;

  if (esMensual) {
    const claveInicioEstim = restarMesesClaveMensual(claveUltima, mesesVentana);
    claveInicio = encontrarClaveAnteriorOMisma(clavesOrdenadas, claveInicioEstim);
  } else {
    const fechaInicioEstim = restarMesesFechaISO(claveUltima, mesesVentana);
    claveInicio = encontrarClaveAnteriorOMisma(clavesOrdenadas, fechaInicioEstim);
  }

  let variacion = null;

  if (claveInicio && datos[claveInicio] != null && valorUltimo != null) {
    const i1 = datos[claveInicio];
    const i2 = valorUltimo;

    if (tipo === 'activa') {
      // Misma definición que en getTasaBasePorTipo
      variacion = i2 - i1;
    } else if (tipo === 'pasiva') {
      variacion = ((100 + i2) / (100 + i1) - 1) * 100;
    } else {
      // cer, inflacion, smvm, ripte
      variacion = ((i2 / i1) - 1) * 100;
    }
  }

  const fechaLabel = esMensual
    ? formatearMesAnioDesdeClave(claveUltima)
    : formatearFechaArg(claveUltima);

  return {
    tipo,
    nombre: labelIndiceResumen(tipo),
    fechaLabel,
    valorLabel: formatearValorIndice(tipo, valorUltimo),
    variacion,
  };
}

function calcularResumenIndices(indices, ventana) {
  if (!indices) return [];
  const tipos = ['activa', 'pasiva', 'ripte', 'smvm', 'inflacion', 'cer'];
  const res = [];

  for (const t of tipos) {
    const fila = calcularResumenIndice(t, indices, ventana);
    if (fila) res.push(fila);
  }

  return res;
}

// ========= Formato Números FINFOCUS (en tiempo real) =========

// Convierte "100000" → "100.000" mientras escribís
function formatNumberInput(value) {
  if (!value) return '';

  let cleaned = value.replace(/[^\d,]/g, '');

  let [entera, decimal] = cleaned.split(',');

  entera = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decimal !== undefined) {
    return `${entera},${decimal}`;
  }

  return entera;
}

// Convierte el texto formateado a número real
function parseNumberInput(value) {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ================= Detalle de pasos (historial) =================

function renderDetalleEventos(resultado) {
  if (!resultado || !resultado.historial || resultado.historial.length === 0) {
    return null;
  }

  // Nombre “lindo” de la tasa para el título
  const nombreTasaLargo =
    {
      activa: 'Tasa activa BNA',
      pasiva: 'Tasa pasiva promedio BCRA',
      cer: 'CER',
      inflacion: 'IPC Nivel General',
      smvm: 'SMVM',
      ripte: 'RIPTE',
      inflacion_extra: 'IPC + interés puro adicional',
      cer_extra: 'CER + interés puro adicional',
    }[resultado.tipoTasa] || resultado.tipoTasa;

  return (
    <div className="mt-8">
      {/* TÍTULO DEL DETALLE */}
      <h3 className="text-center text-lg md:text-xl font-extrabold text-[#0f2f4b] mb-4">
        Detalle del cálculo por {nombreTasaLargo}
      </h3>

      <div className="space-y-6">
        {resultado.historial.map((item, idx) => {
          const fecha = item.fecha ? formatearFechaArg(item.fecha) : '';
          const monto = item.monto != null ? formatearMontoARS(item.monto) : '';

          // ---------- 1) TRAMOS DE INTERESES DEVENGADOS ----------
          if (item.tipo === 'interes-devengado') {
            return (
              <div key={idx} className="space-y-2 text-center">
                {/* Pastilla celeste con rango de fechas + capital */}
                <div className="inline-flex items-center gap-2 bg-[#E8F4FB] border border-[#D0E4F4] px-3 py-2 rounded-full text-[#0f2f4b] text-sm font-semibold">
                  <span>📌</span>
                  <span className="whitespace-nowrap">
                    {item.descripcion || `Intereses devengados al ${fecha}`}
                  </span>
                  {item.capital != null && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="font-normal">
                        Capital que devenga interés:{' '}
                        <span className="font-bold">
                          {formatearMontoARS(item.capital)}
                        </span>
                      </span>
                    </>
                  )}
                </div>

                {/* Línea principal de intereses */}
                <p className="text-sm md:text-base text-slate-800 text-center">
                  Intereses devengados en este período
                  {item.tasa != null && (
                    <>
                      {' '}
                      (<span className="font-semibold">
                        {item.tasa.toFixed(2)}%
                      </span>
                      )
                    </>
                  )}
                  :{' '}
                  <span className="font-bold text-[#0f2f4b]">
                    +{monto}
                  </span>
                  .
                </p>

                {/* Líneas adicionales estilo FINFOCUS */}
<div className="text-xs text-slate-600 mt-1 space-y-1 text-center">
  <p>
    Intereses adeudados no capitalizados:{' '}
    <span className="font-semibold">
      {formatearMontoARS(resultado.interesesAdeudados)}
    </span>
  </p>
  <p>
    Total intereses adeudados no capitalizados hasta el{' '}
    {formatearFechaArg(item.fecha)}:{' '}
    <span className="font-semibold">
      {formatearMontoARS(
        resultado.interesesAdeudados + resultado.interesesDevengados
      )}
    </span>
  </p>
</div>

                {/* Subtexto opcional (si tenés una descripción extra) */}
                {item.detalle && (
                  <p className="text-xs text-slate-500 text-center">
                    {item.detalle}
                  </p>
                )}
              </div>
            );
          }

          // ---------- 2) CAPITALIZACIONES ----------
          if (
            item.tipo === 'capitalizacion-intereses-adeudados' ||
            item.tipo === 'capitalizacion-intereses-devengados'
          ) {
            const esDevengados =
              item.tipo === 'capitalizacion-intereses-devengados';

            return (
              <div key={idx} className="text-center space-y-1">
                <p className="text-sm md:text-base font-extrabold text-purple-600">
                  {esDevengados
                    ? 'Capitalización de intereses devengados'
                    : 'Capitalización de intereses adeudados'}{' '}
                  :{' '}
                  <span>+{monto}</span>
                </p>
                {item.descripcion && (
                  <p className="text-xs text-slate-500 text-center">
                    {item.descripcion}
                  </p>
                )}
              </div>
            );
          }

          // ---------- 3) PAGOS ----------
          if (item.tipo.startsWith('pago-')) {
            let label =
              {
                'pago-intereses-adeudados': 'Pago aplicado a intereses adeudados',
                'pago-intereses-devengados':
                  'Pago aplicado a intereses devengados',
                'pago-capital': 'Pago aplicado a capital',
                'pago-sobrante': 'Pago sobrante no aplicado',
              }[item.tipo] || 'Pago aplicado';

            return (
              <div key={idx} className="text-center space-y-1">
                <p className="text-sm md:text-base font-extrabold text-emerald-600">
                  {label}: <span>-{monto}</span>
                </p>
                {item.descripcion && (
                  <p className="text-xs text-slate-500 text-center">
                    {item.descripcion}
                  </p>
                )}
              </div>
            );
          }

          // ---------- 4) INCORPORACIÓN DE CAPITAL U OTROS ----------
          if (item.tipo === 'incorporacion-capital') {
            return (
              <div key={idx} className="text-center space-y-1">
                <p className="text-sm md:text-base font-extrabold text-emerald-700">
                  Incorporación de capital histórico:{' '}
                  <span>+{monto}</span>
                </p>
                {item.intereses > 0 && (
                  <p className="text-xs text-slate-600">
                    Incluye intereses adeudados incorporados:{' '}
                    <span className="font-semibold">
                      {formatearMontoARS(item.intereses)}
                    </span>
                  </p>
                )}
              </div>
            );
          }

          // ---------- 5) Fallback: cualquier otro tipo ----------
          return (
            <p
              key={idx}
              className="text-sm text-slate-700"
            >
              {idx + 1}) {fecha}: {item.descripcion || item.tipo} por {monto}.
            </p>
          );
        })}
      </div>
    </div>
  );
}


// ========= Cálculo de tasas =========

/**
 * indices:
 * {
 *   activa: { "YYYY-MM-DD": number, ... },
 *   pasiva: { "YYYY-MM-DD": number, ... },
 *   cer:    { "YYYY-MM-DD": number, ... },
 *   inflacion: { "YYYY-MM": number, ... },
 *   smvm:      { "YYYY-MM": number, ... },
 *   ripte:     { "YYYY-MM": number, ... }
 * }
 */

function getTasaBasePorTipo(tipo, fechaInicio, fechaFin, indices) {
  if (!indices || !fechaInicio || !fechaFin) return null;

  let tasa = null;

  // DIARIAS
  if (tipo === 'activa') {
    const i1 = indices.activa?.[fechaInicio];
    const i2 = indices.activa?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = i2 - i1; // definición original
    }
  }

  if (tipo === 'pasiva') {
    const i1 = indices.pasiva?.[fechaInicio];
    const i2 = indices.pasiva?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = ((100 + i2) / (100 + i1) - 1) * 100;
    }
  }

  if (tipo === 'cer') {
    const i1 = indices.cer?.[fechaInicio];
    const i2 = indices.cer?.[fechaFin];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  // MENSUALES
  if (tipo === 'smvm') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.smvm?.[k1];
    const i2 = indices.smvm?.[k2];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  if (tipo === 'inflacion') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.inflacion?.[k1];
    const i2 = indices.inflacion?.[k2];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  if (tipo === 'ripte') {
    const k1 = claveMensual(fechaInicio);
    const k2 = claveMensual(fechaFin);
    const i1 = indices.ripte?.[k1];
    const i2 = indices.ripte?.[k2];
    if (i1 != null && i2 != null) {
      tasa = ((i2 / i1) - 1) * 100;
    }
  }

  return tasa;
}

/**
 * Tasa con “interés puro adicional” (IPC + extra, CER + extra)
 * extraPuro: % anual (ej 6 → 6% anual).
 */
function getTasaConExtra(tipoTasa, fechaInicio, fechaFin, indices, extraPuro) {
  const baseTipo = tipoTasa === 'inflacion_extra' ? 'inflacion' : 'cer';
  const base = getTasaBasePorTipo(baseTipo, fechaInicio, fechaFin, indices);
  if (base === null) return null;

  const dias = diasEntre(fechaInicio, fechaFin);
  const extraAnualProp = (extraPuro || 0) / 100;
  const extraPct = extraAnualProp * (dias / 365) * 100; // % sobre el tramo

  return base + extraPct;
}

/**
 * Tasa final por tramo:
 *  - incluye variantes inflacion_extra / cer_extra
 *  - aplica multiplicador (si está habilitado)
 */
function getTasaPorTipoTramo(tipoTasa, fechaInicio, fechaFin, indices, extraPuro, multiplica) {
  if (!fechaInicio || !fechaFin) return null;

  let t = null;

  if (tipoTasa === 'inflacion_extra' || tipoTasa === 'cer_extra') {
    t = getTasaConExtra(tipoTasa, fechaInicio, fechaFin, indices, extraPuro);
  } else {
    t = getTasaBasePorTipo(tipoTasa, fechaInicio, fechaFin, indices);
  }

  if (t === null) return null;

  const m = multiplica?.enabled ? (multiplica.value || 1) : 1;
  return t * m;
}

function labelTipoTasaCorta(tipo) {
  return (
    {
      activa: 'Activa BNA',
      pasiva: 'Pasiva BCRA',
      cer: 'CER',
      inflacion: 'IPC',
      smvm: 'SMVM',
      ripte: 'RIPTE',
      inflacion_extra: 'IPC + extra',
      cer_extra: 'CER + extra',
    }[tipo] || tipo
  );
}

// ========= Cálculo de evolución con capitales / pagos / capitalización =========

function calcularEvolucionCapitales(capitalesHistoricos, tipoTasa, eventos, indices, extraPuro, multiplica) {
  const resultado = {
    capitalActual: 0,
    interesesAdeudados: 0,
    interesesDevengados: 0,
    historial: [],
    capitales: [],
  };

  // Inicializar cada capital
  capitalesHistoricos.forEach((cap) => {
    resultado.capitales.push({
      ...cap,
      activo: false,
      interesesDevengados: 0,
    });
  });

  if (capitalesHistoricos.length === 0) return resultado;

  // Tomamos el primer capital como disparador inicial
  let fechaAnterior = capitalesHistoricos[0].fechaInicio;
  resultado.capitalActual = capitalesHistoricos[0].capital;
  resultado.interesesAdeudados = capitalesHistoricos[0].intereses;
  resultado.capitales[0].activo = true;

  // Procesar cada evento ordenado
  for (const evento of eventos) {
    // 1) Activar capitales cuya fechaInicio sea <= evento.fecha
    const nuevosCapitales = capitalesHistoricos.filter(
      (cap) =>
        !resultado.capitales.find((c) => c.id === cap.id).activo &&
        new Date(cap.fechaInicio) <= new Date(evento.fecha)
    );

    nuevosCapitales.forEach((nuevoCap) => {
      const capIndex = resultado.capitales.findIndex((c) => c.id === nuevoCap.id);
      if (capIndex >= 0 && !resultado.capitales[capIndex].activo) {
        // Intereses desde fechaAnterior hasta incorporación de este capital
        if (fechaAnterior < nuevoCap.fechaInicio) {
          const tasa = getTasaPorTipoTramo(
            tipoTasa,
            fechaAnterior,
            nuevoCap.fechaInicio,
            indices,
            extraPuro,
            multiplica
          );
          if (tasa !== null) {
            const interes = resultado.capitalActual * (tasa / 100);
            resultado.interesesDevengados += interes;
            resultado.historial.push({
              fecha: nuevoCap.fechaInicio,
              tipo: 'interes-devengado',
              monto: interes,
              tasa,
              capital: resultado.capitalActual,
              descripcion: `Intereses devengados desde ${formatearFechaArg(
                fechaAnterior
              )} hasta ${formatearFechaArg(nuevoCap.fechaInicio)}`,
            });
          }
        }

        // Incorporar el nuevo capital
        resultado.capitalActual += nuevoCap.capital;
        resultado.interesesAdeudados += nuevoCap.intereses;
        resultado.capitales[capIndex].activo = true;

        resultado.historial.push({
          fecha: nuevoCap.fechaInicio,
          tipo: 'incorporacion-capital',
          monto: nuevoCap.capital,
          intereses: nuevoCap.intereses,
          descripcion: `Incorporación de capital histórico`,
        });

        fechaAnterior = nuevoCap.fechaInicio;
      }
    });

    // 2) Intereses desde fechaAnterior hasta este evento
    if (evento.fecha > fechaAnterior) {
      const tasa = getTasaPorTipoTramo(
        tipoTasa,
        fechaAnterior,
        evento.fecha,
        indices,
        extraPuro,
        multiplica
      );
      if (tasa !== null) {
        const interes = resultado.capitalActual * (tasa / 100);
        resultado.interesesDevengados += interes;
        resultado.historial.push({
          fecha: evento.fecha,
          tipo: 'interes-devengado',
          monto: interes,
          tasa,
          capital: resultado.capitalActual,
          descripcion: `Intereses devengados desde ${formatearFechaArg(
            fechaAnterior
          )} hasta ${formatearFechaArg(evento.fecha)}`,
        });
      }
    }

    // 3) Procesar tipo de evento
    switch (evento.tipo) {
      case 'capitalizacion': {
        // Capitalizar intereses adeudados
        if (resultado.interesesAdeudados > 0) {
          resultado.capitalActual += resultado.interesesAdeudados;
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'capitalizacion-intereses-adeudados',
            monto: resultado.interesesAdeudados,
            descripcion: 'Capitalización de intereses adeudados',
          });
          resultado.interesesAdeudados = 0;
        }
        // Capitalizar intereses devengados
        if (resultado.interesesDevengados > 0) {
          resultado.capitalActual += resultado.interesesDevengados;
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'capitalizacion-intereses-devengados',
            monto: resultado.interesesDevengados,
            descripcion: 'Capitalización de intereses devengados',
          });
          resultado.interesesDevengados = 0;
        }
        break;
      }
      case 'pago': {
        let restante = evento.monto;

        // 1) Intereses adeudados
        if (resultado.interesesAdeudados > 0 && restante > 0) {
          const pagoIntA = Math.min(restante, resultado.interesesAdeudados);
          resultado.interesesAdeudados -= pagoIntA;
          restante -= pagoIntA;
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'pago-intereses-adeudados',
            monto: pagoIntA,
            restante,
            descripcion: 'Pago aplicado a intereses adeudados',
          });
        }

        // 2) Intereses devengados
        if (resultado.interesesDevengados > 0 && restante > 0) {
          const pagoIntD = Math.min(restante, resultado.interesesDevengados);
          resultado.interesesDevengados -= pagoIntD;
          restante -= pagoIntD;
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'pago-intereses-devengados',
            monto: pagoIntD,
            restante,
            descripcion: 'Pago aplicado a intereses devengados',
          });
        }

        // 3) Capital
        if (restante > 0 && resultado.capitalActual > 0) {
          const pagoCap = Math.min(restante, resultado.capitalActual);
          resultado.capitalActual -= pagoCap;
          restante -= pagoCap;
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'pago-capital',
            monto: pagoCap,
            restante,
            descripcion: 'Pago aplicado a capital',
          });
        }

        if (restante > 0) {
          resultado.historial.push({
            fecha: evento.fecha,
            tipo: 'pago-sobrante',
            monto: restante,
            descripcion: 'Pago sobrante no aplicado',
          });
        }
        break;
      }
      default:
        break;
    }

    fechaAnterior = evento.fecha;
  }

  return resultado;
}

// ========= Componente principal =========

const OPCIONES_TIPO_TASA = [
  { value: 'activa', label: 'Tasa activa BNA (diaria)' },
  { value: 'pasiva', label: 'Tasa pasiva promedio BCRA (diaria)' },
  { value: 'cer', label: 'CER (variación índice)' },
  { value: 'inflacion', label: 'Inflación IPC Nivel General (variación)' },
  { value: 'smvm', label: 'SMVM (variación)' },
  { value: 'ripte', label: 'RIPTE (variación)' },
  { value: 'inflacion_extra', label: 'IPC Nivel General + interés puro' },
  { value: 'cer_extra', label: 'CER + interés puro' },
];

export default function CalculadoraActualizacion({ toolId, toolName }) {
  const [indices, setIndices] = useState(null);
  const [indicesError, setIndicesError] = useState(null);

  // capitales: array de {id, fechaInicio, capital, intereses}
  const [capitales, setCapitales] = useState([
    { id: 1, fechaInicio: '', capital: '', intereses: '' },
  ]);
  const [fechaFinal, setFechaFinal] = useState('');

  const [tipoTasa, setTipoTasa] = useState('activa');
  const [extraPuro, setExtraPuro] = useState(''); // % anual

  // Eventos
  const [capitalizaciones, setCapitalizaciones] = useState([]);
  const [pagos, setPagos] = useState([]);

  // Multiplicador de tasa
  const [mulEnabled, setMulEnabled] = useState(false);
  const [mulValue, setMulValue] = useState('1');

  // Resultado
  const [resultado, setResultado] = useState(null);
  const [soloTasa, setSoloTasa] = useState(null);

  // Simulaciones con otras tasas (para el gráfico de barras)
  const [simulaciones, setSimulaciones] = useState(null);
  const [ventanaResumen, setVentanaResumen] = useState('1y'); // Último año por defecto

    // ===== Guardar en juicio =====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

// ===== Carga de índices desde FinancialData =====
useEffect(() => {
  const loadIndices = async () => {
    try {
      setIndicesError(null);

      const all = await FinancialData.list('-lastSync');

      const base = {
        activa: {},
        pasiva: {},
        cer: {},
        inflacion: {},
        smvm: {},
        ripte: {},
      };

      for (const fd of all || []) {
        const catRaw = fd.category || '';
        const cat = catRaw.toLowerCase();

        let targetKey = null;

        // TASAS DIARIAS
        if (cat.includes('tasa_activa')) targetKey = 'activa';
        if (cat === 'tasa_activa_bna') targetKey = 'activa';

        if (cat.includes('tasa_pasiva')) targetKey = 'pasiva';
        if (cat === 'tasa_pasiva_bcra') targetKey = 'pasiva';

        // CER
        if (cat === 'cer') targetKey = 'cer';

        // IPC → inflación
        if (cat === 'ipc_nivel_general' || cat.includes('ipc')) {
          targetKey = 'inflacion';
        }

        // SMVM & RIPTE
        if (cat === 'smvm' || cat.includes('smvm')) targetKey = 'smvm';
        if (cat === 'ripte') targetKey = 'ripte';

        if (!targetKey) continue;

        const headers = fd.headers || [];
        const headersLower = headers.map((h) =>
          (h || '').toString().toLowerCase()
        );

        // Columna de fecha
        const fechaIdx = headersLower.findIndex(
          (h) =>
            h.includes('fecha') ||
            h.includes('date') ||
            h.includes('periodo') ||
            h.includes('período') ||
            h.includes('mes')
        );

        // Columna de índice / valor
        const valorIdx = headersLower.findIndex((h) => {
          const tieneEtiquetaValor =
            h.includes('indice') ||
            h.includes('índice') ||
            h.includes('valor') ||
            h.includes('nivel') ||
            h.includes('ipc') ||
            h.includes('ripte') ||
            h.includes('smvm');

          const esVariacion =
            h.includes('variación') ||
            h.includes('variacion') ||
            h.includes('mensual') ||
            h.includes('interanual') ||
            h.includes('%');

          return tieneEtiquetaValor && !esVariacion;
        });

        if (fechaIdx === -1 || valorIdx === -1) continue;

        for (const row of fd.data || []) {
          const rawFecha = row[fechaIdx];
          const rawValor = row[valorIdx];
          if (!rawFecha || rawValor == null) continue;

          const fechaStr = String(rawFecha).trim();
          const valor = parseFloat(
            String(rawValor).replace(/\./g, '').replace(',', '.')
          );
          if (isNaN(valor)) continue;

          // ===== Índices MENSUALES tipo IPC / SMVM / RIPTE =====
          if (['inflacion', 'smvm', 'ripte'].includes(targetKey)) {
            // Acepta "jul-94", "jul-12", "ene-24", etc.
            const parsedISO = parseFechaIPC(fechaStr);
            if (parsedISO) {
              const d = new Date(parsedISO);
              const claveMes = `${d.getFullYear()}-${String(
                d.getMonth() + 1
              ).padStart(2, '0')}`;
              base[targetKey][claveMes] = valor;
              continue;
            }

            // Si no lo pudo parsear como "jul-94", probamos formato YYYY-MM / YYYY-MM-DD
            const lower = fechaStr.toLowerCase();
            let claveMes = null;

            if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
              claveMes = lower.slice(0, 7);
            } else if (/^\d{4}-\d{2}$/.test(lower)) {
              claveMes = lower;
            } else {
              // último recurso: tal como viene
              claveMes = lower;
            }

            base[targetKey][claveMes] = valor;
            continue;
          }

          // ===== Índices DIARIOS: activa, pasiva, cer =====
          if (['activa', 'pasiva', 'cer'].includes(targetKey)) {
            base[targetKey][fechaStr] = valor;
          } else {
            // Otro mensual genérico (por si aparece algo más)
            const lower = fechaStr.toLowerCase();
            let claveMes = null;

            if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
              claveMes = lower.slice(0, 7);
            } else if (/^\d{4}-\d{2}$/.test(lower)) {
              claveMes = lower;
            } else {
              claveMes = lower;
            }

            base[targetKey][claveMes] = valor;
          }
        }
      }

      setIndices(base);

      // Si querés debug:
      // console.log('IPC:', Object.keys(base.inflacion).slice(0,5));
      // console.log('SMVM:', Object.keys(base.smvm).slice(0,5));
      // console.log('RIPTE:', Object.keys(base.ripte).slice(0,5));
    } catch (e) {
      console.error('Error cargando índices en CalculadoraActualizacion:', e);
      setIndicesError('No se pudieron cargar los índices desde FinancialData.');
    }
  };

  loadIndices();
}, []);

  // ===== Cargar juicios del usuario cuando se abre el diálogo =====
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
        console.error('Error cargando juicios:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

// 👇 Pegá acá
const resumenIndices = React.useMemo(() => {
  if (!indices) return [];
  return calcularResumenIndices(indices, ventanaResumen);
}, [indices, ventanaResumen]);

  // ===== Helpers UI: capitales, pagos, capitalizaciones =====

  const agregarCapital = () => {
    setCapitales((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        fechaInicio: '',
        capital: '',
        intereses: '',
      },
    ]);
  };

  const actualizarCapital = (id, campo, valor) => {
    setCapitales((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  };

  const eliminarCapital = (id) => {
    setCapitales((prev) => prev.filter((c) => c.id !== id));
  };

  const agregarCapitalizacion = () => {
    setCapitalizaciones((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, fecha: '' },
    ]);
  };

  const actualizarCapitalizacion = (id, fecha) => {
    setCapitalizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, fecha } : c)));
  };

  const eliminarCapitalizacion = (id) => {
    setCapitalizaciones((prev) => prev.filter((c) => c.id !== id));
  };

  const agregarPago = () => {
    setPagos((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, fecha: '', monto: '' },
    ]);
  };

  const actualizarPago = (id, campo, valor) => {
    setPagos((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  const eliminarPago = (id) => {
    setPagos((prev) => prev.filter((p) => p.id !== id));
  };

  // ===== Cálculo principal =====

  const handleCalcular = () => {
    // 🔄 limpiar advertencias de cálculos anteriores
  setIndicesError(null);
    if (!fechaFinal) {
      alert('Por favor ingresá la fecha final.');
      return;
    }

    if (!indices) {
      alert('Todavía no se cargaron los índices.');
      return;
    }

    // Capitales numéricos
    const capitalesHistoricos = capitales
      .map((c) => ({
        id: c.id,
        fechaInicio: c.fechaInicio,
        capital: parseNumberInput(c.capital),
        intereses: parseNumberInput(c.intereses),
      }))
      .filter((c) => c.fechaInicio); // requerimos fecha

    if (capitalesHistoricos.length === 0) {
      alert('Ingresá al menos un capital histórico con fecha de inicio.');
      return;
    }

    // Ordenarlos por fecha
    capitalesHistoricos.sort(
      (a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)
    );

    if (new Date(fechaFinal) < new Date(capitalesHistoricos[0].fechaInicio)) {
      alert('La fecha final no puede ser anterior a la primera fecha de inicio.');
      return;
    }

    const extraNum = parseFloat(
      (extraPuro || '').toString().replace(/\./g, '').replace(',', '.')
    ) || 0;

    const multiplica = {
      enabled: mulEnabled,
      value: parseFloat(mulValue) || 1,
    };

    // Detectar "solo tasa": todos capitales e intereses = 0
    const esSoloTasa = capitalesHistoricos.every(
      (c) => c.capital === 0 && c.intereses === 0
    );

    const fechaMin = capitalesHistoricos[0].fechaInicio;
    // 👇 NUEVO: contenedor local de advertencias
    const advertencias = [];
    if (esSoloTasa) {
      const t = getTasaPorTipoTramo(
        tipoTasa,
        fechaMin,
        fechaFinal,
        indices,
        extraNum,
        multiplica
      );
      if (t === null) {
        setResultado(null);
        setSoloTasa({
          tasa: null,
          mensaje: 'No hay datos de índices para el período seleccionado.',
        });
        setSimulaciones(null);
        return;
      }
      setResultado(null);
      setSoloTasa({
        tasa: t,
        mensaje:
          'Cálculo de tasa devengada sobre el período (sin monto; todos los capitales están en cero).',
      });
      setSimulaciones(null);
      return;
    }

    // 💡 Validación general: si no hay índice para TODO el período, devolver 0
const tasaTest = getTasaPorTipoTramo(
  tipoTasa,
  fechaMin,
  fechaFinal,
  indices,
  extraNum,
  multiplica
);

if (tasaTest === null) {
  advertencias.push(
    `⚠️ No hay datos del índice seleccionado para el período ${formatFechaDDMMYYYY(fechaMin)} → ${formatFechaDDMMYYYY(fechaFinal)}.`
  );

  const resultadoCero = {
    capitalActual: 0,
    interesesAdeudados: 0,
    interesesDevengados: 0,
    historial: [],
    capitales: [],
  };

  setResultado({
    ...resultadoCero,
    capitalesHistoricos,
    fechaFinal,
    tipoTasa,
    extraNum,
    multiplica,
  });

  setSoloTasa(null);
  setSimulaciones(null);

  // dejar grabadas SOLO las advertencias de este cálculo
  setIndicesError(advertencias.join('\n'));
  return;
}

    // Construir eventos (capitalización + pagos + fin)
    const eventos = [];

    capitalizaciones.forEach((c) => {
      if (c.fecha) eventos.push({ tipo: 'capitalizacion', fecha: c.fecha });
    });

pagos.forEach((p) => {
  if (p.fecha && parseNumberInput(p.monto) > 0) {
    eventos.push({
      tipo: 'pago',
      fecha: p.fecha,
      monto: parseNumberInput(p.monto),
    });
  }
});

    eventos.push({ tipo: 'fin', fecha: fechaFinal });

    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Calcular evolución completa con la tasa seleccionada
    const res = calcularEvolucionCapitales(
      capitalesHistoricos,
      tipoTasa,
      eventos,
      indices,
      extraNum,
      multiplica
    );

    const resultadoFinal = {
      ...res,
      capitalesHistoricos,
      fechaFinal,
      tipoTasa,
      extraNum,
      multiplica,
    };

// ---- Simulaciones con otras tasas para el gráfico de barras ----
const tiposComparacionBase = ['activa', 'pasiva', 'cer', 'inflacion', 'smvm', 'ripte'];

const sims = [];

// Usamos mismo esquema de eventos y capitales, sin interés puro adicional
const multiplicaSim = {
  enabled: mulEnabled,
  value: parseFloat(mulValue) || 1,
};

for (const t of tiposComparacionBase) {
  // 1) Test global: ¿hay índices para TODO el período?
  const tasaGlobal = getTasaPorTipoTramo(
    t,
    fechaMin,     // la misma fechaMin que usaste arriba
    fechaFinal,
    indices,
    0,            // sin extra
    multiplicaSim
  );

  // Si no hay índice para ese tipo en el tramo completo, mostramos 0 en el gráfico
if (tasaGlobal === null) {
  setIndicesError(
    prev =>
      (prev ?? '') +
      `⚠️ No hay datos para la tasa “${t.toUpperCase()}” en el período ${formatFechaDDMMYYYY(fechaMin)} → ${formatFechaDDMMYYYY(fechaFinal)}.`
  );

  sims.push({
    tipo: t,
    total: 0,
  });
  continue;
}

  // 2) Si hay índices, calculamos normalmente la evolución
  const resSim = calcularEvolucionCapitales(
    capitalesHistoricos,
    t,
    eventos,
    indices,
    0, // sin interés puro adicional
    multiplicaSim
  );

  const totalSim =
    resSim.capitalActual +
    resSim.interesesAdeudados +
    resSim.interesesDevengados;

  sims.push({
    tipo: t,
    total: totalSim,
  });
}

    setSoloTasa(null);
    setResultado(resultadoFinal);
    setSimulaciones(sims);
    // Mensajes de este cálculo solamente
    if (advertencias.length > 0) {
    setIndicesError(advertencias.join('\n'));
    } else {
    setIndicesError(null);
}

  };

    const handleOpenSaveDialog = () => {
    if (!resultado && !soloTasa) {
      alert('Primero calculá la actualización (o la tasa) para poder guardarla en un juicio.');
      return;
    }

    // Título sugerido
    const fechaLabel = fechaFinal ? formatFechaDDMMYYYY(fechaFinal) : '';
    const defaultTitle = resultado
      ? `Actualización al ${fechaLabel}`
      : `Simulación de tasa al ${fechaLabel}`;

    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    if (!resultado && !soloTasa) {
      alert('No hay cálculo para guardar.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const payload = {
        tipo: 'actualizacion',
        entrada: {
          capitales,
          fechaFinal,
          tipoTasa,
          extraPuro,
          mulEnabled,
          mulValue,
          capitalizaciones,
          pagos,
        },
        resultado,
        soloTasa,
        simulaciones,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId,
        toolName: toolName || 'Calculadora de actualización',
        title: saveTitle || `Actualización al ${formatFechaDDMMYYYY(fechaFinal)}`,
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


  const handleLimpiar = () => {
    setCapitales([{ id: 1, fechaInicio: '', capital: '', intereses: '' }]);
    setFechaFinal('');
    setTipoTasa('activa');
    setExtraPuro('');
    setCapitalizaciones([]);
    setPagos([]);
    setMulEnabled(false);
    setMulValue('1');
    setResultado(null);
    setSoloTasa(null);
    setSimulaciones(null);
    setIndicesError(null);
  };

  // ===== Exportar a PDF (similar a Ajuste por Inflación) =====

  // ===== Exportar a PDF (similar a Ajuste por Inflación) =====

  const tipoEsExtra =
    tipoTasa === 'inflacion_extra' || tipoTasa === 'cer_extra';

  // Suma de capitales iniciales
  const baseInicialCapital = resultado
    ? resultado.capitalesHistoricos.reduce((s, c) => s + c.capital, 0)
    : 0;

  // Suma de intereses iniciales
  const baseInicialIntereses = resultado
    ? resultado.capitalesHistoricos.reduce((s, c) => s + c.intereses, 0)
    : 0;

  // Total final al cierre del período
  const totalFinal = resultado
    ? resultado.capitalActual +
      resultado.interesesAdeudados +
      resultado.interesesDevengados
    : 0;

  return (
<div className="space-y-6 max-w-5xl mx-auto px-3">

{/* PANEL DE ÍNDICES · ESTILO HERO */}
<Card className="mb-6 border border-slate-200 shadow-sm overflow-hidden">
  <CardHeader className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <CardTitle className="text-lg md:text-xl">
          Últimas fechas de cada índice
        </CardTitle>
        <CardDescription className="text-slate-100/90 mt-1">
          Valores recientes y variación acumulada según la ventana seleccionada.
        </CardDescription>
      </div>

      <div className="flex items-center gap-2 justify-center">
        <span className="text-sm text-slate-100/80">Ventana:</span>
        <Select value={ventanaResumen} onValueChange={setVentanaResumen}>
          <SelectTrigger className="w-[180px] bg-white/10 border-white/40 text-white">
            <SelectValue placeholder="Seleccioná ventana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Último mes</SelectItem>
            <SelectItem value="3m">Último trimestre</SelectItem>
            <SelectItem value="6m">Último semestre</SelectItem>
            <SelectItem value="1y">Último año</SelectItem>
            <SelectItem value="3y">Últimos 3 años</SelectItem>
            <SelectItem value="5y">Últimos 5 años</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0">
    <div className="overflow-x-auto">
<table className="min-w-full text-xs md:text-sm border-collapse overflow-hidden">
  <thead>
    <tr className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white text-center">
      <th className="px-4 py-3 font-semibold text-center">
        Índice / Tasa
      </th>
      <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
        Fecha última actualización
      </th>
      <th className="px-4 py-3 font-semibold text-center">
        Valor
      </th>
      <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
        Variación acumulada · {labelVentanaResumen(ventanaResumen)}
      </th>
    </tr>
  </thead>

  <tbody className="divide-y divide-slate-200 bg-white text-center">
    {resumenIndices.length === 0 && (
      <tr>
        <td colSpan={4} className="px-4 py-4 text-slate-500 text-center">
          No se encontraron índices cargados.
        </td>
      </tr>
    )}

    {resumenIndices.map((row) => (
      <tr
        key={row.tipo}
        className="hover:bg-slate-50 transition-colors text-center"
      >
        <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-center">
          {row.nombre}
        </td>

        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-center">
          {row.fechaLabel || '—'}
        </td>

        <td className="px-4 py-3 text-slate-700 text-center">
          {row.valorLabel}
        </td>

        <td className="px-4 py-3 font-semibold text-[#0f2f4b] text-center">
          {row.variacion != null
            ? formatearPorcentajeNumero(row.variacion)
            : '—'}
        </td>
      </tr>
    ))}
  </tbody>
</table>
    </div>
  </CardContent>
</Card>

  <Card className="border border-slate-200 shadow-sm">

    {/* ENCABEZADO PRINCIPAL */}
    <CardHeader className="bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#173d5f] text-white rounded-t-xl">
      <CardTitle className="text-xl md:text-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <span className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          {toolName || 'Calculadora de actualización'}
        </span>
        <span className="text-sm font-normal opacity-90">
        
        </span>
      </CardTitle>

<CardDescription className="text-slate-100/90 mt-2">
  Con esta herramienta podrás conocer los intereses y actualizar los honorarios o cualquier otro capital,
  ajustado por tasa activa BNA a 30 días, 
  tasa pasiva promedio BCRA, o variación de SMVM, IPC Nivel General, CER y RIPTE.  
  Incorpora al análisis la capitalización de intereses y pagos parciales.  
  <br />
  <span className="opacity-90">
    <span className="font-bold">Fuente:</span>&nbsp;
    <a 
      href="https://www.argentina.gob.ar/trabajo/seguridadsocial/ripte" 
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      Subsecretaría de Seguridad Social
    </a>,&nbsp;
    <a 
      href="https://www.argentina.gob.ar/trabajo/consejodelsalario"
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      Consejo SMVM
    </a>,&nbsp;
    <a 
      href="https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero"
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      Banco Nación
    </a>,&nbsp;
    <a 
      href="https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp"
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      BCRA
    </a>,&nbsp;
    <a 
      href="https://www.indec.gob.ar/"
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-white"
    >
      INDEC
    </a>.
  </span>
</CardDescription>

    </CardHeader>

    {/* CONTENIDO PRINCIPAL */}
    <CardContent className="p-4 md:p-6 space-y-6">
      {indicesError && (
        <div className="p-3 rounded-md bg-yellow-50 border border-yellow-300 text-sm text-yellow-900 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>{indicesError}</span>
        </div>
      )}

          {/* === 1. Capitales históricos === */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold text-[#0f2f4b]">
                Capitales históricos
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarCapital}
              >
                + Agregar capital
              </Button>
            </div>
            <div className="space-y-3">
              {capitales.map((c, idx) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#0f2f4b] bg-[#E8F4FB] p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 uppercase">
                      Capital #{idx + 1}
                    </span>
                    {capitales.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => eliminarCapital(c.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <DollarSign className="h-3 w-3" />
                        Capital histórico
                      </Label>
                      <Input
                        value={c.capital}
                        onChange={(e) =>
                          actualizarCapital(c.id, "capital", formatNumberInput(e.target.value))
                        }
                        placeholder="$ 0,00"
                        className="text-left bg-white border border-slate-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        Intereses no capitalizados
                      </Label>
                      <Input
                        value={c.intereses}
                        onChange={(e) =>
                          actualizarCapital(c.id, 'intereses', formatNumberInput(e.target.value))
                        }
                        placeholder="$ 0,00"
                        className="bg-white border border-slate-300 text-left rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        Fecha de inicio
                      </Label>
                      <Input
                        type="date"
                        value={c.fechaInicio}
                        onChange={(e) =>
                          actualizarCapital(c.id, 'fechaInicio', e.target.value)
                        }
                        className="bg-white border border-slate-300 text-left rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === 2. Parámetros de tasa === */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <Label>Fecha final</Label>
              <Input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
              />
            </div>
            
<div className="space-y-1">
  <Label>Tipo de tasa</Label>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {OPCIONES_TIPO_TASA.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => setTipoTasa(opt.value)}
        className={`
          w-full px-3 py-2 rounded-xl text-xs md:text-sm font-semibold border transition-all
          ${
            tipoTasa === opt.value
              ? 'bg-[#E8F4FB] text-[#0f2f4b] border-[#0f2f4b] shadow-[0_0_0_1px_rgba(15,47,75,0.4)]'
              : 'bg-white text-[#0f2f4b] border-[#D0E4F4] hover:bg-[#F3F8FC] hover:border-[#5EA6D7]'
          }
        `}
      >
        {opt.label}
      </button>
    ))}
  </div>

  <p className="text-[11px] text-slate-500">
    Hacé clic para elegir la serie que se usará para actualizar.
  </p>
</div>
            
{tipoEsExtra && (
  <div className="space-y-1">
    <Label className="flex items-center gap-1">
      <Percent className="h-4 w-4" />
      Interés puro adicional (% anual)
    </Label>
    <Input
      placeholder="Ej: 6,00"
      value={extraPuro}
      onChange={(e) => setExtraPuro(e.target.value)}
      className="text-left"
    />
    <p className="text-[11px] text-slate-500">
      Se aplica como tasa pura anual sobre el período,
      adicional al IPC o al CER.
    </p>
  </div>
)}
          </div>

          {/* === 3. Multiplicador de tasa === */}
          <div className="border rounded-lg p-3 bg-slate-50 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm">✨ Multiplicador de tasa</Label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={mulEnabled}
                  onChange={(e) => setMulEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[#5EA6D7] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Select
                value={mulValue}
                onValueChange={setMulValue}
                disabled={!mulEnabled}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1,00× (sin multiplicar)</SelectItem>
                  <SelectItem value="1.25">1,25×</SelectItem>
                  <SelectItem value="1.5">1,50×</SelectItem>
                  <SelectItem value="1.75">1,75×</SelectItem>
                  <SelectItem value="2">2,00×</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Se aplica sobre la tasa total de cada tramo.
              </p>
            </div>
          </div>

          {/* === 4. Fechas de capitalización y pagos === */}
          <div className="grid grid-cols-1 gap-4">
            {/* Capitalizaciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-[#0f2f4b]">
                  🔁 Fechas de capitalización
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarCapitalizacion}
                >
                  + Agregar fecha/s de capitalización
                </Button>
              </div>
              <div className="space-y-2">
                {capitalizaciones.length === 0 && (
                  <p className="text-xs text-slate-400">
                    (Opcional) Sumará los intereses adeudados/devengados al capital
                    en la/s fecha/s indicada/s.
                  </p>
                )}
{capitalizaciones.map((c) => (
  <div
    key={c.id}
    className="rounded-2xl border border-[#0f2f4b] bg-[#E8F4FB] p-4 space-y-3"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-600 uppercase">
        Capitalización
      </span>

      <button
        type="button"
        className="text-xs text-red-600 hover:underline"
        onClick={() => eliminarCapitalizacion(c.id)}
      >
        Eliminar
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="flex items-center gap-1 text-xs">
          <CalendarIcon className="h-3 w-3" />
          Fecha de capitalización
        </Label>
        <Input
          type="date"
          value={c.fecha}
          onChange={(e) => actualizarCapitalizacion(c.id, e.target.value)}
          className="bg-white border border-slate-300 text-left rounded-md"
        />
      </div>
    </div>
  </div>
))}
              </div>
            </div>

            {/* Pagos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-[#0f2f4b]">
                  💰 Pagos a cuenta
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarPago}
                >
                  + Agregar pago
                </Button>
              </div>
              <div className="space-y-2">
                {pagos.length === 0 && (
                  <p className="text-xs text-slate-400">
                    (Opcional) Descontará primero intereses adeudados, luego devengados,
                    y por último capital.
                  </p>
                )}
{pagos.map((p) => (
  <div
    key={p.id}
    className="rounded-2xl border border-[#0f2f4b] bg-[#E8F4FB] p-4 space-y-3"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-600 uppercase">
        Pago
      </span>

      <button
        type="button"
        className="text-xs text-red-600 hover:underline"
        onClick={() => eliminarPago(p.id)}
      >
        Eliminar
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1">
        <Label className="flex items-center gap-1 text-xs">
          <CalendarIcon className="h-3 w-3" />
          Fecha del pago
        </Label>
        <Input
          type="date"
          value={p.fecha}
          onChange={(e) => actualizarPago(p.id, "fecha", e.target.value)}
          className="bg-white border border-slate-300 text-left rounded-md"
        />
      </div>

      <div className="space-y-1 md:col-span-2">
        <Label className="flex items-center gap-1 text-xs">
          <DollarSign className="h-3 w-3" />
          Monto del pago
        </Label>
        <Input
          placeholder="$ 0,00"
          value={p.monto}
          onChange={(e) =>
            actualizarPago(p.id, "monto", formatNumberInput(e.target.value))
          }
          className="bg-white border border-slate-300 text-left rounded-md"
        />
      </div>
    </div>
  </div>
))}
              </div>
            </div>
          </div>

          {/* Botones principales */}
          {/* Botones principales + Guardar en juicio */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <Button variant="outline" onClick={handleLimpiar}>
                Limpiar
              </Button>

              <Button onClick={handleCalcular}>
                Calcular actualización
              </Button>

              {/* Botón para abrir el diálogo de guardado */}
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  onClick={handleOpenSaveDialog}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Guardar en juicio
                </Button>
              </DialogTrigger>
            </div>

            {/* Contenido del diálogo */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Guardar cálculo en un juicio</DialogTitle>
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
                    <p className="text-xs text-red-600 mt-1">{loadCasesError}</p>
                  )}
                </div>

                {/* Título */}
                <div className="space-y-1">
                  <Label>Título del cálculo</Label>
                  <Input
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Ej: Actualización al 30/11/2025 – tasa activa"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Notas sobre supuestos, artículos aplicados, particularidades del caso..."
                  />
                </div>

                {/* Mini resumen del monto final si hay resultado */}
                {resultado && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2">
                    <p className="font-semibold mb-1">Resumen</p>
                    <p>
                      Monto actualizado al cierre:{' '}
                      <span className="font-bold text-[#0f2f4b]">
                        {formatearMontoARS(totalFinal)}
                      </span>
                    </p>
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

          {/* === Resultado solo tasa === */}
          {soloTasa && (
            <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-sm text-slate-700 mb-1">
                {soloTasa.mensaje}
              </p>
              {soloTasa.tasa !== null ? (
                <p className="text-2xl font-bold text-[#0f2f4b]">
                  {formatearPorcentajeNumero(soloTasa.tasa)}
                </p>
              ) : (
                <p className="text-red-600 font-semibold">
                  No se pudo calcular la tasa con los índices disponibles.
                </p>
              )}
            </div>
          )}

          {/* === Resultado completo === */}
          {resultado && (
            <>
              {/* Resumen + base inicial + intereses devengados */}
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                    Resumen del período
                  </p>
                  <p className="text-sm text-slate-700">
                    Desde{' '}
                    <span className="font-semibold">
                      {formatearFechaArg(
                        resultado.capitalesHistoricos[0].fechaInicio
                      )}
                    </span>{' '}
                    hasta{' '}
                    <span className="font-semibold">
                      {formatearFechaArg(resultado.fechaFinal)}
                    </span>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Base inicial */}
                  <div className="p-4 rounded-lg bg-[#E8F4FB] border border-[#5EA6D7]/60 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      Base inicial
                    </p>
                    <p className="text-sm text-slate-600">
                      Capitales:{' '}
                      <span className="font-semibold">
                        {formatearMontoARS(baseInicialCapital)}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      Intereses adeudados:{' '}
                      <span className="font-semibold">
                        {formatearMontoARS(baseInicialIntereses)}
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Total base:{' '}
                      <span className="font-bold">
                        {formatearMontoARS(
                          baseInicialCapital + baseInicialIntereses
                        )}
                      </span>
                    </p>
                  </div>

                  {/* Intereses devengados */}
                  <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      Interés devengado no capitalizado
                    </p>
                    <p className="text-2xl font-bold text-[#0f2f4b]">
                      {formatearMontoARS(resultado.interesesDevengados)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Resultado del devengamiento según la tasa seleccionada,
                      eventos de capitalización y pagos.
                    </p>
                  </div>
                </div>
              </div>


              {/* BLOQUE QUE SE CAPTURA COMO IMAGEN (HERO + DETALLE + GRÁFICO) */}
              <div className="mt-6 space-y-6">
                {/* MONTO ACTUALIZADO · HERO FINFOCUS */}
                <div className="p-6 rounded-2xl shadow-md bg-gradient-to-r from-[#0f2f4b] via-[#173d5f] to-[#0f2f4b] text-white text-center space-y-2">
                  <p className="text-sm font-medium tracking-wide text-white/90">
                    MONTO ACTUALIZADO
                  </p>

                  <p className="text-3xl md:text-4xl font-extrabold drop-shadow-sm">
                    {formatearMontoARS(totalFinal)}
                  </p>

                  <p className="text-xs md:text-sm text-white/80">
                    Capital vigente + Intereses adeudados + Intereses devengados
                    <br />
                    al {formatearFechaArg(resultado.fechaFinal)}.
                  </p>
                </div>

                {/* DETALLE DE LOS PASOS */}
                {renderDetalleEventos(resultado)}
                </div>

                {/* === Gráfico de barras: simulación del resultado con otras tasas === */}
                {simulaciones && simulaciones.length > 0 && (
                  <div className="mt-6 p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      SIMULACIÓN DEL RESULTADO CON OTRAS TASAS
                    </p>
                    <p className="text-xs text-slate-500 mb-6">
                      Monto actualizado usando cada una de las tasas de la serie
                      estadística.
                    </p>

                    {(() => {
                      // Paleta de colores estilo gráfico profesional
                      const paletteTasas = {
                        activa: '#3B82F6', // azul
                        pasiva: '#7C3AED', // violeta
                        ripte: '#10B981', // verde
                        smvm: '#F59E0B', // naranja
                        inflacion: '#EF4444', // rojo
                        cer: '#0EA5E9', // celeste
                        inflacion_extra: '#0F172A', // azul noche
                        cer_extra: '#BE185D', // magenta
                      };

                      const totales = simulaciones.map((s) => s.total);
                      const maxTotal = Math.max(
                        ...totales,
                        totalFinal || 0
                      ) || 1;

                      return (
                        <div className="w-full flex items-end justify-between gap-6">
                          {simulaciones.map((sim) => {
                            const alturaPct = Math.max(
                              8,
                              (sim.total / maxTotal) * 100
                            );
                            const colorBarra =
                              paletteTasas[sim.tipo] || '#5EA6D7';

                            return (
                              <div
                                key={sim.tipo}
                                className="flex flex-col items-center flex-1 min-w-[80px]"
                              >
                                {/* Contenedor de la barra */}
                                <div
                                  className="relative w-full bg-white rounded-lg flex items-end overflow-visible"
                                  style={{ height: '300px' }}
                                >
                                  {/* Barra */}
                                  <div
                                    className="relative w-full rounded-t-xl shadow-sm flex justify-center"
                                    style={{
                                      height: `${alturaPct}%`,
                                      backgroundColor: colorBarra,
                                    }}
                                  >
                                    {/* Etiqueta arriba de la barra */}
                                    <span className="absolute top-0 mt-[-18px] text-[12px] font-bold text-slate-700">
                                      {formatearMontoARS(sim.total)}
                                    </span>
                                  </div>
                                </div>

                                {/* Nombre de la tasa */}
                                <span className="mt-3 text-[12px] font-semibold text-slate-700 text-center">
                                  {labelTipoTasaCorta(sim.tipo)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
          )}

          {!soloTasa && !resultado && (
            <p className="text-xs text-slate-400">
              Ingresá los datos y hacé clic en{' '}
              <span className="font-semibold">Calcular actualización</span>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
