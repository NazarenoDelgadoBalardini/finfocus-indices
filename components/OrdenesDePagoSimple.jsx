// src/components/CalculadoraOrdenPagoSimple.jsx
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AZUL = '#0f2f4b';

// ====== Helpers de formato ======
const fmtARS = (n) =>
  ' $ ' +
  Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatCurrencyInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const num = parseFloat(digits) / 100;
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  });
};

const parseCurrency = (value) => {
  if (!value) return 0;
  const digits = String(value).replace(/\D/g, '');
  return digits ? parseFloat(digits) / 100 : 0;
};

export default function CalculadoraOrdenPagoSimple({ toolName }) {
  // ====== State ======
  const [montoInput, setMontoInput] = useState('$ 250.000,00');
  const [esRI, setEsRI] = useState(false);
  const [aplica10, setAplica10] = useState(true);

  // ====== Handlers ======
  const handleMontoChange = (e) => {
    const raw = e.target.value;
    const formatted = formatCurrencyInput(raw);
    setMontoInput(formatted);
  };

  // ====== Cálculo principal (mismo criterio que tu JS) ======
  const {
    honor,
    iva,
    ret8,
    ret10,
    totalPro,
    totalCaja,
    detalleProTexto,
  } = useMemo(() => {
    const monto = parseCurrency(montoInput); // número en ARS
    const IVA = 0.21;
    const AP8 = 0.08;
    const AP10 = 0.1;

    const denom = 1 + (esRI ? IVA : 0) + (aplica10 ? 0.1 : 0); // 1; 1.21; 1.31; etc.
    const base = denom === 0 ? 0 : monto / denom;

    const honorarios = base;
    const ivaCalc = esRI ? base * IVA : 0;
    const retencion8 = base * AP8;
    const retencion10 = aplica10 ? base * AP10 : 0;

    const totalProfesional = honorarios + ivaCalc - retencion8;
    const totalCajaAbogados = retencion8 + retencion10;

    let detalle = `(${fmtARS(honorarios)}`;
    if (ivaCalc > 0) detalle += ` + ${fmtARS(ivaCalc)}`;
    if (retencion8 > 0) detalle += ` – ${fmtARS(retencion8)}`;
    detalle += `)`;

    return {
      honor: honorarios,
      iva: ivaCalc,
      ret8: retencion8,
      ret10: retencion10,
      totalPro: totalProfesional,
      totalCaja: totalCajaAbogados,
      detalleProTexto: detalle,
    };
  }, [montoInput, esRI, aplica10]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-4">
      {/* Título */}
      <h1 className="text-2xl font-bold" style={{ color: AZUL }}>
        {toolName || ''}
      </h1>

      {/* 1) Datos */}
      <Card className="border-l-4" style={{ borderLeftColor: AZUL }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base" style={{ color: AZUL }}>
            1) Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Monto total depositado */}
            <div>
              <Label
                htmlFor="montoTotal"
                className="font-semibold text-slate-700"
              >
                Total depositado
              </Label>
              <Input
                id="montoTotal"
                type="text"
                inputMode="numeric"
                placeholder="$ 0,00"
                className="mt-1 text-lg font-semibold text-[#0f2f4b]"
                value={montoInput}
                onChange={handleMontoChange}
              />
            </div>

            {/* Switches */}
            <div className="flex flex-col gap-3 justify-center">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={esRI}
                  onChange={(e) => setEsRI(e.target.checked)}
                />
                Responsable inscripto
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={aplica10}
                  onChange={(e) => setAplica10(e.target.checked)}
                />
                Aportes (10%)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2 columnas: Profesional / Caja */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Orden de pago al profesional */}
        <Card className="bg-emerald-50 border-l-4 border-emerald-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-900">
              2) Orden de pago al profesional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
              <div className="text-slate-700">Honorarios (base)</div>
              <div className="font-semibold text-[#0f2f4b]">
                {fmtARS(honor)}
              </div>

              <div className="text-slate-700">IVA (21%)</div>
              <div className="font-semibold text-[#0f2f4b]">
                {fmtARS(iva)}
              </div>

              <div className="text-slate-700">− Aportes 8%</div>
              <div className="font-semibold text-[#0f2f4b]">
                {fmtARS(ret8)}
              </div>

              <div className="col-span-2 my-2 h-px bg-slate-200" />

              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-[#0f2f4b]">
                  TOTAL a profesional
                </span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-[#0f2f4b]">
                  {fmtARS(totalPro)}
                </div>
                <div className="text-[0.7rem] text-slate-500 mt-1">
                  {detalleProTexto}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caja de abogados previsional */}
        <Card className="bg-amber-50 border-l-4 border-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900">
              3) Caja de abogados previsional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
              <div className="text-slate-700">Aportes 8%</div>
              <div className="font-semibold text-[#0f2f4b]">
                {fmtARS(ret8)}
              </div>

              <div className="text-slate-700">
                Aportes 10% (si aplica)
              </div>
              <div className="font-semibold text-[#0f2f4b]">
                {fmtARS(ret10)}
              </div>

              <div className="col-span-2 my-2 h-px bg-slate-200" />

              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-[#0f2f4b]">
                  TOTAL a Caja de abogados previsional
                </span>
              </div>
              <div className="font-bold text-lg text-[#0f2f4b] text-right">
                {fmtARS(totalCaja)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-center text-slate-500 mt-2">
        Los aportes se calculan sobre la base de honorarios netos (sin IVA).
        El 8% se descuenta del pago al profesional y se deposita en la Caja.
      </p>
    </div>
  );
}
