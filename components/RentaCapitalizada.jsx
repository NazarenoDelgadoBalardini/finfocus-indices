import React, { useEffect, useState } from 'react';
import { getFinancialData } from "@/utils/FinancialDataSync";

// ==== Imports para GUARDAR EN JUICIO ====
import { Case } from '@/entities/Case';
import { User } from '@/entities/User';
import { CalculatorResult } from '@/entities/CalculatorResult';

import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

// ================== Helpers de fechas / SMVM ==================
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function kToDateSMVM(k) {
  // esperamos claves tipo "sep-24"
  const [mmm, yy] = k.split("-");
  const m = MESES.indexOf(mmm.toLowerCase());
  if (m < 0) return null;
  const y = (parseInt(yy, 10) > 50 ? 1900 : 2000) + parseInt(yy, 10);
  return new Date(y, m, 1);
}

function sortKeysSMVM(obj) {
  return Object.keys(obj).sort((a, b) => {
    const da = kToDateSMVM(a);
    const db = kToDateSMVM(b);
    if (!da || !db) return 0;
    return da - db;
  });
}

function keyOnOrBefore(obj, date) {
  const ks = sortKeysSMVM(obj);
  let res = null;
  for (const k of ks) {
    const kd = kToDateSMVM(k);
    if (!kd) continue;
    if (kd <= date) res = k; else break;
  }
  return res;
}

function kFmt(k) {
  // "sep-24" → "sep-24" tal cual
  return k.toLowerCase();
}

// convierte "sep-24" a Date
function parseMMMYY(k) {
  const [mmm, yy] = k.split("-");
  const m = MESES.indexOf(mmm.toLowerCase());
  const y = (parseInt(yy,10) > 50 ? 1900 : 2000) + parseInt(yy,10);
  return new Date(y, m, 1);
}

// devuelve la clave SMVM vigente "on or before"
function smvmOnDate(date, dataset) {
  if (!dataset) return null;

  const matches = Object.keys(dataset)
    .filter(k => /^\w{3}-\d{2}$/.test(k))
    .sort((a,b) => parseMMMYY(a) - parseMMMYY(b));

  let found = null;
  for (const k of matches) {
    if (parseMMMYY(k) <= date) found = k;
    else break;
  }
  return found ? { clave: found, valor: dataset[found] } : null;
}

const nfMoney = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});
const nfPct2 = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// helper fecha DD-MM-YYYY (para guardar en juicio)
function formatDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// ================== Helpers comunes ==================
function parseMoney(value) {
  if (!value) return 0;
  const n = Number(
    value
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
  return Number.isFinite(n) ? n : 0;
}

function parsePct(value) {
  if (!value) return 0;
  const n = Number(
    value
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
  return Number.isFinite(n) ? n / 100 : 0;
}

function rentaCapitalizada(a, n, i) {
  if (!(i > 0) || !(n > 0)) return { Vn: NaN, factor: NaN, C: NaN };
  const Vn = 1 / Math.pow(1 + i, n);
  const factor = (1 - Vn) / i;
  return { Vn, factor, C: a * factor };
}

function daysBetween(a, b) {
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

// ================== Panel explicativo FINFOCUS ==================
function PanelExplicativo() {
  return (
    <div className="max-w-4xl mx-auto mb-6 bg-white border border-slate-100 rounded-2xl shadow-md px-5 py-4">
      <div className="flex items-center justify-center gap-2 mb-4 text-[#0f2f4b]">
        <span className="w-8 h-8 rounded-full bg-[#5EA6D7] text-white flex items-center justify-center font-extrabold shadow-md text-sm">
          ℹ
        </span>
        <h2 className="font-extrabold text-[1.05rem] text-center">
          Cómo influyen las variables en la indemnización
        </h2>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {/* Expectativa de vida */}
        <div className="flex flex-col bg-[#F4F9FD] border border-[#D0E7F5] rounded-xl p-4 max-w-xs flex-1 min-w-[220px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F1FA] border border-[#D4E3F2] flex items-center justify-center text-lg font-bold text-[#0f2f4b]">
              📅
            </div>
            <div>
              <div className="font-extrabold text-[#0f2f4b] text-sm">Expectativa de vida</div>
              <div className="text-xs text-[#0f2f4b]/80">
                Más años ⇒ más períodos a resarcir ⇒ capital más alto.
              </div>
            </div>
          </div>
          <div className="mt-3 bg-white border border-dashed border-[#cfe1f0] rounded-lg px-3 py-2 text-xs text-[#0f2f4b]">
            En la fórmula <span className="">C = a × (1 − Vⁿ) / i</span>,{' '}
            <b>n</b> representa los años a compensar. Si la expectativa de vida aumenta,{' '}
            <span className="">n</span> también lo hace, y el factor{' '}
            <span className="">(1 − Vⁿ) / i</span> crece.
            <div className="mt-1 text-[11px] text-[#0f2f4b]/80">
              💡 Resultado: <b>la indemnización aumenta</b>. Ejemplo: pasar de 70 a 76 años
              agrega 6 períodos más a resarcir.
            </div>
          </div>
        </div>

        {/* % de incapacidad */}
        <div className="flex flex-col bg-[#F4F9FD] border border-[#D0E7F5] rounded-xl p-4 max-w-xs flex-1 min-w-[220px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F1FA] border border-[#D4E3F2] flex items-center justify-center text-lg font-bold text-[#0f2f4b]">
              💪
            </div>
            <div>
              <div className="font-extrabold text-[#0f2f4b] text-sm">% de incapacidad</div>
              <div className="text-xs text-[#0f2f4b]/80">
                A mayor incapacidad ⇒ mayor pérdida de ingresos ⇒ capital más alto.
              </div>
            </div>
          </div>
          <div className="mt-3 bg-white border border-dashed border-[#cfe1f0] rounded-lg px-3 py-2 text-xs text-[#0f2f4b]">
            La base anual <span className="">a</span> = salario × 13 × %incapacidad. Si
            la incapacidad sube, <span className="">a</span> también.
            <div className="mt-1 text[11px] text-[#0f2f4b]/80">
              💡 Resultado: <b>la indemnización crece de forma proporcional</b>. Ejemplo:
              duplicar el % de incapacidad duplica la base y el capital.
            </div>
          </div>
        </div>

        {/* Tasa anual (i) */}
        <div className="flex flex-col bg-[#F4F9FD] border border-[#D0E7F5] rounded-xl p-4 max-w-xs flex-1 min-w-[220px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F1FA] border border-[#D4E3F2] flex items-center justify-center text-lg font-bold text-[#0f2f4b]">
              📈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="font-extrabold text-[#0f2f4b] text-sm">Tasa anual (i)</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#D4E3F2] text-[#0f2f4b]">
                  Tasa de descuento
                </span>
              </div>
              <div className="text-xs text-[#0f2f4b]/80">
                A mayor tasa de descuento ⇒ menor valor presente de la renta futura.
              </div>
            </div>
          </div>
          <div className="mt-3 bg-white border border-dashed border-[#cfe1f0] rounded-lg px-3 py-2 text-xs text-[#0f2f4b]">
            La tasa <span className="">i</span> no se usa para “hacer crecer” el
            capital, sino para <b>descontar</b> las rentas futuras a valor presente.
            Si la tasa es alta, el valor actual de cada renta futura es menor, y por eso{' '}
            <b>el capital indemnizatorio baja</b>. Si la tasa es baja, las rentas futuras se
            descuentan menos, y <b>el capital presente sube</b>.
            <div className="mt-1 text-[11px] text-[#0f2f4b]/80">
              Ejemplo: una renta de $100.000 en 10 años vale mucho menos hoy si se descuenta
              al 10% anual que al 2%.
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-[#0f2f4b]/85">
        💡 En resumen: <b>más años</b> y <b>mayor incapacidad</b> elevan la indemnización; una{' '}
        <b>tasa más baja</b> (tasa de descuento) también la aumenta.
      </p>
    </div>
  );
}

// ================== Componente principal ==================
export default function RentaPeriodica() {
  // Inputs
  const [fecNac, setFecNac] = useState('1992-11-15');
  const [fecAcc, setFecAcc] = useState('2022-03-18');
  const [edad, setEdad] = useState('');
  const [salario, setSalario] = useState('');
  const [incap, setIncap] = useState('3,00%');
  const [expVida, setExpVida] = useState('76');
  const [n, setN] = useState('');
  const [tasa, setTasa] = useState('6,00%');
  const [fecSent, setFecSent] = useState('2024-12-31');
  const [tasaMor, setTasaMor] = useState('8,00%');

  // SMVM
  const [indicesSMVM, setIndicesSMVM] = useState(null);
  const [smvmError, setSmvmError] = useState(null);

  // Mensajes SMVM / salario
  const [salarioMsg, setSalarioMsg] = useState(null); // { text, type: 'green' | 'red' }
  const [smvmInfo, setSmvmInfo] = useState(null); // { etiqueta, valor }
  const [smvmChip, setSmvmChip] = useState(null); // { etiqueta, valor }

  // Resultados
  const [resultado, setResultado] = useState(null);
  const [simVidaRows, setSimVidaRows] = useState([]);
  const [simTasaRows, setSimTasaRows] = useState([]);
  const [simMorRows, setSimMorRows] = useState([]);
  const [showResultado, setShowResultado] = useState(false);

  // ===== Estados para GUARDAR EN JUICIO =====
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [loadCasesError, setLoadCasesError] = useState(null);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [savingResult, setSavingResult] = useState(false);

  // ===== Carga SMVM al montar =====
  useEffect(() => {
    const loadSMVM = async () => {
      try {
        const fd = await getFinancialData("smvm");
        if (!fd || !fd.data) return;

        const map = {};
        fd.data.forEach(row => {
          // row[0] = clave tipo "sep-24"
          // row[1] = valor numérico
          const clave = String(row[0]).toLowerCase();
          const valor = Number(row[1]);
          if (!isNaN(valor)) map[clave] = valor;
        });

        setIndicesSMVM(map);
      } catch (e) {
        console.error("Error cargando SMVM", e);
        setSmvmError("Error cargando índices SMVM desde la base de datos.");
      }
    };

    loadSMVM();
  }, []);

  // ===== Calcular edad y n cuando cambian fechas / expectativa =====
  useEffect(() => {
    if (!fecNac || !fecAcc) return;
    const acc = new Date(fecAcc);
    const nac = new Date(fecNac);
    let e = acc.getFullYear() - nac.getFullYear();
    if (
      acc.getMonth() < nac.getMonth() ||
      (acc.getMonth() === nac.getMonth() && acc.getDate() < nac.getDate())
    ) {
      e--;
    }
    setEdad(String(e));
    const exp = parseInt(expVida || '76', 10);
    const nCalc = Math.max(exp - e, 0);
    setN(String(nCalc));
  }, [fecNac, fecAcc, expVida]);

  // ===== SMVM vigente a una fecha =====
  const smvmAFecha = (fechaISO) => {
    if (!indicesSMVM || !fechaISO) return null;
    const d = new Date(fechaISO);
    const k = keyOnOrBefore(indicesSMVM, d);
    if (!k) return null;
    const valor = Number(indicesSMVM[k]) || 0;
    return { valor, clave: k, etiqueta: kFmt(k) };
  };

  // ===== Máscaras de inputs =====
  const handleSalarioChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setSalario('');
      return;
    }
    const valor = Number(digits) / 100;
    setSalario(
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
      }).format(valor),
    );
  };

  const handlePctChange = (setter) => (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setter('');
      return;
    }
    const num = Number(digits) / 100;
    setter(nfPct2.format(num) + '%');
  };

  // ===== Mensaje salario vs SMVM (y chip) =====
  useEffect(() => {
    if (!indicesSMVM || !fecAcc) return;

    const smvm = smvmAFecha(fecAcc);
    if (!smvm) return;

    const salNum = parseMoney(salario);

    // reset
    setSalarioMsg(null);
    setSmvmInfo(null);
    setSmvmChip(null);

    if (salNum > 0) {
      const pct = (salNum / smvm.valor) * 100;
      setSalarioMsg({
        text: `El salario mensual bruto representa un ${nfPct2.format(
          pct,
        )}% del SMVM al momento del accidente.`,
        type: pct >= 100 ? 'green' : 'red',
      });
      setSmvmInfo({
        etiqueta: smvm.etiqueta,
        valor: smvm.valor,
      });
    } else {
      // salario vacío → usar SMVM
      setSmvmChip({
        etiqueta: smvm.etiqueta,
        valor: smvm.valor,
      });
    }
  }, [salario, fecAcc, indicesSMVM]);

  // ===== Núcleo de cálculo =====
  const handleCalcular = async () => {
    try {
      if (!fecAcc) {
        alert('Completá la fecha del accidente.');
        return;
      }
      const nNum = parseInt(n || '0', 10);
      const iDec = parsePct(tasa);
      if (!(nNum > 0) || !(iDec > 0)) {
        alert('n debe ser > 0 e i debe ser > 0.');
        return;
      }

      const incapDec = parsePct(incap);
      const morDec = parsePct(tasaMor);

      // salario: si está vacío, usar SMVM
      let salNum = parseMoney(salario);
      let chip = null;
      if (salNum <= 0) {
        const smvm = smvmAFecha(fecAcc);
        if (smvm) {
          salNum = smvm.valor;
          chip = smvm;
        }
      }
      if (chip) {
        setSmvmChip({
          etiqueta: chip.etiqueta,
          valor: chip.valor,
        });
      }

      const a = salNum * 13 * (incapDec || 0); // base anual
      const { Vn, factor, C } = rentaCapitalizada(a, nNum, iDec);

      let moratorio = 0;
      let spanTxt = '';
      if (fecSent) {
        const dias = daysBetween(new Date(fecAcc), new Date(fecSent));
        moratorio = C * morDec * (dias / 365);
        spanTxt = `(${dias} días a ${nfPct2.format(morDec * 100)}% anual simple)`;
      }
      const total = C + moratorio;

      const res = {
        a,
        Vn,
        factor,
        C,
        moratorio,
        total,
        spanTxt,
        n: nNum,
        tasaDec: iDec,
        morDec,
        edadNum: parseInt(edad || '0', 10),
        expVidaNum: parseInt(expVida || '76', 10),
        fecAcc,
        fecSent,
      };
      setResultado(res);
      buildSimulaciones(res);
      setShowResultado(true);
    } catch (err) {
      console.error(err);
      alert('Error en el cálculo: ' + err.message);
    }
  };

  // ===== Simulaciones =====
  const rentaLocal = (a, n, i) => {
    if (!(i > 0) || !(n > 0)) return { C: NaN, factor: NaN };
    const Vn = 1 / Math.pow(1 + i, n);
    const factor = (1 - Vn) / i;
    return { C: a * factor, factor };
  };

  const buildSimulaciones = (base) => {
    const { a, n, tasaDec, morDec, fecAcc, fecSent, C, edadNum, expVidaNum } = base;

    // 1) Expectativa de vida
    const vidas = [expVidaNum - 10, expVidaNum - 5, expVidaNum, expVidaNum + 5, expVidaNum + 10].filter(
      (v) => v > edadNum,
    );
    const rowsVida = vidas.map((v) => {
      const nV = v - edadNum;
      const { C: capV } = rentaLocal(a, nV, tasaDec);
      return {
        expVida: v,
        n: nV,
        capital: capV,
        selected: v === expVidaNum,
      };
    });
    setSimVidaRows(rowsVida);

    // 2) Tasa i
    const tasas = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08];
    const rowsTasa = tasas.map((i) => {
      const { C: cap, factor } = rentaLocal(a, n, i);
      return {
        tasa: i,
        factor,
        capital: cap,
        selected: Math.abs(i - tasaDec) < 1e-9,
      };
    });
    setSimTasaRows(rowsTasa);

    // 3) Moratoria
    const moras = [0, 0.06, 0.08, 0.12, 0.2];
    let dias = 0;
    if (fecAcc && fecSent) {
      dias = daysBetween(new Date(fecAcc), new Date(fecSent));
    }
    const rowsMor = moras.map((m) => {
      const interes = C * m * (dias / 365);
      return {
        mor: m,
        dias,
        interes,
        selected: Math.abs(m - morDec) < 1e-9,
      };
    });
    setSimMorRows(rowsMor);
  };

  // ===== Cargar juicios cuando se abre el diálogo =====
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
        console.error('Error cargando juicios para Renta Periódica:', e);
        setLoadCasesError('No se pudieron cargar los juicios. Intenta nuevamente.');
      } finally {
        setCasesLoading(false);
      }
    };

    loadCases();
  }, [saveDialogOpen, casesLoading, availableCases.length]);

  // ===== Abrir diálogo Guardar en juicio =====
  const handleOpenSaveDialog = () => {
    if (!resultado || !Number.isFinite(resultado.total)) {
      alert('Primero calculá la renta periódica antes de guardar en un juicio.');
      return;
    }

    const defaultTitle =
      saveTitle || 'Renta periódica (art. 1746 CCCN) a la fecha del accidente';
    setSaveTitle(defaultTitle);
    setSaveDialogOpen(true);
  };

  // ===== Confirmar guardado en juicio =====
  const handleConfirmSave = async () => {
    if (!selectedCaseId) {
      alert('Seleccioná un juicio.');
      return;
    }

    try {
      setSavingResult(true);
      const user = await User.me();

      const edadNum = parseInt(edad || '0', 10) || null;
      const expVidaNum = parseInt(expVida || '0', 10) || null;
      const incapDec = parsePct(incap);
      const incapPorc = incapDec > 0 ? incapDec * 100 : null;

      const salarioIngresado = parseMoney(salario) || null;

      // deducir salario realmente usado en la base "a"
      let salarioUtilizado = null;
      if (resultado && resultado.a != null && incapDec > 0) {
        salarioUtilizado = resultado.a / (13 * incapDec);
      } else if (salarioIngresado) {
        salarioUtilizado = salarioIngresado;
      } else if (smvmChip?.valor) {
        salarioUtilizado = smvmChip.valor;
      }

      const tasaCalc = resultado?.tasaDec;
      const tasaAnualPorc =
        typeof tasaCalc === 'number'
          ? tasaCalc * 100
          : parsePct(tasa) > 0
          ? parsePct(tasa) * 100
          : null;

      const morCalc = resultado?.morDec;
      const tasaMoratoriaPorc =
        typeof morCalc === 'number'
          ? morCalc * 100
          : parsePct(tasaMor) > 0
          ? parsePct(tasaMor) * 100
          : null;

      const diasMoratorios =
        fecAcc && fecSent
          ? daysBetween(new Date(fecAcc), new Date(fecSent))
          : null;

      const payload = {
        tipo: 'renta_periodica_1746',

        // Fechas
        fechaNacimiento: formatDDMMYYYY(fecNac),
        fechaAccidente: formatDDMMYYYY(fecAcc),
        fechaSentencia: formatDDMMYYYY(fecSent),

        // Datos personales / de vida
        edadAlAccidente: edadNum,
        expectativaVida: expVidaNum,
        nAniosResarcir:
          resultado?.n != null
            ? resultado.n
            : expVidaNum && edadNum
            ? expVidaNum - edadNum
            : null,

        // Salario / SMVM
        salarioIngresado,
        salarioUtilizado,
        salarioFuente: smvmChip ? 'smvm' : 'manual',
        smvmClave: smvmChip?.etiqueta || null,
        smvmValor: smvmChip?.valor || null,

        // Incapacidad y tasas
        incapacidadPorc: incapPorc,
        tasaAnualPorc,
        tasaMoratoriaPorc,

        // Moratorios
        diasMoratorios,

        // Resultados numéricos principales
        baseAnual: resultado?.a ?? null,
        capitalAccidente: resultado?.C ?? null,
        interesMoratorio: resultado?.moratorio ?? null,
        totalSentencia: resultado?.total ?? null,

        // Texto explicativo de moratoria
        spanTxt: resultado?.spanTxt || null,
      };

      await CalculatorResult.create({
        userId: user.id,
        caseId: selectedCaseId,
        toolId: 'renta_periodica_1746', // o el ID real de la herramienta si lo tenés
        toolName: 'Renta periódica – art. 1746 CCCN',
        title:
          saveTitle ||
          'Renta periódica (art. 1746 CCCN) a la fecha del accidente',
        notes: saveNotes,
        payload,
      });

      alert('✅ Resultado de la renta periódica guardado en el juicio.');
      setSaveDialogOpen(false);
      setSelectedCaseId('');
      setSaveTitle('');
      setSaveNotes('');
    } catch (e) {
      console.error('Error guardando Renta Periódica en juicio:', e);
      alert('No se pudo guardar el resultado en el juicio.');
    } finally {
      setSavingResult(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Panel explicativo FINFOCUS */}
      <PanelExplicativo />

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-5 md:p-7 border border-slate-100">
        <h1 className="text-xl md:text-2xl font-extrabold text-center text-[#0f2f4b] mb-1">
          Calculadora de Renta Periódica (art. 1746 CCCN)
        </h1>
        <p className="text-center text-[13px] text-slate-600 mb-5">
          C = a × (1 − Vⁿ) / i &nbsp;•&nbsp; a = salario × 13 × % incapacidad
        </p>

        {smvmError && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {smvmError}
          </div>
        )}

        {/* Grid de inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          {/* Fecha nacimiento */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Fecha de nacimiento
            </span>
            <input
              type="date"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={fecNac}
              onChange={(e) => setFecNac(e.target.value)}
            />
          </div>

          {/* Fecha accidente */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Fecha del accidente
            </span>
            <input
              type="date"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={fecAcc}
              onChange={(e) => setFecAcc(e.target.value)}
            />
          </div>

          {/* Edad al accidente */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Edad al accidente
            </span>
            <input
              type="number"
              readOnly
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
              value={edad}
              placeholder="Se calculará"
            />
          </div>

          {/* Salario mensual */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Salario mensual bruto
            </span>
            <input
              type="text"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              placeholder="$ 0,00"
              value={salario}
              onChange={handleSalarioChange}
            />
            {/* Mensaje % vs SMVM */}
            {salarioMsg && (
              <div
                className={`mt-2 rounded-md px-3 py-2 text-xs font-semibold border ${
                  salarioMsg.type === 'green'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {salarioMsg.text}
              </div>
            )}

            {/* Info SMVM (cuando hay salario) */}
            {smvmInfo && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 shadow-sm">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-blue-300 text-[10px] bg-white">
                    i
                  </span>
                  <span className="opacity-80">SMVM ({smvmInfo.etiqueta})</span>
                  <span className="w-1 h-1 rounded-full bg-blue-300" />
                  <span className="text-blue-900 font-extrabold">
                    {nfMoney.format(smvmInfo.valor)}
                  </span>
                </span>
              </div>
            )}

            {/* Chip cuando usamos SMVM como salario */}
            {smvmChip && !salario && (
              <div className="mt-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-semibold text-blue-800">
                  Usando SMVM de{' '}
                  <span className="font-bold">{smvmChip.etiqueta}</span> como salario:{' '}
                  <span className="font-extrabold">{nfMoney.format(smvmChip.valor)}</span>
                </span>
              </div>
            )}
          </div>

          {/* % de incapacidad */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              % de incapacidad
            </span>
            <input
              type="text"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={incap}
              onChange={handlePctChange(setIncap)}
            />
          </div>

          {/* Expectativa de vida */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Expectativa de vida (años)
            </span>
            <input
              type="number"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={expVida}
              onChange={(e) => setExpVida(e.target.value)}
              min={1}
            />
          </div>

          {/* n */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              n (años a resarcir)
            </span>
            <input
              type="number"
              readOnly
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
              value={n}
              placeholder="Se calculará"
            />
          </div>

          {/* Tasa anual i */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Tasa anual (i)
            </span>
            <input
              type="text"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={tasa}
              onChange={handlePctChange(setTasa)}
            />
          </div>

          {/* Fecha sentencia */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Fecha de sentencia
            </span>
            <input
              type="date"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={fecSent}
              onChange={(e) => setFecSent(e.target.value)}
            />
          </div>

          {/* Tasa moratoria */}
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-white px-2 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-full">
              Tasa moratoria hasta sentencia
            </span>
            <input
              type="text"
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2f4b]"
              value={tasaMor}
              onChange={handlePctChange(setTasaMor)}
            />
          </div>
        </div>

        {/* Botón Calcular */}
        <button
          type="button"
          onClick={handleCalcular}
          className="w-full mt-2 bg-[#0f2f4b] text-white font-extrabold py-3 rounded-full shadow-md hover:bg-[#0b2337] transition"
        >
          Calcular
        </button>

        {/* Botón + diálogo Guardar en juicio */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <div className="mt-3">
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#0f2f4b] text-[#0f2f4b] font-semibold"
                onClick={handleOpenSaveDialog}
              >
                Guardar en juicio
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Guardar renta periódica en un juicio</DialogTitle>
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
                    <p className="text-xs text-red-600 mt-1">
                      {loadCasesError}
                    </p>
                  )}
                </div>

                {/* Título */}
                <div className="space-y-1">
                  <Label>Título del cálculo</Label>
                  <UiInput
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Ej: Renta periódica art. 1746 CCCN"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="Notas sobre parámetros, tasas, expectativa de vida, etc."
                    rows={3}
                  />
                </div>

                {/* Resumen breve */}
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
                  <p className="font-semibold mb-1">Resumen a guardar</p>
                  <p>
                    Fecha del accidente:{' '}
                    <span className="font-bold text-[#0f2f4b]">
                      {fecAcc ? formatDDMMYYYY(fecAcc) : '—'}
                    </span>
                  </p>
                  <p>
                    Fecha de sentencia:{' '}
                    <span className="font-bold text-[#0f2f4b]">
                      {fecSent ? formatDDMMYYYY(fecSent) : '—'}
                    </span>
                  </p>
                  <p>
                    Capital (a la fecha del accidente):{' '}
                    <span className="font-semibold">
                      {resultado?.C != null && Number.isFinite(resultado.C)
                        ? nfMoney.format(resultado.C)
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Interés moratorio:{' '}
                    <span className="font-semibold">
                      {resultado?.moratorio != null &&
                      Number.isFinite(resultado.moratorio)
                        ? nfMoney.format(resultado.moratorio)
                        : '—'}
                    </span>
                  </p>
                  <p>
                    Total a la sentencia:{' '}
                    <span className="font-bold text-emerald-700">
                      {resultado?.total != null &&
                      Number.isFinite(resultado.total)
                        ? nfMoney.format(resultado.total)
                        : '—'}
                    </span>
                  </p>
                </div>

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
          </div>
        </Dialog>

        {/* Resultados */}
        {showResultado && resultado && (
          <div className="mt-4 border border-slate-200 rounded-2xl bg-slate-50/60 p-4 space-y-4">
            {/* resumen grande */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 bg-gradient-to-b from-[#F4F9FF] to-[#F9FCFF] border border-[#DCE7F5] rounded-2xl px-4 py-3 shadow-sm flex flex-col justify-between">
                <div className="text-xs font-bold text-slate-500">Capital (a la fecha del accidente)</div>
                <div className="mt-1 text-lg md:text-xl font-extrabold text-[#0f2f4b] ">
                  {Number.isFinite(resultado.C) ? nfMoney.format(resultado.C) : '—'}
                </div>
              </div>
              <div className="flex-1 bg-white border border-[#DCE7F5] rounded-2xl px-4 py-3 shadow-sm">
                <div className="text-xs font-bold text-slate-500">
                  Interés moratorio (accidente → sentencia)
                </div>
                <div className="mt-1 text-base font-bold text-[#0f2f4b] ">
                  {Number.isFinite(resultado.moratorio)
                    ? nfMoney.format(resultado.moratorio)
                    : '—'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{resultado.spanTxt}</div>
              </div>
              <div className="flex-1 bg-[#0f2f4b] text-white rounded-2xl px-4 py-3 shadow-md flex flex-col justify-between">
                <div className="text-xs font-bold text-white/80">Total a la sentencia</div>
                <div className="mt-1 text-lg md:text-xl font-extrabold ">
                  {Number.isFinite(resultado.total) ? nfMoney.format(resultado.total) : '—'}
                </div>
              </div>
            </div>

            {/* detalle fórmula */}
            <div className="mt-2">
              <h2 className="font-bold text-sm text-[#0f2f4b] mb-1">Detalle</h2>
              <div className="text-xs md:text-sm leading-6 text-slate-700">
                <div>
                  Base anual <b>a</b> = salario × 13 × % incapacidad →{' '}
                  <span className="">{nfMoney.format(resultado.a)}</span>
                </div>
                <div>
                  Vⁿ = 1 / (1 + i)ⁿ →{' '}
                  <span className="">
                    {Number.isFinite(resultado.Vn) ? resultado.Vn.toFixed(6) : '—'}
                  </span>
                </div>
                <div>
                  Factor = (1 − Vⁿ) / i →{' '}
                  <span className="">
                    {Number.isFinite(resultado.factor) ? resultado.factor.toFixed(6) : '—'}
                  </span>
                </div>
                <div>
                  n = expectativaVida − edad →{' '}
                  <span className="">{resultado.n}</span>
                </div>
              </div>
            </div>

            {/* simulaciones */}
            <div className="grid gap-3 md:grid-cols-3 mt-3">
              {/* por expectativa de vida */}
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <h3 className="text-sm font-bold text-[#0f2f4b] mb-2">
                  Simulación por expectativa de vida
                </h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Exp. vida
                      </th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">n</th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Capital
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simVidaRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.selected ? 'bg-blue-50/80' : ''}
                      >
                        <td className="border border-slate-200 px-2 py-1 ">{row.expVida}</td>
                        <td className="border border-slate-200 px-2 py-1 ">{row.n}</td>
                        <td className="border border-slate-200 px-2 py-1 ">
                          {Number.isFinite(row.capital) ? nfMoney.format(row.capital) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* por tasa i */}
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <h3 className="text-sm font-bold text-[#0f2f4b] mb-2">Simulación por tasa i</h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        i anual
                      </th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Factor
                      </th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Capital
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simTasaRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.selected ? 'bg-blue-50/80' : ''}
                      >
                        <td className="border border-slate-200 px-2 py-1 ">
                          {nfPct2.format(row.tasa * 100)}%
                        </td>
                        <td className="border border-slate-200 px-2 py-1 ">
                          {Number.isFinite(row.factor) ? row.factor.toFixed(6) : '—'}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 ">
                          {Number.isFinite(row.capital) ? nfMoney.format(row.capital) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* por moratoria */}
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <h3 className="text-sm font-bold text-[#0f2f4b] mb-2">
                  Simulación por moratoria
                </h3>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Tasa mor.
                      </th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Días
                      </th>
                      <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                        Interés
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simMorRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.selected ? 'bg-blue-50/80' : ''}
                      >
                        <td className="border border-slate-200 px-2 py-1">
                          {nfPct2.format(row.mor * 100)}%
                        </td>
                        <td className="border border-slate-200 px-2 py-1">
                          {row.dias}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 ">
                          {Number.isFinite(row.interes) ? nfMoney.format(row.interes) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
