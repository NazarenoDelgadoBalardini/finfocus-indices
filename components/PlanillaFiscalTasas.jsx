// src/components/PlanillaFiscalTasas.jsx
import React, { useMemo, useState } from 'react';

const AZUL = '#0f2f4b';

const PRICING_FIELDS = [
  {
    key: 'Escritos',
    items: [
      { decree: 'DTO.3621/3', date: '05/12/25', unit: 1000 },
      { decree: 'DTO.1163/3', date: '06/05/24', unit: 400 },
      { decree: 'DTO.1943/3', date: '06/07/22', unit: 100 },
      { decree: 'DTO.4616/3', date: '26/12/18', unit: 45 },
      { decree: 'DTO.3041/3', date: '28/09/15', unit: 23 },
      { decree: 'DTO.2701/3', date: '09/09/13', unit: 13 },
    ],
  },
  {
    key: 'Act. 1ª Instancia',
    items: [
      { decree: 'DTO.3621/3', date: '05/12/25', unit: 700 },
      { decree: 'DTO.1163/3', date: '06/05/24', unit: 300 },
      { decree: 'DTO.1943/3', date: '06/07/22', unit: 50 },
      { decree: 'DTO.4616/3', date: '26/12/18', unit: 15 },
      { decree: 'DTO.3041/3', date: '28/09/15', unit: 6 },
      { decree: 'DTO.2701/3', date: '09/09/13', unit: 3 },
    ],
  },
  {
    key: 'Act. 2ª Instancia',
    items: [
      { decree: 'DTO.3621/3', date: '05/12/25', unit: 700 },
      { decree: 'DTO.1163/3', date: '06/05/24', unit: 300 },
      { decree: 'DTO.1943/3', date: '06/07/22', unit: 50 },
      { decree: 'DTO.4616/3', date: '26/12/18', unit: 15 },
      { decree: 'DTO.3041/3', date: '28/09/15', unit: 7 },
      { decree: 'DTO.2701/3', date: '09/09/13', unit: 4 },
    ],
  },
];

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);

const getId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getCombinations = (arr) => {
  const res = [];
  const backtrack = (start, combo) => {
    for (let i = start; i < arr.length; i++) {
      const newCombo = combo.concat(arr[i]);
      res.push(newCombo);
      backtrack(i + 1, newCombo);
    }
  };
  backtrack(0, []);
  return res;
};

function createProcess(name, isKnowledge = false) {
  return {
    id: getId(),
    name,
    isKnowledge,
    parties: [],
  };
}

function createParty(role, label) {
  return {
    id: getId(),
    role, // 'actor' | 'demandado'
    label,
    // Solo en proceso de conocimiento:
    calc: 0,
    capital: 0,
    taxPct: 2,
    taxOwn: true,
    // General:
    responsibilityPct: 100,
    restoTarget: 'self',
    fieldVersions: {},
    fieldQtys: {},
    lineItems: [], // { id, fieldKey, decree, date, unit, quantity, key }
  };
}

function computeParty(proc, party) {
  const itemsSum = (party.lineItems || []).reduce(
    (sum, it) => sum + (it.unit || 0) * (it.quantity || 0),
    0
  );

  let calc = 0;
  let cap = 0;
  let taxPct = 0;
  let taxAmt = 0;

  if (proc.isKnowledge) {
    calc = Number(party.calc) || 0;
    cap = Number(party.capital) || 0;
    taxPct = (Number(party.taxPct) || 0) / 100;
    taxAmt = cap * taxPct;
  }

  const baseTotal = itemsSum + calc + taxAmt;

  const isDerivandoResto = party.restoTarget && party.restoTarget !== 'self';
  const taxAlwaysOwn = proc.isKnowledge && party.taxOwn;

  const baseQueSeComparte =
    itemsSum + calc + (isDerivandoResto && taxAlwaysOwn ? 0 : taxAmt);

  const respPct = (Number(party.responsibilityPct) || 0) / 100;
  const ownFromShared = baseQueSeComparte * respPct;
  const remainderFromShared = baseQueSeComparte - ownFromShared;

  const taxOnlyForSelf = isDerivandoResto && taxAlwaysOwn ? taxAmt : 0;

  let ownCharge;
  let remainder;

  if (!isDerivandoResto) {
    ownCharge = baseQueSeComparte + taxOnlyForSelf;
    remainder = 0;
  } else {
    ownCharge = ownFromShared + taxOnlyForSelf;
    remainder = remainderFromShared;
  }

  return {
    ...party,
    itemsSum,
    calc,
    cap,
    taxAmt,
    baseTotal,
    ownCharge,
    remainder,
  };
}

function computeProcessTotals(proc) {
  const partiesCalc = proc.parties.map((p) => computeParty(proc, p));

  const partyByLabel = new Map();
  partiesCalc.forEach((p) => {
    partyByLabel.set(p.label, {
      party: p,
      remFromOthers: 0,
    });
  });

  const comboRemainders = {};

  // Distribución de remainder a partes individuales o combos
  partiesCalc.forEach((p) => {
    if (p.restoTarget && p.restoTarget !== 'self' && p.remainder > 0) {
      if (p.restoTarget.includes('|')) {
        comboRemainders[p.restoTarget] =
          (comboRemainders[p.restoTarget] || 0) + p.remainder;
      } else {
        const holder = partyByLabel.get(p.restoTarget);
        if (holder) {
          holder.remFromOthers += p.remainder;
        }
      }
    }
  });

  let totalActors = 0;
  let totalDemandados = 0;
  const actorSummaries = [];
  const demandadoSummaries = [];

  partyByLabel.forEach(({ party, remFromOthers }) => {
    const val = (party.ownCharge || 0) + (remFromOthers || 0);
    if (party.role === 'actor') {
      totalActors += val;
      actorSummaries.push({
        label: `Total ${party.label}`,
        value: val,
      });
    } else {
      totalDemandados += val;
      demandadoSummaries.push({
        label: `Total ${party.label}`,
        value: val,
      });
    }
  });

  const comboSummaries = Object.entries(comboRemainders).map(([comboKey, val]) => ({
    label: `Total ${comboKey.split('|').join(' y ')} (solidaria)`,
    value: val,
  }));

  const totalProceso =
    totalActors +
    totalDemandados +
    Object.values(comboRemainders).reduce((a, b) => a + b, 0);

  return {
    ...proc,
    partiesCalc,
    actorSummaries,
    demandadoSummaries,
    comboSummaries,
    totalProceso,
  };
}

export default function PlanillasFiscalesTasas() {
  const [processes, setProcesses] = useState(() => [
    createProcess('Proceso de Conocimiento', true),
  ]);

  // ===== Handlers de procesos =====
  const addProcessHandler = (name) => {
    setProcesses((prev) => [...prev, createProcess(name, false)]);
  };

  const addParty = (processId, role) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        const existingOfRole = proc.parties.filter((p) => p.role === role).length;
        const label =
          (role === 'actor' ? 'Actor ' : 'Demandado ') + (existingOfRole + 1);
        return {
          ...proc,
          parties: [...proc.parties, createParty(role, label)],
        };
      })
    );
  };

  const removeParty = (processId, partyId) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.filter((p) => p.id !== partyId),
        };
      })
    );
  };

  const updatePartyField = (processId, partyId, field, value) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.map((p) =>
            p.id === partyId ? { ...p, [field]: value } : p
          ),
        };
      })
    );
  };

  const updatePartyFieldVersion = (processId, partyId, fieldKey, idx) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.map((p) => {
            if (p.id !== partyId) return p;
            return {
              ...p,
              fieldVersions: {
                ...(p.fieldVersions || {}),
                [fieldKey]: idx,
              },
            };
          }),
        };
      })
    );
  };

  const updatePartyFieldQty = (processId, partyId, fieldKey, qtyStr) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.map((p) => {
            if (p.id !== partyId) return p;
            return {
              ...p,
              fieldQtys: {
                ...(p.fieldQtys || {}),
                [fieldKey]: qtyStr,
              },
            };
          }),
        };
      })
    );
  };

  const addLineItem = (processId, partyId, fieldKey, versionIdx, qty) => {
    if (!qty || qty <= 0) return;
    const field = PRICING_FIELDS.find((f) => f.key === fieldKey);
    if (!field) return;
    const it = field.items[versionIdx];
    if (!it) return;

    const key = `${fieldKey}|${it.decree}|${it.date}`;

    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.map((p) => {
            if (p.id !== partyId) return p;
            const existing = p.lineItems?.find((li) => li.key === key) || null;
            let newLineItems;
            if (existing) {
              newLineItems = p.lineItems.map((li) =>
                li.key === key
                  ? {
                      ...li,
                      quantity: (li.quantity || 0) + qty,
                    }
                  : li
              );
            } else {
              newLineItems = [
                ...(p.lineItems || []),
                {
                  id: getId(),
                  key,
                  fieldKey,
                  decree: it.decree,
                  date: it.date,
                  unit: it.unit,
                  quantity: qty,
                },
              ];
            }
            return {
              ...p,
              lineItems: newLineItems,
              fieldQtys: {
                ...(p.fieldQtys || {}),
                [fieldKey]: '',
              },
            };
          }),
        };
      })
    );
  };

  const removeLineItem = (processId, partyId, itemId) => {
    setProcesses((prev) =>
      prev.map((proc) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          parties: proc.parties.map((p) =>
            p.id === partyId
              ? {
                  ...p,
                  lineItems: p.lineItems.filter((li) => li.id !== itemId),
                }
              : p
          ),
        };
      })
    );
  };

  const updateRestoTarget = (processId, partyId, value) => {
    updatePartyField(processId, partyId, 'restoTarget', value);
  };

  // ===== Cálculo global =====
  const { computedProcesses, globalSums } = useMemo(() => {
    const cps = processes.map((p) => computeProcessTotals(p));
    const sums = {};

    cps.forEach((proc) => {
      const allRows = [
        ...proc.actorSummaries,
        ...proc.demandadoSummaries,
        ...proc.comboSummaries,
        {
          label: 'Total Proceso',
          value: proc.totalProceso,
        },
      ];
      allRows.forEach(({ label, value }) => {
        sums[label] = (sums[label] || 0) + value;
      });
    });

    return { computedProcesses: cps, globalSums: sums };
  }, [processes]);

  const totalPlanilla = globalSums['Total Proceso'] || 0;

  // ===== UI =====
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-xl md:text-2xl font-bold text-[#0f2f4b]">
          Planilla Fiscal · FINLEGAL
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-500">
          Cargá procesos, actores y demandados, distribuyendo items, responsabilidades e
          impuestos para obtener el total de la planilla fiscal.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-2">
        <button
          className="btn-primary bg-[#0f2f4b] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm hover:bg-[#163858] transition"
          onClick={() => addProcessHandler('Aclaratoria')}
        >
          + ACLARATORIA
        </button>
        <button
          className="btn-primary bg-[#0f2f4b] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm hover:bg-[#163858] transition"
          onClick={() => addProcessHandler('Apelación')}
        >
          + APELACIÓN
        </button>
        <button
          className="btn-primary bg-[#0f2f4b] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm hover:bg-[#163858] transition"
          onClick={() => addProcessHandler('Casación')}
        >
          + CASACIÓN
        </button>
        <button
          className="btn-primary bg-[#0f2f4b] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm hover:bg-[#163858] transition"
          onClick={() => {
            // Totales se recalculan solos; botón "decorativo"
          }}
        >
          CALCULAR TOTAL
        </button>
        <button
          className="btn-primary bg-white text-[#0f2f4b] border border-[#0f2f4b] px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm hover:bg-[#0f2f4b] hover:text-white transition"
          onClick={() => setProcesses((prev) => [...prev])}
        >
          ⟳ REFRESCAR CÁLCULOS
        </button>
      </div>

      {/* Procesos */}
      <div className="space-y-4">
        {computedProcesses.map((proc) => (
          <ProcessCard
            key={proc.id}
            process={proc}
            allProcesses={computedProcesses}
            onAddActor={() => addParty(proc.id, 'actor')}
            onAddDemandado={() => addParty(proc.id, 'demandado')}
            onRemoveParty={(partyId) => removeParty(proc.id, partyId)}
            onUpdateField={(partyId, field, value) =>
              updatePartyField(proc.id, partyId, field, value)
            }
            onUpdateVersion={(partyId, fieldKey, idx) =>
              updatePartyFieldVersion(proc.id, partyId, fieldKey, idx)
            }
            onUpdateQty={(partyId, fieldKey, qtyStr) =>
              updatePartyFieldQty(proc.id, partyId, fieldKey, qtyStr)
            }
            onAddLineItem={(partyId, fieldKey, versionIdx, qty) =>
              addLineItem(proc.id, partyId, fieldKey, versionIdx, qty)
            }
            onRemoveLineItem={(partyId, itemId) =>
              removeLineItem(proc.id, partyId, itemId)
            }
            onUpdateResto={(partyId, value) => updateRestoTarget(proc.id, partyId, value)}
          />
        ))}
      </div>

      {/* Resultado global */}
      <div
        id="resultado"
        className="mt-4 bg-[#eef5fa] border border-slate-200 border-l-[6px] border-l-[#0f2f4b] rounded-xl px-4 py-3 text-xs md:text-sm font-semibold text-[#0f2f4b]"
      >
        {Object.keys(globalSums).length === 0 ? (
          <span>No hay montos cargados aún.</span>
        ) : (
          <>
            {Object.entries(globalSums)
              .filter(([label]) => label !== 'Total Proceso')
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span>{label}:</span>
                  <span>{fmtCurrency(value)}</span>
                </div>
              ))}
            <hr className="my-2 border-slate-200" />
            <div className="flex justify-between gap-2 text-sm md:text-base">
              <span className="font-bold">TOTAL PLANILLA FISCAL:</span>
              <span className="font-extrabold">{fmtCurrency(totalPlanilla)}</span>
            </div>
          </>
        )}
      </div>

      <div className="legend-highlight mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs md:text-sm text-amber-900 font-semibold">
        Recordar imposición de costas para la distribución del capital.
        <br />
        Recalcular el total al hacer modificaciones.
      </div>
    </div>
  );
}

function ProcessCard({
  process,
  allProcesses,
  onAddActor,
  onAddDemandado,
  onRemoveParty,
  onUpdateField,
  onUpdateVersion,
  onUpdateQty,
  onAddLineItem,
  onRemoveLineItem,
  onUpdateResto,
}) {
  const { name, isKnowledge, partiesCalc } = process;

  const actorParties = partiesCalc.filter((p) => p.role === 'actor');
  const demandadoParties = partiesCalc.filter((p) => p.role === 'demandado');

  const allLabels = partiesCalc.map((p) => p.label);

  return (
    <div className="process-card bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5">
      <h2 className="text-sm md:text-base font-semibold text-[#0f2f4b] mb-2 flex items-center gap-2">
        <span className="text-lg">⚖️</span> {name}
      </h2>

      {/* Botones internos */}
      <div className="process-btns flex flex-wrap gap-2 mb-3">
        <button
          className="btn-secondary btn-add-actor inline-flex items-center px-3 py-1.5 text-xs md:text-sm font-medium border border-[#0f2f4b] text-[#0f2f4b] rounded-lg bg-white hover:bg-[#0f2f4b] hover:text-white transition"
          onClick={onAddActor}
        >
          + Agregar Actor
        </button>
        <button
          className="btn-secondary btn-add-demandado inline-flex items-center px-3 py-1.5 text-xs md:text-sm font-medium border border-[#0f2f4b] text-[#0f2f4b] rounded-lg bg-white hover:bg-[#0f2f4b] hover:text-white transition"
          onClick={onAddDemandado}
        >
          + Agregar Demandado
        </button>
      </div>

      <div className="roles flex flex-col md:flex-row gap-4">
        <div className="actor-wrap flex-1 space-y-3">
          {actorParties.map((party) => (
            <PartyFieldset
              key={party.id}
              party={party}
              isKnowledge={isKnowledge}
              allLabels={allLabels}
              onRemove={() => onRemoveParty(party.id)}
              onUpdateField={(field, value) => onUpdateField(party.id, field, value)}
              onUpdateVersion={(fieldKey, idx) => onUpdateVersion(party.id, fieldKey, idx)}
              onUpdateQty={(fieldKey, qtyStr) => onUpdateQty(party.id, fieldKey, qtyStr)}
              onAddLineItem={(fieldKey, versionIdx, qty) =>
                onAddLineItem(party.id, fieldKey, versionIdx, qty)
              }
              onRemoveLineItem={(itemId) => onRemoveLineItem(party.id, itemId)}
              onUpdateResto={(value) => onUpdateResto(party.id, value)}
            />
          ))}
        </div>

        <div className="demandado-wrap flex-1 space-y-3">
          {demandadoParties.map((party) => (
            <PartyFieldset
              key={party.id}
              party={party}
              isKnowledge={isKnowledge}
              allLabels={allLabels}
              onRemove={() => onRemoveParty(party.id)}
              onUpdateField={(field, value) => onUpdateField(party.id, field, value)}
              onUpdateVersion={(fieldKey, idx) => onUpdateVersion(party.id, fieldKey, idx)}
              onUpdateQty={(fieldKey, qtyStr) => onUpdateQty(party.id, fieldKey, qtyStr)}
              onAddLineItem={(fieldKey, versionIdx, qty) =>
                onAddLineItem(party.id, fieldKey, versionIdx, qty)
              }
              onRemoveLineItem={(itemId) => onRemoveLineItem(party.id, itemId)}
              onUpdateResto={(value) => onUpdateResto(party.id, value)}
            />
          ))}
        </div>
      </div>

      <div className="summary-footer mt-4 pt-3 border-t border-slate-200 text-[0.7rem] md:text-xs text-[#0f2f4b] space-y-0.5">
        {renderProcessSummary(process)}
      </div>
    </div>
  );
}

function PartyFieldset({
  party,
  isKnowledge,
  allLabels,
  onRemove,
  onUpdateField,
  onUpdateVersion,
  onUpdateQty,
  onAddLineItem,
  onRemoveLineItem,
  onUpdateResto,
}) {
  const {
    label,
    role,
    fieldVersions = {},
    fieldQtys = {},
    lineItems = [],
    baseTotal,
    responsibilityPct,
    restoTarget,
    calc,
    capital,
    taxPct,
    taxOwn,
    taxAmt,
  } = party;

  const baseClass =
    role === 'actor'
      ? 'actor-card border-l-4 border-[#5EA6D7]'
      : 'demandado-card border-l-4 border-rose-400';

  const containerClass = `${baseClass} ${
    role === 'actor' ? 'actor-entry' : 'demandado-entry'
  }`;

  const otherLabels = allLabels.filter((l) => l !== label);
  const options = [
    { value: 'self', label: 'Esta parte' },
    ...otherLabels.map((l) => ({
      value: l,
      label: l,
    })),
    ...getCombinations(otherLabels).map((combo) => ({
      value: combo.join('|'),
      label: combo.join(' y '),
    })),
  ];

  const handleAddItemClick = (fieldKey) => {
    const versionIdx = fieldVersions[fieldKey] || 0;
    const qtyStr = fieldQtys[fieldKey] || '';
    const qty = parseInt(qtyStr, 10);
    if (!qty || qty <= 0) return;
    onAddLineItem(fieldKey, versionIdx, qty);
  };

  const itemsByField = (fieldKey) => lineItems.filter((li) => li.fieldKey === fieldKey);

  return (
    <fieldset
      className={`${containerClass} bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-3 md:px-4 md:py-4 relative`}
    >
      <legend className="px-1 text-[0.7rem] font-semibold text-[#0f2f4b]">
        {label}
      </legend>
      <button
        type="button"
        className="btn-remove entry-remove absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-sm hover:bg-red-600"
        onClick={onRemove}
        title="Eliminar esta parte"
      >
        ×
      </button>

      {/* Bloque de conocimiento */}
      {isKnowledge && (
        <>
          <div className="input-group mb-3">
            <label className="block text-[0.7rem] font-semibold text-slate-600 mb-1">
              Calculadas
            </label>
            <input
              type="number"
              value={calc || ''}
              onChange={(e) => onUpdateField('calc', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
            />
          </div>

          <div className="input-group mb-3">
            <label className="block text-[0.7rem] font-semibold text-slate-600 mb-1">
              Capital
            </label>
            <input
              type="number"
              value={capital || ''}
              onChange={(e) => onUpdateField('capital', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
            />
          </div>

          <div className="input-group mb-2">
            <label className="block text-[0.7rem] font-semibold text-slate-600 mb-1">
              % Impuesto 44 Inc.1
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={taxPct ?? 0}
              onChange={(e) => onUpdateField('taxPct', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
            />
          </div>

          <div className="tax-display mt-1 bg-amber-50 rounded-lg px-3 py-2 text-[0.7rem] font-semibold text-amber-900">
            Impuesto (Capital × %): {fmtCurrency(taxAmt || 0)}
          </div>

          <div className="solidarity-options mt-3 bg-sky-50 border-l-4 border-sky-500 rounded-md px-3 py-2 text-[0.7rem] font-semibold text-[#0f2f4b]">
            <label title="Si está tildado, el impuesto no se incluye en 'resto a cargo'">
              ⚠️{' '}
              <input
                type="checkbox"
                className="mr-1 scale-110 align-middle"
                checked={!!taxOwn}
                onChange={(e) => onUpdateField('taxOwn', e.target.checked)}
              />{' '}
              Impuesto 44 inc. 1 siempre a cargo de <b>esta parte</b>
            </label>
          </div>
        </>
      )}

      {/* Campos de items */}
      {PRICING_FIELDS.map((field) => {
        const selectedIdx = fieldVersions[field.key] || 0;
        const qtyStr = fieldQtys[field.key] || '';
        const fieldItems = itemsByField(field.key);
        const fieldTotal = fieldItems.reduce(
          (sum, it) => sum + (it.unit || 0) * (it.quantity || 0),
          0
        );

        return (
          <div key={field.key} className="mt-3">
            <div className="linea-control flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="label text-xs font-semibold text-slate-700">
                {field.key}
              </div>
              <div className="controls flex flex-wrap items-center gap-1.5">
                <select
                  className="version border border-slate-300 rounded-md px-2 py-1 text-[0.7rem] bg-white"
                  value={selectedIdx}
                  onChange={(e) => onUpdateVersion(field.key, Number(e.target.value))}
                >
                  {field.items.map((it, idx) => (
                    <option key={idx} value={idx}>
                      {it.decree} {it.date}
                    </option>
                  ))}
                </select>
                <span className="unit-badge bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[0.7rem]">
                  {field.items[selectedIdx].unit}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="inc-qty w-16 border border-slate-300 rounded-md px-2 py-1 text-[0.7rem]"
                  value={qtyStr}
                  onChange={(e) => onUpdateQty(field.key, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-add bg-slate-100 hover:bg-slate-200 text-[#0f2f4b] rounded-md px-2 py-1 text-xs font-semibold transition"
                  onClick={() => handleAddItemClick(field.key)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="list-items max-h-32 overflow-auto border border-slate-100 rounded-md divide-y divide-slate-100 bg-slate-50/40">
              {fieldItems.map((it) => (
                <div
                  key={it.id}
                  className="list-item grid grid-cols-[2.5fr,0.8fr,1.2fr,1.4fr,auto] gap-1 items-center px-2 py-1 text-[0.7rem]"
                >
                  <span className="li-desc font-medium text-slate-700 truncate">
                    {it.decree} {it.date}
                  </span>
                  <span className="li-qty text-right">{it.quantity}</span>
                  <span className="li-unit text-right text-slate-500">
                    {fmtCurrency(it.unit)}
                  </span>
                  <span className="li-subtotal text-right font-semibold">
                    {fmtCurrency(it.unit * it.quantity)}
                  </span>
                  <button
                    type="button"
                    className="item-remove text-red-500 text-xs px-1"
                    onClick={() => onRemoveLineItem(it.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {fieldItems.length === 0 && (
                <div className="px-2 py-1 text-[0.7rem] text-slate-400">
                  Sin ítems cargados.
                </div>
              )}
            </div>

            {fieldTotal > 0 && (
              <div className="list-total mt-1 bg-sky-50 rounded px-3 py-1.5 text-[0.7rem] font-semibold text-[#0f2f4b]">
                Total Items:{' '}
                <span className="font-bold">{fmtCurrency(fieldTotal)}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Total parte */}
      <div className="total-part mt-3 bg-amber-50 border-l-4 border-amber-400 rounded px-3 py-2 text-[0.7rem] font-bold text-amber-900">
        Total Parte: {fmtCurrency(baseTotal || 0)}
      </div>

      {/* Responsabilidad */}
      <div className="input-group mt-3">
        <label className="block text-[0.7rem] font-semibold text-slate-600 mb-1">
          % Responsabilidad
        </label>
        <input
          type="number"
          className="resp-input w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-[0.7rem] focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
          min="0"
          max="100"
          step="5"
          value={responsibilityPct ?? 100}
          onChange={(e) => onUpdateField('responsibilityPct', e.target.value)}
        />
      </div>

      {/* Resto a cargo de */}
      <div className="input-group mt-2">
        <label className="block text-[0.7rem] font-semibold text-slate-600 mb-1">
          Resto a cargo de:
        </label>
        <select
          className="resto-target w-full border border-slate-300 rounded-lg px-2 py-1.5 text-[0.7rem] bg-white focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
          value={restoTarget || 'self'}
          onChange={(e) => onUpdateResto(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

function renderProcessSummary(process) {
  const { actorSummaries, demandadoSummaries, comboSummaries, totalProceso } = process;

  const rows = [];

  actorSummaries.forEach((r) => rows.push(r));
  if (actorSummaries.length > 0) {
    rows.push({
      label: 'Total ACTORES',
      value: actorSummaries.reduce((s, r) => s + r.value, 0),
    });
  }

  demandadoSummaries.forEach((r) => rows.push(r));
  if (demandadoSummaries.length > 0) {
    rows.push({
      label: 'Total DEMANDADOS',
      value: demandadoSummaries.reduce((s, r) => s + r.value, 0),
    });
  }

  comboSummaries.forEach((r) => rows.push(r));

  rows.push({
    label: 'Total Proceso',
    value: totalProceso || 0,
  });

  return (
    <>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <span>{r.label}:</span>
          <span className="font-semibold">{fmtCurrency(r.value)}</span>
        </div>
      ))}
    </>
  );
}
