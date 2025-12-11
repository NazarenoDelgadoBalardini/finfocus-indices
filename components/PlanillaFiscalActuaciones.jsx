// src/components/PlanillasFiscalesActuaciones.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

// =============== Helpers "puros" (idénticos a tu versión) ===============

function normalize(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function loosePattern(phrase) {
  function esc(x) {
    return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  let out = '';
  for (let i = 0; i < phrase.length; i++) {
    const ch = phrase[i];
    if (ch === ' ') out += '\\s+';
    else out += esc(ch) + '\\s*';
  }
  return new RegExp(out, 'i');
}

function parseDDMMYYYY(s) {
  const m = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  return new Date(y, mo, d);
}

function splitByDates(bigText) {
  const parts = bigText.split(/(?=\b\d{2}\/\d{2}\/\d{4}\b)/g);
  return parts
    .map((t, i) => ({ idx: i, text: t.trim(), date: parseDDMMYYYY(t) }))
    .filter((x) => x.text);
}

function inRange(d, from, to) {
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function makeTypeCatalog(userList) {
  const base = [
    { label: 'CÉDULAS',      patterns: ['CÉDULA', 'CEDULA', 'CED'] },
    { label: 'OFICIOS',      patterns: ['OFICIO'] },
    { label: 'MANDAMIENTOS', patterns: ['MANDAMIENTO', 'MANDAMIENTOS'] },
    { label: 'NOTAS',        patterns: ['NOTA', 'NOTAS'] },
    { label: 'DECRETOS',     patterns: ['DECRETO', 'DECRETOS'] },
    { label: 'VISTAS/PASES', patterns: ['VISTA', 'PASE'] },
    { label: 'RADICACIÓN',   patterns: ['RADICACIÓN', 'RADICACION'] },
    { label: 'INTIMACIONES', patterns: ['INTIMACIÓN', 'INTIMACION'] },
    { label: 'INFORMES',     patterns: ['INFORME'] },
    { label: 'OTRAS',        patterns: [] },
  ];
  base.forEach((cat) => {
    cat.regex = cat.patterns.map((p) => loosePattern(p));
  });

  const userRegex = userList.map((k) => loosePattern(k));
  return { cats: base, userRegex };
}

function classifyType(line, catalog) {
  for (let i = 0; i < catalog.cats.length; i++) {
    const cat = catalog.cats[i];
    for (let j = 0; j < (cat.regex || []).length; j++) {
      if (cat.regex[j].test(line)) return cat.label;
    }
  }
  for (let k = 0; k < catalog.userRegex.length; k++) {
    if (catalog.userRegex[k].test(line)) return 'OTRAS';
  }
  return null;
}

// Lectura de PDF usando pdf.js desde window (igual que tu versión HTML)
async function readPdf(file) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error(
      'pdfjsLib no está disponible. Asegurate de tener <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script> en index.html'
    );
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  pdfjsLib.disableWorker = true;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  let full = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    full += '\n' + content.items.map((it) => it.str).join(' ') + '\n';
  }
  return normalize(full);
}

// Formato CSV simple
function toCsv(rows) {
  return rows
    .map((r) =>
      r
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
}

// =============== Componente principal con ESTILO FINFOCUS ===============

export default function PlanillasFiscalesActuaciones() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [kwText, setKwText] = useState(
`CED
CÉDULA
CEDULA
OFICIO
MANDAMIENTO
MANDAMIENTOS
NOTA
NOTAS
DECRETO
DECRETOS
RESOLUCIÓN
RESOLUCION
AUTO
INFORME
AGREGUESE
AGREG
REMIT
ELEVESE
ELEVASE
PASE
VISTA
RADICACIÓN
RADICACION
CARGO
INTIMACIÓN
INTIMACION
SENT
SENTENCIA
DILIGENCIA
DILIGENCIAS`
  );

  const [porRegexText, setPorRegexText] = useState(
    'POR:\\s*([A-ZÁÉÍÓÚÑ ,.\'-]+?)\\s*-'
  );

  const [rows, setRows] = useState([]);   // [{idx,text,date}]
  const [blocks, setBlocks] = useState([]); // bloques sin filtrar
  const [showBlocks, setShowBlocks] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // =============== Procesar PDF ===============
  const handleProcessPdf = useCallback(async () => {
    if (!file) {
      alert('Subí un PDF primero.');
      return;
    }

    const kwList = (kwText || '')
      .trim()
      .split(/\n+/)
      .filter((x) => x);
    const kwDefault = [
      'CED',
      'CÉDULA',
      'CEDULA',
      'OFICIO',
      'MANDAMIENTO',
      'MANDAMIENTOS',
      'NOTA',
      'NOTAS',
      'DECRETO',
      'DECRETOS',
      'RESOLUCIÓN',
      'RESOLUCION',
      'AUTO',
      'INFORME',
      'AGREGUESE',
      'AGREG',
      'REMIT',
      'ELEVESE',
      'ELEVASE',
      'PASE',
      'VISTA',
      'RADICACIÓN',
      'RADICACION',
      'CARGO',
      'INTIMACIÓN',
      'INTIMACION',
      'SENT',
      'SENTENCIA',
      'DILIGENCIA',
      'DILIGENCIAS',
    ];
    const finalKw = kwList.length ? kwList : kwDefault;

    const porRegex =
      porRegexText && porRegexText.trim()
        ? new RegExp(porRegexText.trim(), 'i')
        : new RegExp('POR:\\s*([A-ZÁÉÍÓÚÑ ,\'.-]+?)\\s*-', 'i');

    const catalog = makeTypeCatalog(finalKw);

    setIsProcessing(true);
    try {
      const text = await readPdf(file);
      const newRows = splitByDates(text);
      setRows(newRows);

      const isEscrito = loosePattern('ESCRITOS INGRESADOS WEB');

      const events = [];
      for (const r of newRows) {
        if (isEscrito.test(r.text)) {
          let lawyer = null;
          const m = r.text.match(porRegex);
          if (m) lawyer = (m[1] || '').trim();

          if (!lawyer) {
            for (let back = 1; back <= 2; back++) {
              const prev = newRows[r.idx - back];
              if (!prev) break;
              const m2 = prev.text.match(porRegex);
              if (m2) {
                lawyer = (m2[1] || '').trim();
                break;
              }
            }
          }

          events.push({
            row_index: r.idx,
            lawyer: lawyer || '(sin identificar)',
          });
        }
      }

      const userRegexes = catalog.userRegex || [];

      const blockList = [];
      for (let i = 0; i < events.length; i++) {
        const lawyer = events[i].lawyer;
        const start = events[i].row_index;
        const end =
          i + 1 < events.length ? events[i + 1].row_index : newRows.length;
        let acts = 0;
        const actLines = [];

        for (let j = start + 1; j < end; j++) {
          const t = newRows[j].text;
          if (userRegexes.some((rx) => rx.test(t))) {
            acts++;
            actLines.push(t);
          }
        }

        blockList.push({
          lawyer,
          start,
          end,
          actuaciones: acts,
          lines: actLines,
        });
      }

      setBlocks(blockList);
    } catch (err) {
      console.error(err);
      alert('No se pudo procesar el PDF. Podemos ajustar las reglas si el formato difiere.');
    } finally {
      setIsProcessing(false);
    }
  }, [file, kwText, porRegexText]);

  // =============== Filtro de fechas y resumen (applyDateFilterAndRender) ===============
  const { summaryRows, byTypeRows, canExport } = useMemo(() => {
    if (!rows.length) {
      return { summaryRows: [], byTypeRows: [], canExport: false };
    }

    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    const filt = rows.filter((r) => inRange(r.date, from, to));
    if (!filt.length) {
      return { summaryRows: [], byTypeRows: [], canExport: false };
    }

    const isEscrito = loosePattern('ESCRITOS INGRESADOS WEB');
    const porRegex =
      porRegexText && porRegexText.trim()
        ? new RegExp(porRegexText.trim(), 'i')
        : new RegExp('POR:\\s*([A-ZÁÉÍÓÚÑ ,\'.-]+?)\\s*-', 'i');

    const kwList = (kwText || '')
      .trim()
      .split(/\n+/)
      .filter((x) => x);
    const kwDefault = [
      'CED',
      'CÉDULA',
      'CEDULA',
      'OFICIO',
      'MANDAMIENTO',
      'MANDAMIENTOS',
      'NOTA',
      'NOTAS',
      'DECRETO',
      'DECRETOS',
      'RESOLUCIÓN',
      'RESOLUCION',
      'AUTO',
      'INFORME',
      'AGREGUESE',
      'AGREG',
      'REMIT',
      'ELEVESE',
      'ELEVASE',
      'PASE',
      'VISTA',
      'RADICACIÓN',
      'RADICACION',
      'CARGO',
      'INTIMACIÓN',
      'INTIMACION',
      'SENT',
      'SENTENCIA',
      'DILIGENCIA',
      'DILIGENCIAS',
    ];
    const finalKw = kwList.length ? kwList : kwDefault;
    const catalog = makeTypeCatalog(finalKw);

    const events = [];
    for (const r of filt) {
      if (isEscrito.test(r.text)) {
        let lawyer = null;
        const m = r.text.match(porRegex);
        if (m) lawyer = (m[1] || '').trim();
        const pos = filt.indexOf(r);

        if (!lawyer) {
          for (let back2 = 1; back2 <= 2; back2++) {
            const prev2 = filt[pos - back2];
            if (!prev2) break;
            const m2 = prev2.text.match(porRegex);
            if (m2) {
              lawyer = (m2[1] || '').trim();
              break;
            }
          }
        }
        events.push({
          row_index: pos,
          lawyer: lawyer || '(sin identificar)',
        });
      }
    }

    const summary = new Map();
    const byType = new Map(); // Map(abogado -> Map(tipo->cant))

    for (let i = 0; i < events.length; i++) {
      const lawyer = events[i].lawyer;
      const start = events[i].row_index;
      const end =
        i + 1 < events.length ? events[i + 1].row_index : filt.length;
      let acts = 0;
      for (let j = start + 1; j < end; j++) {
        const t = filt[j].text;
        const label = classifyType(t, catalog);
        if (label) {
          acts++;
          if (!byType.has(lawyer)) byType.set(lawyer, new Map());
          const m = byType.get(lawyer);
          m.set(label, (m.get(label) || 0) + 1);
        }
      }
      const s = summary.get(lawyer) || { escritos: 0, acts: 0 };
      s.escritos += 1;
      s.acts += acts;
      summary.set(lawyer, s);
    }

    const summaryArr = Array.from(summary.entries())
      .map(([lawyer, vals]) => {
        const typeMap = byType.get(lawyer) || new Map();
        const detail = [];
        typeMap.forEach((v, k) => detail.push(`${k}: ${v}`));
        return {
          lawyer,
          escritos: vals.escritos,
          acts: vals.acts,
          detail: detail.join(' • '),
        };
      })
      .sort((a, b) => b.escritos - a.escritos || b.acts - a.acts);

    const byTypeArr = [];
    byType.forEach((map, law) => {
      map.forEach((v, k) => {
        byTypeArr.push({ lawyer: law, tipo: k, cant: v });
      });
    });
    byTypeArr.sort(
      (a, b) =>
        a.lawyer.localeCompare(b.lawyer) ||
        a.tipo.localeCompare(b.tipo)
    );

    return {
      summaryRows: summaryArr,
      byTypeRows: byTypeArr,
      canExport: summaryArr.length > 0,
    };
  }, [rows, dateFrom, dateTo, kwText, porRegexText]);

  // =============== Exportar CSV ===============
  const handleExportCsv = useCallback(() => {
    if (!canExport || !summaryRows.length) return;
    const rowsCsv = [
      [
        'Abogado',
        'Escritos ingresados web',
        'Actuaciones subsiguientes',
        'Detalle por tipo (inline)',
      ],
      ...summaryRows.map((r) => [
        r.lawyer,
        String(r.escritos),
        String(r.acts),
        r.detail,
      ]),
    ];
    const csv = toCsv(rowsCsv);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumen_escritos_actuaciones.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [canExport, summaryRows]);

  // =============== Presets de fecha ===============
  const handlePreset7 = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  const handlePreset30 = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  const handlePresetClear = () => {
    setDateFrom('');
    setDateTo('');
  };

  // =============== Atajos de teclado: R (run), E (export) ===============
  useEffect(() => {
    const handler = (e) => {
      const k = (e.key || '').toLowerCase();
      if (k === 'r') {
        e.preventDefault();
        handleProcessPdf();
      }
      if (k === 'e' && canExport) {
        e.preventDefault();
        handleExportCsv();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleProcessPdf, handleExportCsv, canExport]);

  // =============== Render con estilo FINFOCUS ===============
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* HERO */}
      <header className="px-4 pt-6 pb-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-r from-[#0f2f4b] to-[#163858] px-5 py-4 md:px-7 md:py-5 text-white shadow-sm">
            <h1 className="text-xl md:text-2xl font-semibold">
              Extractor de Escritos y Actuaciones
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-100/90">
              Cuenta
              <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-full text-[0.65rem] md:text-[0.7rem] font-semibold bg-white/10 border border-white/20">
                ESCRITOS INGRESADOS WEB
              </span>
              por abogado y las
              <span className="inline-flex items-center mx-1 px-2 py-0.5 rounded-full text-[0.65rem] md:text-[0.7rem] font-semibold bg-white/10 border border-white/20">
                actuaciones subsiguientes
              </span>
              (cédulas, oficios, mandamientos, notas, decretos, etc.) hasta el próximo escrito.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-8 md:px-6 space-y-6">
        {/* Carga y opciones */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="space-y-2 w-full md:w-auto">
              <label className="block text-xs md:text-sm text-slate-600">
                Archivo PDF
              </label>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full text-xs md:text-sm text-slate-700
                           file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                           file:text-xs md:file:text-sm file:font-semibold
                           file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-[0.65rem] md:text-xs text-slate-500">
                Formato: Reporte / Historia del expediente.
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleProcessPdf}
                disabled={isProcessing || !file}
                className="rounded-xl px-4 py-2 text-xs md:text-sm font-semibold
                           bg-[#0f2f4b] text-white shadow-sm
                           disabled:opacity-60 disabled:cursor-not-allowed
                           hover:bg-[#163858] transition-colors"
              >
                {isProcessing ? 'Procesando…' : 'Procesar PDF'}
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!canExport}
                className="rounded-xl px-4 py-2 text-xs md:text-sm font-semibold
                           border border-slate-300 bg-white text-slate-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-slate-50 transition-colors"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs md:text-sm text-slate-700">
              Opciones avanzadas
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs md:text-sm text-slate-600">
                  Palabras clave de actuaciones (una por línea)
                </label>
                <textarea
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm
                             font-mono w-full min-h-[9rem] focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                  value={kwText}
                  onChange={(e) => setKwText(e.target.value)}
                />
                <p className="text-[0.65rem] md:text-xs text-slate-500">
                  Contabiliza 1 si el renglón contiene alguna palabra.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs md:text-sm text-slate-600">
                  Pistas para identificar abogado (regex)
                </label>
                <textarea
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm
                             font-mono w-full min-h-[9rem] focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                  value={porRegexText}
                  onChange={(e) => setPorRegexText(e.target.value)}
                />
                <p className="text-[0.65rem] md:text-xs text-slate-500">
                  Se busca en el mismo renglón del escrito o en los 1–2 anteriores.
                </p>
              </div>
            </div>
          </details>
        </section>

        {/* Resumen */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base md:text-lg font-semibold text-[#0f2f4b]">
              Resumen por abogado
            </h2>
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs md:text-sm
                           focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                className="border border-slate-300 rounded-lg px-2 py-1 text-xs md:text-sm
                           focus:outline-none focus:ring-1 focus:ring-[#0f2f4b]"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[0.7rem] md:text-xs hover:bg-slate-50"
                onClick={handlePreset7}
              >
                7 días
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[0.7rem] md:text-xs hover:bg-slate-50"
                onClick={handlePreset30}
              >
                30 días
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[0.7rem] md:text-xs hover:bg-slate-50"
                onClick={handlePresetClear}
              >
                Todo
              </button>
            </div>
          </div>

          {/* Tabla resumen por abogado */}
          <div className="border border-slate-200 rounded-xl overflow-auto max-h-[360px]">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-[0.7rem] md:text-xs text-slate-600">
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">Abogado</th>
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">
                    Escritos ingresados web
                  </th>
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">
                    Actuaciones subsiguientes
                  </th>
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">
                    Detalle por tipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-3 text-slate-400 text-center text-xs"
                    >
                      No hay datos para el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  summaryRows.map((r) => (
                    <tr key={r.lawyer} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-800">
                        {r.lawyer}
                      </td>
                      <td className="p-3">{r.escritos}</td>
                      <td className="p-3">{r.acts}</td>
                      <td className="p-3 text-slate-600 text-[0.7rem] md:text-xs">
                        {r.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tabla detalle por tipo */}
          <div className="border border-slate-200 rounded-xl overflow-auto max-h-[360px]">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-[0.7rem] md:text-xs text-slate-600">
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">Abogado</th>
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">
                    Tipo de actuación
                  </th>
                  <th className="p-3 sticky top-0 bg-slate-50 z-10">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {byTypeRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-3 text-slate-400 text-center text-xs"
                    >
                      —
                    </td>
                  </tr>
                ) : (
                  byTypeRows.map((r, idx) => (
                    <tr
                      key={`${r.lawyer}-${r.tipo}-${idx}`}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">{r.lawyer}</td>
                      <td className="p-3">{r.tipo}</td>
                      <td className="p-3">{r.cant}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bloques detectados */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-[#0f2f4b]">
              Bloques detectados
            </h2>
            <button
              type="button"
              className="text-xs md:text-sm underline text-slate-600 hover:text-[#0f2f4b]"
              onClick={() => setShowBlocks((v) => !v)}
            >
              {showBlocks ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {showBlocks && (
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {blocks.length === 0 && (
                <p className="text-xs md:text-sm text-slate-400">
                  Aún no se detectaron bloques.
                </p>
              )}
              {blocks.map((b, i) => (
                <details
                  key={`${b.lawyer}-${b.start}-${i}`}
                  className="p-3 border border-slate-200 rounded-xl bg-slate-50/70"
                >
                  <summary className="cursor-pointer select-none">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-slate-800">
                        {b.lawyer} — bloque {b.start + 1}→{b.end}
                      </div>
                      <div className="text-[0.65rem] md:text-xs text-slate-500">
                        {b.actuaciones} actuación(es)
                      </div>
                    </div>
                  </summary>
                  <div className="mt-2 text-xs md:text-sm">
                    <div className="text-slate-600 mb-2">
                      Desde la fila {b.start + 1} (ESCRITO) hasta la fila {b.end - 1}
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      {b.lines && b.lines.length ? (
                        b.lines
                          .slice(0, Math.min(120, b.lines.length))
                          .map((l, idx2) => (
                            <li key={idx2}>{l.slice(0, 260)}</li>
                          ))
                      ) : (
                        <li>—</li>
                      )}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
